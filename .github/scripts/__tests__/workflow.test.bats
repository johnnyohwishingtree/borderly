#!/usr/bin/env bats
# Tests for .github/scripts/workflow.sh — Temporal-like activity runner

SCRIPTS_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"

load 'test-helper'

# ── Mock state storage ──────────────────────────────────────────────────────
# Instead of hitting the GH API, we keep state in a local variable/file.
# Override state-machine.sh and lib.sh functions after sourcing workflow.sh.

setup() {
  setup_mocks

  # In-memory state store (file-backed for subshell safety)
  STATE_FILE="$MOCK_DIR/state.json"
  echo "" > "$STATE_FILE"

  DISPATCH_LOG="$MOCK_DIR/dispatch.log"
  echo "" > "$DISPATCH_LOG"

  LOCK_FILE="$MOCK_DIR/lock"
  echo "" > "$LOCK_FILE"

  export GITHUB_RUN_ID="12345"

  # Source workflow.sh (which sources state-machine.sh and lib.sh)
  # We need gh mock so the state-machine sourcing doesn't fail
  mock_gh_response "." ""
  set --
  source "$SCRIPTS_DIR/workflow.sh"
  set +u

  # Override state-machine functions with local mocks
  get_state() {
    local json
    json=$(cat "$STATE_FILE" 2>/dev/null)
    if [ -z "$json" ]; then
      echo "unknown"
    else
      echo "$json" | jq -r '.state // "unknown"' 2>/dev/null || echo "unknown"
    fi
  }

  read_state() {
    cat "$STATE_FILE" 2>/dev/null
  }

  write_state() {
    local _issue="$1"
    local _json="$2"
    echo "$_json" > "$STATE_FILE"
  }

  transition() {
    local _issue="$1"
    local _new_state="$2"
    shift 2
    local current_json
    current_json=$(cat "$STATE_FILE" 2>/dev/null)
    if [ -z "$current_json" ]; then
      current_json='{"state":"unknown"}'
    fi
    local new_json
    new_json=$(echo "$current_json" | jq --arg s "$_new_state" '.state = $s')
    # Apply key=value overrides
    for kv in "$@"; do
      local key="${kv%%=*}"
      local value="${kv#*=}"
      new_json=$(echo "$new_json" | jq --arg k "$key" --arg v "$value" '.[$k] = $v')
    done
    echo "$new_json" > "$STATE_FILE"
  }

  acquire_lock() {
    local _issue="$1"
    local _lock_id="$2"
    local current_lock
    current_lock=$(cat "$LOCK_FILE" 2>/dev/null | tr -d '[:space:]')
    if [ -z "$current_lock" ] || [ "$current_lock" = "$_lock_id" ]; then
      echo "$_lock_id" > "$LOCK_FILE"
      return 0
    fi
    return 1
  }

  release_lock() {
    local _issue="$1"
    local _lock_id="$2"
    local current_lock
    current_lock=$(cat "$LOCK_FILE" 2>/dev/null | tr -d '[:space:]')
    if [ "$current_lock" = "$_lock_id" ]; then
      echo "" > "$LOCK_FILE"
      return 0
    fi
    return 1
  }

  dispatch_workflow() {
    echo "$*" >> "$DISPATCH_LOG"
  }

  # Helper: set the mock state
  set_state() {
    local state="$1"
    shift
    local json
    json=$(jq -n --arg s "$state" '{state: $s, attempts: {}, lock_id: null}')
    for kv in "$@"; do
      local key="${kv%%=*}"
      local value="${kv#*=}"
      json=$(echo "$json" | jq --arg k "$key" --arg v "$value" '.[$k] = $v')
    done
    echo "$json" > "$STATE_FILE"
  }

  # Helper: set state with JSON merge
  set_state_json() {
    echo "$1" > "$STATE_FILE"
  }
}

teardown() {
  teardown_mocks
}

# ═══════════════════════════════════════════════════════════════════════════
# activity_start
# ═══════════════════════════════════════════════════════════════════════════

@test "activity_start succeeds when state matches a valid_from_state" {
  set_state "implementing"
  run activity_start 42 "verify" "implementing" "fix-loop"
  [ "$status" -eq 0 ]
}

@test "activity_start succeeds with second valid_from_state" {
  set_state "fix-loop"
  run activity_start 42 "verify" "implementing" "fix-loop"
  [ "$status" -eq 0 ]
}

@test "activity_start fails when state doesn't match any valid_from_state" {
  set_state "verified"
  run activity_start 42 "verify" "implementing" "fix-loop"
  [ "$status" -eq 1 ]
  assert_contains "$output" "SKIP"
  assert_contains "$output" "not valid for"
}

@test "activity_start allows 'unknown' state for 'implement' activity" {
  echo "" > "$STATE_FILE"  # empty = unknown
  # acquire_lock needs state to exist — but activity_start for implement with unknown is special
  # The lock will fail since no state exists; let's mock acquire_lock to always succeed for this test
  acquire_lock() { return 0; }
  run activity_start 42 "implement" "planned" "stuck" "escalated"
  [ "$status" -eq 0 ]
}

@test "activity_start rejects 'unknown' state for non-implement activities" {
  echo "" > "$STATE_FILE"
  run activity_start 42 "verify" "implementing" "fix-loop"
  [ "$status" -eq 1 ]
  assert_contains "$output" "SKIP"
}

@test "activity_start fails when lock is held by another run" {
  set_state "implementing"
  echo "other-lock-99999" > "$LOCK_FILE"
  run activity_start 42 "verify" "implementing"
  [ "$status" -eq 1 ]
  assert_contains "$output" "lock"
}

@test "activity_start is idempotent — same lock_id succeeds" {
  set_state "implementing"
  echo "verify-12345" > "$LOCK_FILE"
  run activity_start 42 "verify" "implementing"
  [ "$status" -eq 0 ]
}

@test "activity_start requires at least one valid_from_state" {
  run activity_start 42 "verify"
  [ "$status" -eq 1 ]
  assert_contains "$output" "At least one"
}

@test "activity_start sets _ACTIVITY_NAME and _ACTIVITY_LOCK_ID" {
  set_state "planned"
  activity_start 42 "implement" "planned"
  [ "$_ACTIVITY_NAME" = "implement" ]
  [ "$_ACTIVITY_LOCK_ID" = "implement-12345" ]
  [ "$_ACTIVITY_ISSUE" = "42" ]
}

# ═══════════════════════════════════════════════════════════════════════════
# activity_success
# ═══════════════════════════════════════════════════════════════════════════

@test "activity_success transitions to next state" {
  set_state "implementing"
  _ACTIVITY_NAME="verify"
  _ACTIVITY_LOCK_ID="verify-12345"
  echo "verify-12345" > "$LOCK_FILE"

  run activity_success 42 "verified"
  [ "$status" -eq 0 ]

  local result_state
  result_state=$(cat "$STATE_FILE" | jq -r '.state')
  [ "$result_state" = "verified" ]
}

@test "activity_success releases the lock" {
  set_state "implementing"
  _ACTIVITY_NAME="verify"
  _ACTIVITY_LOCK_ID="verify-12345"
  echo "verify-12345" > "$LOCK_FILE"

  activity_success 42 "verified"

  local lock_val
  lock_val=$(cat "$LOCK_FILE" | tr -d '[:space:]')
  [ -z "$lock_val" ]
}

@test "activity_success passes key=value overrides to transition" {
  set_state "implementing"
  _ACTIVITY_NAME="verify"
  _ACTIVITY_LOCK_ID=""

  run activity_success 42 "verified" "pr_number=99"
  [ "$status" -eq 0 ]

  local pr
  pr=$(cat "$STATE_FILE" | jq -r '.pr_number')
  [ "$pr" = "99" ]
}

@test "activity_success returns 1 when transition fails" {
  set_state "implementing"
  _ACTIVITY_NAME="verify"
  _ACTIVITY_LOCK_ID=""

  # Override transition to fail
  transition() { return 1; }

  run activity_success 42 "verified"
  [ "$status" -eq 1 ]
}

# ═══════════════════════════════════════════════════════════════════════════
# activity_fail — retry path
# ═══════════════════════════════════════════════════════════════════════════

@test "activity_fail increments attempt counter" {
  set_state_json '{"state":"verifying","attempts":{"verify":0}}'
  _ACTIVITY_LOCK_ID=""

  activity_fail 42 "verify" "tests failed" "verify-and-fix.yml" || true

  local attempts
  attempts=$(cat "$STATE_FILE" | jq '.attempts.verify')
  [ "$attempts" -eq 1 ]
}

@test "activity_fail dispatches retry when under max attempts" {
  set_state_json '{"state":"verifying","attempts":{"verify":0}}'
  _ACTIVITY_LOCK_ID=""

  activity_fail 42 "verify" "tests failed" "verify-and-fix.yml" -f issue_number=42 || true

  local dispatched
  dispatched=$(cat "$DISPATCH_LOG")
  assert_contains "$dispatched" "verify-and-fix.yml"
  assert_contains "$dispatched" "issue_number=42"
}

@test "activity_fail does NOT dispatch when no retry_workflow given" {
  set_state_json '{"state":"verifying","attempts":{"verify":0}}'
  _ACTIVITY_LOCK_ID=""

  activity_fail 42 "verify" "tests failed" || true

  # dispatch log should only contain the initial empty line (no workflow dispatched)
  local has_workflow
  has_workflow=$(grep -c "\.yml" "$DISPATCH_LOG" 2>/dev/null || true)
  [ "${has_workflow:-0}" -eq 0 ]
}

@test "activity_fail records error_context in state" {
  set_state_json '{"state":"verifying","attempts":{"verify":0}}'
  _ACTIVITY_LOCK_ID=""

  activity_fail 42 "verify" "typecheck: 3 errors" || true

  local error
  error=$(cat "$STATE_FILE" | jq -r '.error_context')
  [ "$error" = "typecheck: 3 errors" ]
}

@test "activity_fail records last_failure timestamp" {
  set_state_json '{"state":"verifying","attempts":{"verify":0}}'
  _ACTIVITY_LOCK_ID=""

  activity_fail 42 "verify" "test failed" || true

  local ts
  ts=$(cat "$STATE_FILE" | jq -r '.last_failure')
  # Should be a non-null ISO timestamp
  [ "$ts" != "null" ]
  assert_contains "$ts" "T"
}

@test "activity_fail releases the lock" {
  set_state_json '{"state":"verifying","attempts":{"verify":0}}'
  _ACTIVITY_LOCK_ID="verify-12345"
  echo "verify-12345" > "$LOCK_FILE"

  activity_fail 42 "verify" "test failed" || true

  local lock_val
  lock_val=$(cat "$LOCK_FILE" | tr -d '[:space:]')
  [ -z "$lock_val" ]
}

# ═══════════════════════════════════════════════════════════════════════════
# activity_fail — escalation path
# ═══════════════════════════════════════════════════════════════════════════

@test "activity_fail escalates when max attempts reached (verify: 6)" {
  # verify default max is 6, so attempt 5 → next_attempt 6 → 6 < 6 is false → escalate
  set_state_json '{"state":"verifying","attempts":{"verify":5}}'
  _ACTIVITY_LOCK_ID=""

  activity_fail 42 "verify" "still failing" "verify-and-fix.yml" || true

  local state
  state=$(cat "$STATE_FILE" | jq -r '.state')
  [ "$state" = "escalated" ]
}

@test "activity_fail retries at attempt 4 of 6 (verify)" {
  set_state_json '{"state":"verifying","attempts":{"verify":4}}'
  _ACTIVITY_LOCK_ID=""

  activity_fail 42 "verify" "still failing" "verify-and-fix.yml" || true

  # Should have dispatched a retry, not escalated
  local dispatched
  dispatched=$(cat "$DISPATCH_LOG")
  assert_contains "$dispatched" "verify-and-fix.yml"

  # State should NOT be escalated
  local state
  state=$(cat "$STATE_FILE" | jq -r '.state')
  [ "$state" != "escalated" ]
}

@test "activity_fail escalates when max attempts reached (implement: 3)" {
  set_state_json '{"state":"implementing","attempts":{"implement":2}}'
  _ACTIVITY_LOCK_ID=""

  activity_fail 42 "implement" "claude failed" "claude.yml" || true

  local state
  state=$(cat "$STATE_FILE" | jq -r '.state')
  [ "$state" = "escalated" ]
}

@test "activity_fail uses state-level max_attempts override" {
  # State says max_attempts=2, so attempt 1 → next=2 → 2 < 2 is false → escalate
  set_state_json '{"state":"verifying","attempts":{"verify":1},"max_attempts":2}'
  _ACTIVITY_LOCK_ID=""

  activity_fail 42 "verify" "still failing" "verify-and-fix.yml" || true

  local state
  state=$(cat "$STATE_FILE" | jq -r '.state')
  [ "$state" = "escalated" ]
}

@test "activity_fail always returns 1" {
  set_state_json '{"state":"verifying","attempts":{"verify":0}}'
  _ACTIVITY_LOCK_ID=""

  run activity_fail 42 "verify" "test failed"
  [ "$status" -eq 1 ]
}

# ═══════════════════════════════════════════════════════════════════════════
# activity_get_attempt
# ═══════════════════════════════════════════════════════════════════════════

@test "activity_get_attempt returns 0 for new activity" {
  set_state_json '{"state":"implementing","attempts":{}}'

  run activity_get_attempt 42 "verify"
  [ "$output" = "0" ]
}

@test "activity_get_attempt returns stored count" {
  set_state_json '{"state":"verifying","attempts":{"verify":3}}'

  run activity_get_attempt 42 "verify"
  [ "$output" = "3" ]
}

@test "activity_get_attempt returns 0 when no state exists" {
  echo "" > "$STATE_FILE"

  run activity_get_attempt 42 "verify"
  [ "$output" = "0" ]
}

# ═══════════════════════════════════════════════════════════════════════════
# activity_reset_attempts
# ═══════════════════════════════════════════════════════════════════════════

@test "activity_reset_attempts sets counter to 0" {
  set_state_json '{"state":"verified","attempts":{"verify":4,"fix":2}}'

  activity_reset_attempts 42 "verify"

  local verify_count
  verify_count=$(cat "$STATE_FILE" | jq '.attempts.verify')
  [ "$verify_count" -eq 0 ]

  # Other counters should be unchanged
  local fix_count
  fix_count=$(cat "$STATE_FILE" | jq '.attempts.fix')
  [ "$fix_count" -eq 2 ]
}

@test "activity_reset_attempts is a no-op when no state exists" {
  echo "" > "$STATE_FILE"
  run activity_reset_attempts 42 "verify"
  [ "$status" -eq 0 ]
}

# ═══════════════════════════════════════════════════════════════════════════
# Default max attempts per activity
# ═══════════════════════════════════════════════════════════════════════════

@test "default max attempts: implement=3" {
  [ "$_DEFAULT_MAX_ATTEMPTS_implement" -eq 3 ]
}

@test "default max attempts: verify=6" {
  [ "$_DEFAULT_MAX_ATTEMPTS_verify" -eq 6 ]
}

@test "default max attempts: fix=6" {
  [ "$_DEFAULT_MAX_ATTEMPTS_fix" -eq 6 ]
}

@test "default max attempts: review=3" {
  [ "$_DEFAULT_MAX_ATTEMPTS_review" -eq 3 ]
}

@test "default max attempts: merge=3" {
  [ "$_DEFAULT_MAX_ATTEMPTS_merge" -eq 3 ]
}

@test "default max attempts: orchestrate=1" {
  [ "$_DEFAULT_MAX_ATTEMPTS_orchestrate" -eq 1 ]
}

# ═══════════════════════════════════════════════════════════════════════════
# Integration: activity_start → success/fail → state progression
# ═══════════════════════════════════════════════════════════════════════════

@test "full lifecycle: start → success advances state" {
  set_state "implementing"

  activity_start 42 "verify" "implementing" "fix-loop"
  activity_success 42 "verified"

  local final_state
  final_state=$(cat "$STATE_FILE" | jq -r '.state')
  [ "$final_state" = "verified" ]
}

@test "full lifecycle: start → fail → retry dispatches workflow" {
  set_state_json '{"state":"implementing","attempts":{"verify":0}}'

  activity_start 42 "verify" "implementing"
  activity_fail 42 "verify" "tests failed" "verify-and-fix.yml" -f issue_number=42 || true

  local dispatched
  dispatched=$(cat "$DISPATCH_LOG")
  assert_contains "$dispatched" "verify-and-fix.yml"
}

@test "full lifecycle: repeated fails escalate after max" {
  set_state_json '{"state":"implementing","attempts":{"implement":0}}'
  _ACTIVITY_LOCK_ID=""

  # Simulate 3 failures (implement max = 3)
  for i in 1 2 3; do
    activity_fail 42 "implement" "attempt $i failed" "claude.yml" || true
  done

  local final_state
  final_state=$(cat "$STATE_FILE" | jq -r '.state')
  [ "$final_state" = "escalated" ]

  local final_attempts
  final_attempts=$(cat "$STATE_FILE" | jq '.attempts.implement')
  [ "$final_attempts" -eq 3 ]
}

@test "fix-loop cycle: verify fails → fix → verify succeeds" {
  # Start in implementing, verify fails
  set_state_json '{"state":"fix-loop","attempts":{"verify":1,"fix":0}}'

  # Fix activity starts
  activity_start 42 "fix" "fix-loop"
  activity_success 42 "verifying"

  # Reset verify attempts after a fix
  activity_reset_attempts 42 "verify"

  # Verify again
  set_state_json "$(cat "$STATE_FILE" | jq '.state = "implementing"')"
  activity_start 42 "verify" "implementing" "fix-loop"
  activity_success 42 "verified"

  local final_state
  final_state=$(cat "$STATE_FILE" | jq -r '.state')
  [ "$final_state" = "verified" ]

  # Verify attempts should be 0 (we reset them)
  local verify_attempts
  verify_attempts=$(cat "$STATE_FILE" | jq '.attempts.verify // 0')
  [ "$verify_attempts" -eq 0 ]
}

# ═══════════════════════════════════════════════════════════════════════════
# Edge cases
# ═══════════════════════════════════════════════════════════════════════════

@test "activity_fail with hyphenated activity name uses correct default" {
  # fix-review → _DEFAULT_MAX_ATTEMPTS_fix_review = 3
  set_state_json '{"state":"fix-reviews","attempts":{"fix-review":2}}'
  _ACTIVITY_LOCK_ID=""

  activity_fail 42 "fix-review" "review fix failed" || true

  local state
  state=$(cat "$STATE_FILE" | jq -r '.state')
  [ "$state" = "escalated" ]
}

@test "activity_fail falls back to 6 for unknown activity names" {
  set_state_json '{"state":"implementing","attempts":{"custom-thing":4}}'
  _ACTIVITY_LOCK_ID=""

  activity_fail 42 "custom-thing" "failed" "retry.yml" || true

  # 4+1=5, 5 < 6 → should retry, not escalate
  local state
  state=$(cat "$STATE_FILE" | jq -r '.state')
  [ "$state" != "escalated" ]
}

@test "activity_start with empty state file returns 'unknown'" {
  echo "" > "$STATE_FILE"
  run activity_start 42 "verify" "implementing"
  [ "$status" -eq 1 ]
  assert_contains "$output" "SKIP"
}

@test "concurrent lock prevents double execution" {
  set_state "implementing"

  # First run acquires lock
  activity_start 42 "verify" "implementing"

  # Second run with different GITHUB_RUN_ID should fail
  local saved_lock_id="$_ACTIVITY_LOCK_ID"
  export GITHUB_RUN_ID="99999"
  run activity_start 42 "verify" "implementing"
  [ "$status" -eq 1 ]
  assert_contains "$output" "lock"

  # Restore
  export GITHUB_RUN_ID="12345"
  _ACTIVITY_LOCK_ID="$saved_lock_id"
}
