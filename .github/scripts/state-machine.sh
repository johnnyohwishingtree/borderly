#!/usr/bin/env bash
# state-machine.sh — Manages story/issue workflow state via GitHub issue comments.
#
# Usage: source this file, then call functions:
#   source .github/scripts/state-machine.sh
#   read_state 42
#   transition 42 implementing
#   get_state 42
#   acquire_lock 42 "$(uuidgen)"
#   check_lock 42 "$MY_LOCK_ID"
#
# Environment variables required:
#   GH_TOKEN          — GitHub token with issues write access
#   GITHUB_REPOSITORY — owner/repo format
#
# Dependencies: jq, gh (GitHub CLI)

# Guard: allow sourcing without executing
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "This script is meant to be sourced, not executed directly." >&2
  echo "Usage: source ${BASH_SOURCE[0]}" >&2
  exit 1
fi

# ─── Constants ───────────────────────────────────────────────────────────────

STATE_MARKER="<!-- pipeline-state -->"

# Valid states (space-delimited string for subshell compatibility)
VALID_STATES="planned implementing verifying fix-loop verified reviewing fix-reviews approved merging merged escalated stuck"

# Valid transitions: "from:to" pairs (newline-delimited string)
# "any" as the from-state means any state can transition to the target.
VALID_TRANSITIONS="planned:implementing
implementing:verifying
implementing:escalated
verifying:fix-loop
verifying:verified
fix-loop:verifying
fix-loop:escalated
verified:reviewing
reviewing:approved
reviewing:fix-reviews
fix-reviews:reviewing
fix-reviews:escalated
approved:merging
merging:merged
merging:approved
merged:planned
escalated:implementing
stuck:implementing
any:stuck"

# ─── Helpers ─────────────────────────────────────────────────────────────────

_sm_validate_env() {
  if [[ -z "$GH_TOKEN" ]]; then
    echo "ERROR: GH_TOKEN is not set" >&2
    return 1
  fi
  if [[ -z "$GITHUB_REPOSITORY" ]]; then
    echo "ERROR: GITHUB_REPOSITORY is not set" >&2
    return 1
  fi
  return 0
}

_sm_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

_sm_is_valid_state() {
  local state="$1"
  echo " $VALID_STATES " | grep -q " $state " && return 0
  return 1
}

_sm_is_valid_transition() {
  local from="$1"
  local to="$2"

  # Check exact match
  echo "$VALID_TRANSITIONS" | grep -q "^${from}:${to}$" && return 0
  # Check wildcard "any" source
  echo "$VALID_TRANSITIONS" | grep -q "^any:${to}$" && return 0
  return 1
}

# Find the state comment on an issue. Returns the comment ID or empty string.
_sm_find_comment_id() {
  local issue_number="$1"
  _sm_validate_env || return 1

  # Fetch all comments and find the one with our marker.
  # We search from newest to oldest to get the latest state comment.
  local comment_id
  comment_id=$(GH_TOKEN="$GH_TOKEN" gh api \
    "repos/${GITHUB_REPOSITORY}/issues/${issue_number}/comments" \
    --paginate \
    --jq "[.[] | select(.body | contains(\"${STATE_MARKER}\"))] | last | .id // empty" \
    2>/dev/null)

  echo "$comment_id"
}

# ─── Public API ──────────────────────────────────────────────────────────────

# read_state <issue_number>
# Reads the current pipeline state JSON from the issue's state comment.
# Outputs the JSON to stdout. Returns empty string if no state comment exists.
read_state() {
  local issue_number="$1"
  if [[ -z "$issue_number" ]]; then
    echo "Usage: read_state <issue_number>" >&2
    return 1
  fi
  _sm_validate_env || return 1

  local comment_id
  comment_id=$(_sm_find_comment_id "$issue_number")

  if [[ -z "$comment_id" ]]; then
    echo ""
    return 0
  fi

  # Fetch the comment body and extract JSON from the code block
  local body
  body=$(GH_TOKEN="$GH_TOKEN" gh api \
    "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" \
    --jq '.body' 2>/dev/null)

  if [[ -z "$body" ]]; then
    echo ""
    return 0
  fi

  # Extract JSON from between ```json and ``` markers
  local json
  json=$(echo "$body" | sed -n '/^```json$/,/^```$/p' | sed '1d;$d')

  if [[ -z "$json" ]]; then
    echo ""
    return 0
  fi

  # Validate it's actual JSON
  if ! echo "$json" | jq . >/dev/null 2>&1; then
    echo "WARNING: State comment contains invalid JSON" >&2
    echo ""
    return 0
  fi

  echo "$json"
}

# write_state <issue_number> <state_json>
# Writes or updates the pipeline state comment on the issue.
# If a state comment exists, edits it. Otherwise, creates a new one.
write_state() {
  local issue_number="$1"
  local state_json="$2"

  if [[ -z "$issue_number" || -z "$state_json" ]]; then
    echo "Usage: write_state <issue_number> <state_json>" >&2
    return 1
  fi
  _sm_validate_env || return 1

  # Validate JSON
  if ! echo "$state_json" | jq . >/dev/null 2>&1; then
    echo "ERROR: Invalid JSON provided" >&2
    return 1
  fi

  # Extract the state field for the summary line
  local current_state
  current_state=$(echo "$state_json" | jq -r '.state // "unknown"')

  # Format the JSON for display
  local formatted_json
  formatted_json=$(echo "$state_json" | jq '.')

  # Build the comment body
  local comment_body
  comment_body="${STATE_MARKER}
<details><summary>Pipeline: ${current_state}</summary>

\`\`\`json
${formatted_json}
\`\`\`
</details>"

  local comment_id
  comment_id=$(_sm_find_comment_id "$issue_number")

  if [[ -n "$comment_id" ]]; then
    # Update existing comment
    GH_TOKEN="$GH_TOKEN" gh api \
      "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" \
      --method PATCH \
      -f body="$comment_body" \
      --silent 2>/dev/null
  else
    # Create new comment
    GH_TOKEN="$GH_TOKEN" gh api \
      "repos/${GITHUB_REPOSITORY}/issues/${issue_number}/comments" \
      --method POST \
      -f body="$comment_body" \
      --silent 2>/dev/null
  fi
}

# transition <issue_number> <new_state> [key=value ...]
# Validates and executes a state transition. Appends to history.
# Optional key=value pairs update top-level fields in the state JSON.
# Returns 0 on success, 1 on invalid transition.
transition() {
  local issue_number="$1"
  local new_state="$2"
  shift 2

  if [[ -z "$issue_number" || -z "$new_state" ]]; then
    echo "Usage: transition <issue_number> <new_state> [key=value ...]" >&2
    return 1
  fi
  _sm_validate_env || return 1

  # Validate new state
  if ! _sm_is_valid_state "$new_state"; then
    echo "ERROR: Invalid state '${new_state}'. Valid states: ${VALID_STATES[*]}" >&2
    return 1
  fi

  local now
  now=$(_sm_now)

  # Read current state
  local current_json
  current_json=$(read_state "$issue_number")

  local current_state="unknown"
  if [[ -n "$current_json" ]]; then
    current_state=$(echo "$current_json" | jq -r '.state // "unknown"')
  fi

  # If there's no existing state, allow transition from "unknown" only to "planned"
  # or treat it as a fresh start
  if [[ "$current_state" == "unknown" && "$new_state" != "planned" ]]; then
    # For a brand new issue with no state, allow "planned" or "implementing"
    # (orchestrate may go straight to implementing)
    if [[ "$new_state" != "implementing" ]]; then
      # Validate normally — the transition must be in the allowed list
      if ! _sm_is_valid_transition "$current_state" "$new_state"; then
        echo "ERROR: Invalid transition from '${current_state}' to '${new_state}'" >&2
        return 1
      fi
    fi
  elif [[ "$current_state" != "unknown" ]]; then
    # Validate the transition
    if ! _sm_is_valid_transition "$current_state" "$new_state"; then
      echo "ERROR: Invalid transition from '${current_state}' to '${new_state}'" >&2
      return 1
    fi
  fi

  # Build the new state JSON
  local new_json
  if [[ -n "$current_json" ]]; then
    # Update existing state: change state, update last_transition, append to history
    new_json=$(echo "$current_json" | jq \
      --arg state "$new_state" \
      --arg now "$now" \
      '
      .state = $state |
      .last_transition = $now |
      .history = (.history // []) + [{"state": $state, "at": $now}]
      ')
  else
    # Create fresh state
    new_json=$(jq -n \
      --arg state "$new_state" \
      --arg now "$now" \
      '{
        state: $state,
        attempt: 0,
        max_attempts: 6,
        branches: {
          pr: null,
          tmp: null,
          internal: null
        },
        pr_number: null,
        last_transition: $now,
        history: [{"state": $state, "at": $now}],
        lock_id: null,
        error_context: null
      }')
  fi

  # Apply optional key=value overrides
  for kv in "$@"; do
    local key="${kv%%=*}"
    local value="${kv#*=}"

    # Determine if value is a number, null, boolean, or string
    if [[ "$value" =~ ^[0-9]+$ ]]; then
      new_json=$(echo "$new_json" | jq --arg k "$key" --argjson v "$value" '.[$k] = $v')
    elif [[ "$value" == "null" ]]; then
      new_json=$(echo "$new_json" | jq --arg k "$key" '.[$k] = null')
    elif [[ "$value" == "true" || "$value" == "false" ]]; then
      new_json=$(echo "$new_json" | jq --arg k "$key" --argjson v "$value" '.[$k] = $v')
    elif echo "$value" | jq . >/dev/null 2>&1 && [[ "$value" == "{"* || "$value" == "["* ]]; then
      # JSON object or array
      new_json=$(echo "$new_json" | jq --arg k "$key" --argjson v "$value" '.[$k] = $v')
    else
      new_json=$(echo "$new_json" | jq --arg k "$key" --arg v "$value" '.[$k] = $v')
    fi
  done

  # Write the updated state
  write_state "$issue_number" "$new_json"
  return 0
}

# get_state <issue_number>
# Returns just the current state string (e.g., "verifying") or "unknown".
get_state() {
  local issue_number="$1"
  if [[ -z "$issue_number" ]]; then
    echo "Usage: get_state <issue_number>" >&2
    return 1
  fi

  local json
  json=$(read_state "$issue_number")

  if [[ -z "$json" ]]; then
    echo "unknown"
    return 0
  fi

  local state
  state=$(echo "$json" | jq -r '.state // "unknown"')
  echo "$state"
}

# acquire_lock <issue_number> <lock_id>
# Idempotent lock acquisition. Writes lock_id to state.
# Returns 0 if lock acquired (or already held by same id).
# Returns 1 if lock held by a different id.
acquire_lock() {
  local issue_number="$1"
  local lock_id="$2"

  if [[ -z "$issue_number" || -z "$lock_id" ]]; then
    echo "Usage: acquire_lock <issue_number> <lock_id>" >&2
    return 1
  fi
  _sm_validate_env || return 1

  local current_json
  current_json=$(read_state "$issue_number")

  if [[ -z "$current_json" ]]; then
    echo "ERROR: No state exists for issue #${issue_number}. Initialize state first." >&2
    return 1
  fi

  local current_lock
  current_lock=$(echo "$current_json" | jq -r '.lock_id // "null"')

  # Idempotent: if we already hold the lock, succeed
  if [[ "$current_lock" == "$lock_id" ]]; then
    return 0
  fi

  # If lock is held by someone else, fail
  if [[ "$current_lock" != "null" && -n "$current_lock" ]]; then
    echo "ERROR: Lock held by '${current_lock}', cannot acquire for '${lock_id}'" >&2
    return 1
  fi

  # Acquire the lock
  local updated_json
  updated_json=$(echo "$current_json" | jq --arg lid "$lock_id" '.lock_id = $lid')
  write_state "$issue_number" "$updated_json"
  return 0
}

# check_lock <issue_number> <expected_lock_id>
# Verifies lock ownership.
# Returns 0 if lock matches, 1 if not.
check_lock() {
  local issue_number="$1"
  local expected_lock_id="$2"

  if [[ -z "$issue_number" || -z "$expected_lock_id" ]]; then
    echo "Usage: check_lock <issue_number> <expected_lock_id>" >&2
    return 1
  fi
  _sm_validate_env || return 1

  local current_json
  current_json=$(read_state "$issue_number")

  if [[ -z "$current_json" ]]; then
    return 1
  fi

  local current_lock
  current_lock=$(echo "$current_json" | jq -r '.lock_id // "null"')

  if [[ "$current_lock" == "$expected_lock_id" ]]; then
    return 0
  fi

  return 1
}

# release_lock <issue_number> <lock_id>
# Releases a lock if held by the given id.
# Returns 0 on success, 1 if lock not held by this id.
release_lock() {
  local issue_number="$1"
  local lock_id="$2"

  if [[ -z "$issue_number" || -z "$lock_id" ]]; then
    echo "Usage: release_lock <issue_number> <lock_id>" >&2
    return 1
  fi
  _sm_validate_env || return 1

  if ! check_lock "$issue_number" "$lock_id"; then
    echo "ERROR: Lock not held by '${lock_id}', cannot release" >&2
    return 1
  fi

  local current_json
  current_json=$(read_state "$issue_number")
  local updated_json
  updated_json=$(echo "$current_json" | jq '.lock_id = null')
  write_state "$issue_number" "$updated_json"
  return 0
}
