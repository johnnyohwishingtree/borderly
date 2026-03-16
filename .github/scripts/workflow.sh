#!/usr/bin/env bash
# workflow.sh — Temporal-like activity runner for the story pipeline.
#
# Provides three primitives that every workflow step wraps around:
#   activity_start  — idempotent guard + lock + state transition
#   activity_success — transition to next state + release lock + dispatch next
#   activity_fail   — increment attempts, retry or escalate
#
# Usage in a GitHub Actions workflow:
#
#   source .github/scripts/workflow.sh
#
#   # 1. Guard: only proceed if issue is in the right state
#   if ! activity_start "$ISSUE_NUM" "verify" "implementing" "fix-loop"; then
#     echo "Skipping — not in a valid state for this activity"
#     exit 0
#   fi
#
#   # 2. Do the actual work...
#   pnpm typecheck && pnpm test
#
#   # 3a. On success:
#   activity_success "$ISSUE_NUM" "verified"
#
#   # 3b. On failure:
#   activity_fail "$ISSUE_NUM" "verify" "typecheck failed: 3 errors" \
#     "verify-merge.yml" -f issue_number="$ISSUE_NUM" -f attempt="$NEXT"
#
# Environment:
#   GH_TOKEN            — GitHub token
#   GITHUB_REPOSITORY   — owner/repo
#   GITHUB_RUN_ID       — current run ID (for lock_id)
#
# Dependencies: state-machine.sh, lib.sh, jq, gh

# Guard
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "This script is meant to be sourced, not executed directly." >&2
  exit 1
fi

# Source dependencies (idempotent — won't re-source if already loaded)
_WORKFLOW_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! declare -f read_state >/dev/null 2>&1; then
  source "${_WORKFLOW_DIR}/state-machine.sh"
fi
if ! declare -f dispatch_workflow >/dev/null 2>&1; then
  source "${_WORKFLOW_DIR}/lib.sh"
fi

# ─── Activity-to-State Mapping ──────────────────────────────────────────────
#
# Each activity knows:
#   - Which states it can start from (guard)
#   - Default max attempts before escalation
#
# Activity Name     | Valid From States              | Default Max Attempts
# ──────────────────|────────────────────────────────|────────────────────
# implement         | planned, stuck, escalated      | 3
# verify            | implementing, fix-loop         | 6
# fix               | fix-loop                       | 6
# review            | verified                       | 3
# fix-review        | fix-reviews                    | 3
# merge             | approved                       | 3
# orchestrate       | merged                         | 1

# Default max attempts per activity
_DEFAULT_MAX_ATTEMPTS_implement=3
_DEFAULT_MAX_ATTEMPTS_verify=6
_DEFAULT_MAX_ATTEMPTS_fix=6
_DEFAULT_MAX_ATTEMPTS_review=3
_DEFAULT_MAX_ATTEMPTS_fix_review=3
_DEFAULT_MAX_ATTEMPTS_merge=3
_DEFAULT_MAX_ATTEMPTS_orchestrate=1

# ─── Core API ───────────────────────────────────────────────────────────────

# activity_start <issue_number> <activity_name> <valid_from_state> [<valid_from_state2> ...]
#
# Temporal equivalent: workflow.ExecuteActivity() preamble
#
# 1. Reads current state
# 2. Validates current state is in the allowed list (idempotent guard)
# 3. Acquires lock (prevents concurrent execution)
# 4. Returns 0 if OK to proceed, 1 if should skip
#
# Side effects:
#   Sets _ACTIVITY_NAME, _ACTIVITY_LOCK_ID, _ACTIVITY_ISSUE for use by
#   activity_success/activity_fail.
#
activity_start() {
  local issue_number="${1:?issue_number required}"
  local activity_name="${2:?activity_name required}"
  shift 2
  local valid_from_states=("$@")

  if [ ${#valid_from_states[@]} -eq 0 ]; then
    echo "ERROR: At least one valid_from_state is required" >&2
    return 1
  fi

  # Store for later use by success/fail
  _ACTIVITY_ISSUE="$issue_number"
  _ACTIVITY_NAME="$activity_name"
  _ACTIVITY_LOCK_ID="${activity_name}-${GITHUB_RUN_ID:-$$}"

  echo "=== Activity: ${activity_name} | Issue: #${issue_number} ===" >&2

  # 1. Read current state
  local current_state
  current_state=$(get_state "$issue_number")
  echo "Current state: ${current_state}" >&2

  # 2. Guard: check if current state is in the valid list
  local state_valid=false
  for valid in "${valid_from_states[@]}"; do
    if [ "$current_state" = "$valid" ]; then
      state_valid=true
      break
    fi
  done

  # Special case: "unknown" (no state yet) is allowed for "implement" activity
  if [ "$current_state" = "unknown" ] && [ "$activity_name" = "implement" ]; then
    state_valid=true
  fi

  if [ "$state_valid" = "false" ]; then
    echo "SKIP: Issue #${issue_number} is in '${current_state}', not valid for '${activity_name}' (expected: ${valid_from_states[*]})" >&2
    return 1
  fi

  # 3. Acquire lock (idempotent — same lock_id succeeds)
  if ! acquire_lock "$issue_number" "$_ACTIVITY_LOCK_ID"; then
    echo "SKIP: Another run holds the lock for issue #${issue_number}" >&2
    return 1
  fi

  echo "Lock acquired: ${_ACTIVITY_LOCK_ID}" >&2
  return 0
}

# activity_success <issue_number> <next_state> [key=value ...]
#
# Temporal equivalent: activity completes successfully, workflow advances
#
# 1. Transitions to next_state
# 2. Resets attempt counter for the completed activity
# 3. Releases lock
# 4. Logs to history
#
activity_success() {
  local issue_number="${1:?issue_number required}"
  local next_state="${2:?next_state required}"
  shift 2

  local activity_name="${_ACTIVITY_NAME:-unknown}"
  local lock_id="${_ACTIVITY_LOCK_ID:-}"

  echo "Activity '${activity_name}' succeeded → transitioning to '${next_state}'" >&2

  # Transition state (with optional key=value overrides)
  if ! transition "$issue_number" "$next_state" "$@"; then
    echo "ERROR: Failed to transition to '${next_state}'" >&2
    return 1
  fi

  # Release lock
  if [ -n "$lock_id" ]; then
    release_lock "$issue_number" "$lock_id" 2>/dev/null || true
  fi

  echo "=== Activity '${activity_name}' complete ===" >&2
  return 0
}

# activity_fail <issue_number> <activity_name> <error_context> [retry_workflow retry_args...]
#
# Temporal equivalent: activity fails, retry policy kicks in
#
# 1. Increments attempt counter for this activity
# 2. If under max attempts: dispatches retry workflow (automatic retry)
# 3. If at max attempts: transitions to escalated (gives up)
# 4. Records error context in state
# 5. Releases lock
#
# Args:
#   $1 — issue_number
#   $2 — activity_name (used for attempt tracking)
#   $3 — error_context (human-readable description of what failed)
#   $4 — retry_workflow (optional — workflow file to dispatch for retry)
#   $5+ — additional args passed to dispatch_workflow (e.g., -f key=value)
#
activity_fail() {
  local issue_number="${1:?issue_number required}"
  local activity_name="${2:?activity_name required}"
  local error_context="${3:-unknown error}"
  shift 3

  local retry_workflow="${1:-}"
  if [ -n "$retry_workflow" ]; then
    shift
  fi
  local retry_args=("$@")

  local lock_id="${_ACTIVITY_LOCK_ID:-}"

  echo "Activity '${activity_name}' failed: ${error_context}" >&2

  # Read current state to get attempt info
  local current_json
  current_json=$(read_state "$issue_number")

  # Get current attempt count for this activity
  local attempts
  attempts=$(echo "$current_json" | jq -r ".attempts.\"${activity_name}\" // 0" 2>/dev/null || echo "0")
  local next_attempt=$((attempts + 1))

  # Get max attempts (from state JSON or defaults)
  local max_var="_DEFAULT_MAX_ATTEMPTS_${activity_name//-/_}"
  local max_attempts="${!max_var:-6}"

  # Check state-level override
  local state_max
  state_max=$(echo "$current_json" | jq -r ".max_attempts // 0" 2>/dev/null || echo "0")
  if [ "$state_max" -gt 0 ]; then
    max_attempts="$state_max"
  fi

  echo "Attempt ${next_attempt}/${max_attempts} for '${activity_name}'" >&2

  # Update attempt counter and error context in state
  local updated_json
  updated_json=$(echo "$current_json" | jq \
    --arg activity "$activity_name" \
    --argjson attempt "$next_attempt" \
    --arg error "$error_context" \
    --arg now "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '
    .attempts = (.attempts // {}) |
    .attempts[$activity] = $attempt |
    .error_context = $error |
    .last_failure = $now
    ')
  write_state "$issue_number" "$updated_json"

  # Release lock before dispatching retry
  if [ -n "$lock_id" ]; then
    release_lock "$issue_number" "$lock_id" 2>/dev/null || true
  fi

  # Retry or escalate
  if [ "$next_attempt" -lt "$max_attempts" ]; then
    echo "RETRY: Will dispatch attempt $((next_attempt + 1))/${max_attempts}" >&2

    if [ -n "$retry_workflow" ]; then
      dispatch_workflow "$retry_workflow" "${retry_args[@]}" 2>/dev/null || true
      echo "Dispatched retry: ${retry_workflow}" >&2
    else
      echo "WARN: No retry workflow specified — manual retry needed" >&2
    fi
  else
    echo "EXHAUSTED: ${max_attempts} attempts used for '${activity_name}' — escalating" >&2

    # Transition to escalated
    transition "$issue_number" "escalated" \
      "error_context=${error_context}" 2>/dev/null || true
  fi

  return 1
}

# activity_get_attempt <issue_number> <activity_name>
#
# Returns the current attempt count for an activity.
# Useful for including in retry dispatch args.
#
activity_get_attempt() {
  local issue_number="${1:?issue_number required}"
  local activity_name="${2:?activity_name required}"

  local current_json
  current_json=$(read_state "$issue_number")

  if [ -z "$current_json" ]; then
    echo "0"
    return 0
  fi

  echo "$current_json" | jq -r ".attempts.\"${activity_name}\" // 0" 2>/dev/null || echo "0"
}

# activity_reset_attempts <issue_number> <activity_name>
#
# Resets the attempt counter for an activity (e.g., after a successful verify
# following fixes, reset the fix counter so the next failure gets fresh retries).
#
activity_reset_attempts() {
  local issue_number="${1:?issue_number required}"
  local activity_name="${2:?activity_name required}"

  local current_json
  current_json=$(read_state "$issue_number")

  if [ -z "$current_json" ]; then
    return 0
  fi

  local updated_json
  updated_json=$(echo "$current_json" | jq \
    --arg activity "$activity_name" \
    '.attempts[$activity] = 0')
  write_state "$issue_number" "$updated_json"
}
