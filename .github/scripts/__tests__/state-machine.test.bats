#!/usr/bin/env bats
# Tests for .github/scripts/state-machine.sh

SCRIPTS_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"

setup() {
  load 'test-helper'
  setup_mocks
  FIXTURES_DIR="$(mktemp -d)"
}

teardown() {
  teardown_mocks
  if [ -n "$FIXTURES_DIR" ] && [ -d "$FIXTURES_DIR" ]; then
    rm -rf "$FIXTURES_DIR"
  fi
}

# Helper: run a state-machine function in a subshell that sources the script fresh.
# This is needed because bats runs tests in subshells where `declare -a` arrays
# from the parent scope are not inherited.
sm_run() {
  run bash -c "source '$SCRIPTS_DIR/state-machine.sh' && export GH_TOKEN='$GH_TOKEN' && export GITHUB_REPOSITORY='$GITHUB_REPOSITORY' && export PATH='$PATH' && $*"
}

# ─── Transition validation tests (pure logic, no mocks needed) ───────────────

@test "_sm_is_valid_state accepts all valid states" {
  for s in planned implementing verifying fix-loop verified reviewing fix-reviews approved merging merged escalated stuck; do
    sm_run "_sm_is_valid_state '$s'"
    [ "$status" -eq 0 ]
  done
}

@test "_sm_is_valid_state rejects invalid state names" {
  sm_run "_sm_is_valid_state 'invalid'"
  [ "$status" -eq 1 ]

  sm_run "_sm_is_valid_state 'running'"
  [ "$status" -eq 1 ]

  sm_run "_sm_is_valid_state ''"
  [ "$status" -eq 1 ]

  sm_run "_sm_is_valid_state 'PLANNED'"
  [ "$status" -eq 1 ]
}

@test "_sm_is_valid_transition accepts planned to implementing" {
  sm_run "_sm_is_valid_transition 'planned' 'implementing'"
  [ "$status" -eq 0 ]
}

@test "_sm_is_valid_transition rejects planned to merged (invalid jump)" {
  sm_run "_sm_is_valid_transition 'planned' 'merged'"
  [ "$status" -eq 1 ]
}

@test "_sm_is_valid_transition accepts any to stuck (wildcard)" {
  sm_run "_sm_is_valid_transition 'implementing' 'stuck'"
  [ "$status" -eq 0 ]

  sm_run "_sm_is_valid_transition 'verifying' 'stuck'"
  [ "$status" -eq 0 ]

  sm_run "_sm_is_valid_transition 'reviewing' 'stuck'"
  [ "$status" -eq 0 ]
}

@test "_sm_is_valid_transition accepts fix-loop to verifying (retry)" {
  sm_run "_sm_is_valid_transition 'fix-loop' 'verifying'"
  [ "$status" -eq 0 ]
}

@test "_sm_is_valid_transition accepts fix-loop to escalated (give up)" {
  sm_run "_sm_is_valid_transition 'fix-loop' 'escalated'"
  [ "$status" -eq 0 ]
}

@test "_sm_is_valid_transition rejects merged to reviewing (can't go backward)" {
  sm_run "_sm_is_valid_transition 'merged' 'reviewing'"
  [ "$status" -eq 1 ]
}

@test "_sm_is_valid_transition accepts merging to approved (branch behind case)" {
  sm_run "_sm_is_valid_transition 'merging' 'approved'"
  [ "$status" -eq 0 ]
}

# ─── Integration tests (need gh mocks) ──────────────────────────────────────

# Build a mock gh script that supports --jq filtering and file-based responses.
# Routes are added via add_gh_route (inline) or add_gh_file_route (from file).
create_gh_mock() {
  cat > "$MOCK_DIR/gh" <<'GHSCRIPT'
#!/bin/bash
ARGS="$*"

# Extract --jq argument if present
JQ_FILTER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --jq)
      JQ_FILTER="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

GHSCRIPT
  chmod +x "$MOCK_DIR/gh"
}

# Append an inline route to the mock gh script.
add_gh_route() {
  local pattern="$1"
  local response="$2"

  sed -i.bak '/^echo ""$/d' "$MOCK_DIR/gh" 2>/dev/null || true
  rm -f "$MOCK_DIR/gh.bak"

  cat >> "$MOCK_DIR/gh" <<ROUTE
if echo "\$ARGS" | grep -q '${pattern}'; then
  RESPONSE='${response}'
  if [ -n "\$JQ_FILTER" ]; then
    echo "\$RESPONSE" | jq -r "\$JQ_FILTER" 2>/dev/null
  else
    echo "\$RESPONSE"
  fi
  exit 0
fi
ROUTE

  echo 'echo ""' >> "$MOCK_DIR/gh"
}

# Append a file-based route (for multi-line responses like comment bodies).
add_gh_file_route() {
  local pattern="$1"
  local file="$2"

  sed -i.bak '/^echo ""$/d' "$MOCK_DIR/gh" 2>/dev/null || true
  rm -f "$MOCK_DIR/gh.bak"

  cat >> "$MOCK_DIR/gh" <<ROUTE
if echo "\$ARGS" | grep -q '${pattern}'; then
  if [ -n "\$JQ_FILTER" ]; then
    cat '${file}' | jq -r "\$JQ_FILTER" 2>/dev/null
  else
    cat '${file}'
  fi
  exit 0
fi
ROUTE

  echo 'echo ""' >> "$MOCK_DIR/gh"
}

# Write a fixture file containing a JSON array of issue comments.
# Uses jq to build valid JSON with proper escaping of the markdown body.
# Usage: write_comments_fixture <file> <comment_id> <state> [extra_json_fields]
write_comments_fixture() {
  local file="$1"
  local comment_id="$2"
  local state="$3"
  local extra="${4:-}"
  local state_json="{\"state\":\"${state}\"${extra:+,${extra}}}"
  local body
  body="$(printf '%s\n%s\n\n%s\n%s\n%s\n%s' \
    '<!-- pipeline-state -->' \
    "<details><summary>Pipeline: ${state}</summary>" \
    '```json' \
    "${state_json}" \
    '```' \
    '</details>')"
  jq -n --argjson id "$comment_id" --arg body "$body" \
    '[{"id": $id, "body": $body}]' > "$file"
}

# Write a fixture file containing a single comment object (for fetching by ID).
write_comment_fixture() {
  local file="$1"
  local state="$2"
  local extra="${3:-}"
  local state_json="{\"state\":\"${state}\"${extra:+,${extra}}}"
  local body
  body="$(printf '%s\n%s\n\n%s\n%s\n%s\n%s' \
    '<!-- pipeline-state -->' \
    "<details><summary>Pipeline: ${state}</summary>" \
    '```json' \
    "${state_json}" \
    '```' \
    '</details>')"
  jq -n --arg body "$body" '{"body": $body}' > "$file"
}

@test "read_state returns empty for issue with no state comment" {
  create_gh_mock
  add_gh_route "issues/99/comments" "[]"

  sm_run "read_state 99"
  [ "$status" -eq 0 ]
  [ "$output" = "" ]
}

@test "write_state creates a new state comment (mock gh api POST)" {
  create_gh_mock
  # find_comment_id: no existing state comment
  add_gh_route "issues/42/comments.*paginate" "[]"
  # POST to create comment succeeds
  add_gh_route "issues/42/comments.*POST" "{}"

  sm_run 'write_state 42 '"'"'{"state":"planned","attempt":0}'"'"
  [ "$status" -eq 0 ]
}

@test "get_state returns unknown for new issue" {
  create_gh_mock
  add_gh_route "issues/55/comments" "[]"

  sm_run "get_state 55"
  [ "$status" -eq 0 ]
  [ "$output" = "unknown" ]
}

@test "transition from unknown to planned works" {
  create_gh_mock
  # No existing state comment
  add_gh_route "issues/10/comments.*paginate" "[]"
  # POST for creating the new comment
  add_gh_route "issues/10/comments.*POST" "{}"

  sm_run "transition 10 planned"
  [ "$status" -eq 0 ]
}

@test "transition from planned to merged fails (invalid)" {
  create_gh_mock
  # Set up fixtures for an issue in "planned" state
  write_comments_fixture "$FIXTURES_DIR/comments.json" 100 "planned" '"attempt":0,"history":[]'
  write_comment_fixture "$FIXTURES_DIR/comment100.json" "planned" '"attempt":0,"history":[]'

  add_gh_file_route "issues/11/comments.*paginate" "$FIXTURES_DIR/comments.json"
  add_gh_file_route "issues/comments/100" "$FIXTURES_DIR/comment100.json"

  sm_run "transition 11 merged"
  [ "$status" -eq 1 ]
  assert_contains "$output" "Invalid transition"
}

@test "acquire_lock succeeds when no lock held" {
  create_gh_mock
  write_comments_fixture "$FIXTURES_DIR/comments.json" 200 "planned" '"lock_id":null'
  write_comment_fixture "$FIXTURES_DIR/comment200.json" "planned" '"lock_id":null'

  add_gh_file_route "issues/20/comments.*paginate" "$FIXTURES_DIR/comments.json"
  add_gh_file_route "issues/comments/200" "$FIXTURES_DIR/comment200.json"
  add_gh_route "PATCH" "{}"

  sm_run "acquire_lock 20 my-lock-123"
  [ "$status" -eq 0 ]
}

@test "acquire_lock fails when different lock held" {
  create_gh_mock
  write_comments_fixture "$FIXTURES_DIR/comments.json" 201 "planned" '"lock_id":"other-lock-456"'
  write_comment_fixture "$FIXTURES_DIR/comment201.json" "planned" '"lock_id":"other-lock-456"'

  add_gh_file_route "issues/21/comments.*paginate" "$FIXTURES_DIR/comments.json"
  add_gh_file_route "issues/comments/201" "$FIXTURES_DIR/comment201.json"

  sm_run "acquire_lock 21 my-lock-123"
  [ "$status" -eq 1 ]
  assert_contains "$output" "Lock held by"
}

@test "check_lock returns 0 for matching lock" {
  create_gh_mock
  write_comments_fixture "$FIXTURES_DIR/comments.json" 300 "planned" '"lock_id":"lock-abc"'
  write_comment_fixture "$FIXTURES_DIR/comment300.json" "planned" '"lock_id":"lock-abc"'

  add_gh_file_route "issues/30/comments.*paginate" "$FIXTURES_DIR/comments.json"
  add_gh_file_route "issues/comments/300" "$FIXTURES_DIR/comment300.json"

  sm_run "check_lock 30 lock-abc"
  [ "$status" -eq 0 ]
}

@test "check_lock returns 1 for non-matching lock" {
  create_gh_mock
  write_comments_fixture "$FIXTURES_DIR/comments.json" 301 "planned" '"lock_id":"lock-abc"'
  write_comment_fixture "$FIXTURES_DIR/comment301.json" "planned" '"lock_id":"lock-abc"'

  add_gh_file_route "issues/31/comments.*paginate" "$FIXTURES_DIR/comments.json"
  add_gh_file_route "issues/comments/301" "$FIXTURES_DIR/comment301.json"

  sm_run "check_lock 31 wrong-lock"
  [ "$status" -eq 1 ]
}
