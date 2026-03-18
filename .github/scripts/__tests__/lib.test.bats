#!/usr/bin/env bats
# Tests for .github/scripts/lib.sh

SCRIPTS_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"

load 'test-helper'

setup() {
  setup_mocks

  # Source lib.sh. Clear positional params so set -u doesn't choke on bats' $@.
  set --
  source "$SCRIPTS_DIR/lib.sh"
  set +u
}

teardown() {
  teardown_mocks
}

# Helper: create a mock git script that records all calls to a log file
# and provides configurable responses per subcommand.
create_git_mock() {
  GIT_LOG="$MOCK_DIR/git_calls.log"
  cat > "$MOCK_DIR/git" <<'EOF'
#!/bin/bash
echo "$*" >> "$(dirname "$0")/git_calls.log"
EOF
  chmod +x "$MOCK_DIR/git"
}

# Add a route to the git mock: when args match pattern, output response.
add_git_route() {
  local pattern="$1"
  local response="$2"
  local exit_code="${3:-0}"

  # Insert before the final catch-all
  sed -i.bak '/^exit 0$/d' "$MOCK_DIR/git" 2>/dev/null || true
  rm -f "$MOCK_DIR/git.bak"

  cat >> "$MOCK_DIR/git" <<ROUTE
if echo "\$*" | grep -q '${pattern}'; then
  echo '${response}'
  exit ${exit_code}
fi
ROUTE

  echo 'exit 0' >> "$MOCK_DIR/git"
}

# ===================================================================
# 1. parse_repo
# ===================================================================

@test "parse_repo splits owner and name from GITHUB_REPOSITORY" {
  export GITHUB_REPOSITORY="myowner/myrepo"
  parse_repo
  [ "$REPO_OWNER" = "myowner" ]
  [ "$REPO_NAME" = "myrepo" ]
}

@test "parse_repo handles org with hyphens" {
  export GITHUB_REPOSITORY="my-org/my-repo-name"
  parse_repo
  [ "$REPO_OWNER" = "my-org" ]
  [ "$REPO_NAME" = "my-repo-name" ]
}

@test "parse_repo fails when GITHUB_REPOSITORY is unset" {
  unset GITHUB_REPOSITORY
  run bash -c "source '$SCRIPTS_DIR/lib.sh' && parse_repo"
  [ "$status" -ne 0 ]
}

# ===================================================================
# 2. get_pr_number — workflow_dispatch
# ===================================================================

@test "get_pr_number returns INPUT_PR_NUMBER for workflow_dispatch" {
  export INPUT_PR_NUMBER="123"
  result=$(get_pr_number "workflow_dispatch")
  [ "$result" = "123" ]
}

@test "get_pr_number returns empty when INPUT_PR_NUMBER unset for workflow_dispatch" {
  unset INPUT_PR_NUMBER
  result=$(get_pr_number "workflow_dispatch")
  [ "$result" = "" ]
}

# ===================================================================
# 3. get_pr_number — workflow_run
# ===================================================================

@test "get_pr_number finds PR by branch for workflow_run" {
  export WORKFLOW_RUN_HEAD_BRANCH="feat/my-branch"
  mock_gh_response "pr list" "42"

  result=$(get_pr_number "workflow_run")
  [ "$result" = "42" ]
}

@test "get_pr_number returns empty when no branch set for workflow_run" {
  unset WORKFLOW_RUN_HEAD_BRANCH
  result=$(get_pr_number "workflow_run")
  [ "$result" = "" ]
}

@test "get_pr_number returns empty when gh pr list fails for workflow_run" {
  export WORKFLOW_RUN_HEAD_BRANCH="feat/orphan"
  mock_gh_failure "pr list" "no PRs found"

  result=$(get_pr_number "workflow_run")
  [ "$result" = "" ]
}

# ===================================================================
# 4. get_pr_number — pull_request / issue_comment
# ===================================================================

@test "get_pr_number returns PR_NUMBER_FROM_EVENT for pull_request" {
  export PR_NUMBER_FROM_EVENT="55"
  result=$(get_pr_number "pull_request")
  [ "$result" = "55" ]
}

@test "get_pr_number returns PR_NUMBER_FROM_EVENT for pull_request_review" {
  export PR_NUMBER_FROM_EVENT="66"
  result=$(get_pr_number "pull_request_review")
  [ "$result" = "66" ]
}

@test "get_pr_number returns PR_NUMBER_FROM_EVENT for issue_comment" {
  export PR_NUMBER_FROM_EVENT="77"
  result=$(get_pr_number "issue_comment")
  [ "$result" = "77" ]
}

@test "get_pr_number returns empty for unknown event type" {
  result=$(get_pr_number "schedule")
  [ "$result" = "" ]
}

# ===================================================================
# 5. check_ci_status — all pass
# ===================================================================

@test "check_ci_status reports all pass when test and all e2e succeed" {
  mock_gh_response "check-runs" 'test|success|completed
test-chromium|success|completed
test-performance|success|completed
test-cross-browser|success|completed'

  result=$(check_ci_status "abc123" "testowner/testrepo")
  assert_contains "$result" "TESTS_PASS=true"
  assert_contains "$result" "E2E_PASS=true"
}

# ===================================================================
# 6. check_ci_status — partial pass (tests pass, e2e partial)
# ===================================================================

@test "check_ci_status reports e2e fail when one e2e job missing" {
  mock_gh_response "check-runs" 'test|success|completed
test-chromium|success|completed
test-performance|success|completed'

  result=$(check_ci_status "abc123" "testowner/testrepo")
  assert_contains "$result" "TESTS_PASS=true"
  assert_contains "$result" "E2E_PASS=false"
}

@test "check_ci_status reports e2e fail when one e2e job fails" {
  mock_gh_response "check-runs" 'test|success|completed
test-chromium|success|completed
test-performance|failure|completed
test-cross-browser|success|completed'

  result=$(check_ci_status "abc123" "testowner/testrepo")
  assert_contains "$result" "TESTS_PASS=true"
  assert_contains "$result" "E2E_PASS=false"
}

# ===================================================================
# 7. check_ci_status — all fail
# ===================================================================

@test "check_ci_status reports all fail when test fails and no e2e" {
  mock_gh_response "check-runs" 'test|failure|completed'

  result=$(check_ci_status "abc123" "testowner/testrepo")
  assert_contains "$result" "TESTS_PASS=false"
  assert_contains "$result" "E2E_PASS=false"
}

@test "check_ci_status handles empty check runs (gh api failure)" {
  mock_gh_failure "check-runs" "API error"

  result=$(check_ci_status "abc123" "testowner/testrepo")
  assert_contains "$result" "TESTS_PASS=false"
  assert_contains "$result" "E2E_PASS=false"
}

# ===================================================================
# 8. count_unresolved_threads
# ===================================================================

@test "count_unresolved_threads returns count from graphql" {
  mock_gh_response "graphql" "3"

  result=$(count_unresolved_threads "42" "testowner/testrepo")
  [ "$result" = "3" ]
}

@test "count_unresolved_threads returns 0 on gh failure" {
  mock_gh_failure "graphql" "API error"

  result=$(count_unresolved_threads "42" "testowner/testrepo")
  [ "$result" = "0" ]
}

# ===================================================================
# 9. count_approvals
# ===================================================================

@test "count_approvals returns approval count" {
  mock_gh_response "reviews" "2"

  result=$(count_approvals "42" "testowner/testrepo")
  [ "$result" = "2" ]
}

@test "count_approvals returns 0 when no approvals" {
  mock_gh_response "reviews" "0"

  result=$(count_approvals "42" "testowner/testrepo")
  [ "$result" = "0" ]
}

@test "count_approvals returns 0 on gh failure" {
  mock_gh_failure "reviews" "API error"

  result=$(count_approvals "42" "testowner/testrepo")
  [ "$result" = "0" ]
}

# ===================================================================
# 10. comment_on_issue
# ===================================================================

@test "comment_on_issue calls gh issue comment with correct args" {
  mock_gh_response "issue comment" "ok"

  run comment_on_issue "42" "Hello world" "testowner/testrepo"
  [ "$status" -eq 0 ]
}

@test "comment_on_issue uses GITHUB_REPOSITORY when repo not specified" {
  export GITHUB_REPOSITORY="testowner/testrepo"
  mock_gh_response "issue comment" "ok"

  run comment_on_issue "42" "Hello world"
  [ "$status" -eq 0 ]
}

@test "comment_on_issue fails when repo not specified and GITHUB_REPOSITORY unset" {
  unset GITHUB_REPOSITORY
  run comment_on_issue "42" "Hello world" ""
  [ "$status" -eq 1 ]
  assert_contains "$output" "repo not specified"
}

# ===================================================================
# 11. count_fix_attempts
# ===================================================================

@test "count_fix_attempts returns count matching pattern" {
  mock_gh_response "issues/10/comments" "3"

  result=$(count_fix_attempts "10" "fix-attempt" "testowner/testrepo")
  [ "$result" = "3" ]
}

@test "count_fix_attempts returns 0 on gh failure" {
  mock_gh_failure "issues/10/comments" "not found"

  result=$(count_fix_attempts "10" "fix-attempt" "testowner/testrepo")
  [ "$result" = "0" ]
}

# ===================================================================
# 12. is_workflow_active — active
# ===================================================================

@test "is_workflow_active returns 0 when workflow is running" {
  # First call (in_progress) returns 1, second call (queued) returns 0
  cat > "$MOCK_DIR/gh" <<'EOF'
#!/bin/bash
ARGS="$*"
if echo "$ARGS" | grep -q "in_progress"; then
  echo "1"
  exit 0
fi
if echo "$ARGS" | grep -q "queued"; then
  echo "0"
  exit 0
fi
echo "0"
EOF
  chmod +x "$MOCK_DIR/gh"

  run is_workflow_active "my-workflow.yml" "42" "testowner/testrepo"
  [ "$status" -eq 0 ]
}

# ===================================================================
# 13. is_workflow_active — not active
# ===================================================================

@test "is_workflow_active returns 1 when workflow is not running" {
  cat > "$MOCK_DIR/gh" <<'EOF'
#!/bin/bash
echo "0"
exit 0
EOF
  chmod +x "$MOCK_DIR/gh"

  run is_workflow_active "my-workflow.yml" "42" "testowner/testrepo"
  [ "$status" -eq 1 ]
}

# ===================================================================
# 14. dispatch_workflow — without --ref (default to master)
# ===================================================================

@test "dispatch_workflow adds --ref master when no --ref provided" {
  cat > "$MOCK_DIR/gh" <<'EOF'
#!/bin/bash
echo "$*" > "$(dirname "$0")/gh_calls.log"
exit 0
EOF
  chmod +x "$MOCK_DIR/gh"

  dispatch_workflow "build.yml" -f "key=value"

  local call
  call=$(cat "$MOCK_DIR/gh_calls.log")
  assert_contains "$call" "workflow run build.yml"
  echo "$call" | grep -qF -- "--ref master"
  echo "$call" | grep -qF -- "-f key=value"
}

# ===================================================================
# 15. dispatch_workflow — with --ref
# ===================================================================

@test "dispatch_workflow does not add --ref master when --ref is provided" {
  cat > "$MOCK_DIR/gh" <<'EOF'
#!/bin/bash
echo "$*" > "$(dirname "$0")/gh_calls.log"
exit 0
EOF
  chmod +x "$MOCK_DIR/gh"

  dispatch_workflow "build.yml" --ref my-branch -f "key=value"

  local call
  call=$(cat "$MOCK_DIR/gh_calls.log")
  echo "$call" | grep -qF -- "--ref my-branch"
  # Should NOT contain "--ref master"
  if echo "$call" | grep -qF -- "--ref master"; then
    echo "Expected no --ref master but found it in: $call"
    return 1
  fi
}

# ===================================================================
# 16. setup_git_auth
# ===================================================================

@test "setup_git_auth configures git remote and user" {
  create_git_mock

  setup_git_auth

  local calls
  calls=$(cat "$GIT_LOG")
  assert_contains "$calls" "remote set-url origin"
  assert_contains "$calls" "x-access-token:test-token-fake"
  assert_contains "$calls" "config user.name"
  assert_contains "$calls" "config user.email"
}

@test "setup_git_auth uses custom user name and email" {
  create_git_mock
  export GIT_USER_NAME="Custom Bot"
  export GIT_USER_EMAIL="bot@example.com"

  setup_git_auth

  local calls
  calls=$(cat "$GIT_LOG")
  assert_contains "$calls" "Custom Bot"
  assert_contains "$calls" "bot@example.com"
}

# ===================================================================
# 17. check_changes_and_commit — no changes
# ===================================================================

@test "check_changes_and_commit returns 1 when no changes" {
  create_git_mock
  add_git_route "status --porcelain" ""

  run check_changes_and_commit "test commit"
  [ "$status" -eq 1 ]
  assert_contains "$output" "No uncommitted changes"
}

# ===================================================================
# 18. check_changes_and_commit — has changes
# ===================================================================

@test "check_changes_and_commit commits when changes exist" {
  create_git_mock
  add_git_route "status --porcelain" " M src/foo.ts"
  add_git_route "diff --cached --name-only" "src/foo.ts"

  run check_changes_and_commit "fix: update foo"
  [ "$status" -eq 0 ]

  local calls
  calls=$(cat "$GIT_LOG")
  assert_contains "$calls" "add -u"
  assert_contains "$calls" "commit -m"
}

@test "check_changes_and_commit includes co-author in message" {
  create_git_mock
  add_git_route "status --porcelain" " M src/foo.ts"
  add_git_route "diff --cached --name-only" "src/foo.ts"

  run check_changes_and_commit "fix: update foo" "Bot <bot@test.com>"
  [ "$status" -eq 0 ]

  local calls
  calls=$(cat "$GIT_LOG")
  assert_contains "$calls" "Co-authored-by: Bot <bot@test.com>"
}

# ===================================================================
# 19. check_changes_and_commit — ignores output.txt
# ===================================================================

@test "check_changes_and_commit ignores output.txt in status" {
  create_git_mock
  add_git_route "status --porcelain" "?? output.txt"

  run check_changes_and_commit "test commit"
  [ "$status" -eq 1 ]
  assert_contains "$output" "No uncommitted changes"
}

# ===================================================================
# 20. check_changes_and_commit — staged changes empty after add -u
# ===================================================================

@test "check_changes_and_commit returns 1 when staged changes empty after add" {
  create_git_mock
  add_git_route "status --porcelain" " M src/foo.ts"
  add_git_route "diff --cached --name-only" ""

  run check_changes_and_commit "test commit"
  [ "$status" -eq 1 ]
  assert_contains "$output" "No staged changes"
}

# ===================================================================
# 21. smart_push — local matches remote (nothing to push)
# ===================================================================

@test "smart_push does nothing when local HEAD matches remote" {
  create_git_mock
  add_git_route "rev-parse HEAD" "abc123"
  add_git_route "rev-parse origin/my-branch" "abc123"

  run smart_push "my-branch"
  [ "$status" -eq 0 ]
  assert_contains "$output" "nothing to push"
}

# ===================================================================
# 22. smart_push — ahead of remote
# ===================================================================

@test "smart_push pushes when local is ahead of remote" {
  create_git_mock
  add_git_route "rev-parse HEAD" "def456"
  add_git_route "rev-parse origin/my-branch" "abc123"

  run smart_push "my-branch"
  [ "$status" -eq 0 ]
  assert_contains "$output" "Pushed to my-branch"

  local calls
  calls=$(cat "$GIT_LOG")
  assert_contains "$calls" "push origin HEAD:refs/heads/my-branch"
}

# ===================================================================
# 23. smart_push — no changes with pre_push_head
# ===================================================================

@test "smart_push skips when pre_push_head matches local and remote" {
  create_git_mock
  add_git_route "rev-parse HEAD" "abc123"
  add_git_route "rev-parse origin/my-branch" "abc123"

  run smart_push "my-branch" "abc123"
  [ "$status" -eq 0 ]
  assert_contains "$output" "No changes produced"
}

# ===================================================================
# 24. smart_push — new branch (remote doesn't exist)
# ===================================================================

@test "smart_push pushes when remote branch does not exist" {
  create_git_mock
  add_git_route "rev-parse HEAD" "abc123"

  # rev-parse for remote branch fails (doesn't exist) — handled by fallback "none"
  cat > "$MOCK_DIR/git" <<'SCRIPT'
#!/bin/bash
echo "$*" >> "$(dirname "$0")/git_calls.log"
if echo "$*" | grep -q "rev-parse HEAD"; then
  echo "abc123"
  exit 0
fi
if echo "$*" | grep -q "rev-parse origin/new-branch"; then
  echo "unknown revision" >&2
  exit 128
fi
exit 0
SCRIPT
  chmod +x "$MOCK_DIR/git"

  run smart_push "new-branch"
  [ "$status" -eq 0 ]
  assert_contains "$output" "Pushed to new-branch"
}

# ===================================================================
# 25. merge_master_into_branch — success
# ===================================================================

@test "merge_master_into_branch succeeds on clean merge" {
  create_git_mock
  add_git_route "fetch origin master" ""
  add_git_route "merge origin/master" ""

  run merge_master_into_branch
  [ "$status" -eq 0 ]

  local calls
  calls=$(cat "$GIT_LOG")
  assert_contains "$calls" "fetch origin master"
  assert_contains "$calls" "merge origin/master --no-edit"
}

# ===================================================================
# 26. merge_master_into_branch — conflict
# ===================================================================

@test "merge_master_into_branch handles merge conflict" {
  cat > "$MOCK_DIR/git" <<'SCRIPT'
#!/bin/bash
echo "$*" >> "$(dirname "$0")/git_calls.log"
if echo "$*" | grep -q "merge origin/master --no-edit"; then
  exit 1
fi
exit 0
SCRIPT
  chmod +x "$MOCK_DIR/git"
  GIT_LOG="$MOCK_DIR/git_calls.log"

  run merge_master_into_branch
  [ "$status" -eq 1 ]
  assert_contains "$output" "Merge conflict"

  local calls
  calls=$(cat "$GIT_LOG")
  assert_contains "$calls" "merge --abort"
}

# ===================================================================
# 27. Direct execution guard
# ===================================================================

# ===================================================================
# count_critical_comments
# ===================================================================

@test "count_critical_comments returns count of critical/high badge comments" {
  mock_gh_response "pulls/42/comments" "3"

  run count_critical_comments 42 "testowner/testrepo"
  [ "$status" -eq 0 ]
  [ "$output" = "3" ]
}

@test "count_critical_comments returns 0 when no critical comments" {
  mock_gh_response "pulls/42/comments" "0"

  run count_critical_comments 42 "testowner/testrepo"
  [ "$status" -eq 0 ]
  [ "$output" = "0" ]
}

@test "count_critical_comments returns 0 on API failure" {
  mock_gh_failure "pulls/42/comments"

  run count_critical_comments 42 "testowner/testrepo"
  [ "$status" -eq 0 ]
  [ "$output" = "0" ]
}

# ===================================================================
# approve_and_merge
# ===================================================================

@test "approve_and_merge approves PR and dispatches auto-merge" {
  # Mock both the approval and the dispatch
  mock_gh_response "pr review" "approved"
  mock_gh_response "workflow run" "dispatched"
  export GH_PAT="fake-pat"

  run approve_and_merge 42 "Auto-approved: looks good."
  [ "$status" -eq 0 ]
}

@test "approve_and_merge fails without GH_PAT" {
  unset GH_PAT 2>/dev/null || true

  run approve_and_merge 42 "Auto-approved."
  [ "$status" -ne 0 ]
}

@test "approve_and_merge uses custom repo when provided" {
  mock_gh_response "pr review" "approved"
  mock_gh_response "workflow run" "dispatched"
  export GH_PAT="fake-pat"

  run approve_and_merge 42 "Auto-approved." "custom/repo"
  [ "$status" -eq 0 ]
}

# ===================================================================
# get_next_pending_story
# ===================================================================

@test "get_next_pending_story returns lowest issue number" {
  mock_gh_response "issue list" "101"

  run get_next_pending_story "epic:webview" "testowner/testrepo"
  [ "$status" -eq 0 ]
  [ "$output" = "101" ]
}

@test "get_next_pending_story returns empty when no stories found" {
  mock_gh_response "issue list" ""

  run get_next_pending_story "epic:webview" "testowner/testrepo"
  [ "$status" -eq 0 ]
  [ "$output" = "" ]
}

@test "get_next_pending_story uses GITHUB_REPOSITORY as default repo" {
  mock_gh_response "issue list" "42"

  run get_next_pending_story "epic:ocr"
  [ "$status" -eq 0 ]
  [ "$output" = "42" ]
}

# ===================================================================
# trigger_story_agent
# ===================================================================

@test "trigger_story_agent posts @claude comment by default" {
  mock_gh_response "issue comment" "posted"

  run trigger_story_agent 42
  [ "$status" -eq 0 ]
  assert_contains "$output" "posted"
}

@test "trigger_story_agent uses custom agent name" {
  # Create a gh mock that captures args to verify agent name
  cat > "$MOCK_DIR/gh" <<'EOF'
#!/bin/bash
echo "$*"
EOF
  chmod +x "$MOCK_DIR/gh"

  run trigger_story_agent 42 "gemini"
  [ "$status" -eq 0 ]
  assert_contains "$output" "@gemini"
}

@test "trigger_story_agent appends suffix note" {
  cat > "$MOCK_DIR/gh" <<'EOF'
#!/bin/bash
echo "$*"
EOF
  chmod +x "$MOCK_DIR/gh"

  run trigger_story_agent 42 "claude" "(Retry #2 by watcher)"
  [ "$status" -eq 0 ]
  assert_contains "$output" "(Retry #2 by watcher)"
}

@test "trigger_story_agent includes Closes #N in body" {
  cat > "$MOCK_DIR/gh" <<'EOF'
#!/bin/bash
echo "$*"
EOF
  chmod +x "$MOCK_DIR/gh"

  run trigger_story_agent 42
  [ "$status" -eq 0 ]
  assert_contains "$output" "Closes #42"
}

# ===================================================================
# 27. Direct execution guard
# ===================================================================

@test "lib.sh exits with error when executed directly" {
  run bash "$SCRIPTS_DIR/lib.sh"
  [ "$status" -eq 1 ]
  assert_contains "$output" "meant to be sourced"
}
