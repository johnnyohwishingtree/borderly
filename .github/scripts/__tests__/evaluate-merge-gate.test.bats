#!/usr/bin/env bats
#
# Tests for evaluate-merge-gate.sh
#

SCRIPTS_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"

load 'test-helper'

setup() {
  setup_mocks
}

teardown() {
  teardown_mocks
}

# Helper: set up the standard gh mocks for a fully passing PR.
# Individual tests can override specific mocks after calling this.
mock_all_pass() {
  # baseRefName
  mock_gh_response "baseRefName" "master"
  # headRefOid
  mock_gh_response "headRefOid" "abc123"
  # check-runs (test + 3 e2e jobs)
  mock_gh_response "check-runs" 'test|success|completed
test-chromium|success|completed
test-performance|success|completed
test-cross-browser|success|completed'
  # reviews (1 approval)
  mock_gh_response "reviews" "1"
  # graphql (unresolved threads = 0)
  mock_gh_response "graphql" "0"
  # review-fix.yml runs (none active)
  mock_gh_response "review-fix.yml" "0"
  # mergeStateStatus
  mock_gh_response "mergeStateStatus" "CLEAN"
}

# ── Test 1: All conditions met -> action is "merge" ──

@test "all conditions met returns action merge" {
  mock_all_pass

  result=$("$SCRIPTS_DIR/evaluate-merge-gate.sh" 42 2>/dev/null)

  assert_json "$result" ".action" "merge"
  assert_json "$result" ".ready" "true"
  assert_json "$result" ".pr_number" "42"
  assert_json "$result" ".conditions.tests_pass" "true"
  assert_json "$result" ".conditions.e2e_pass" "true"
  assert_json "$result" ".conditions.approved" "true"
  assert_json "$result" ".conditions.threads_resolved" "true"
  assert_json "$result" ".conditions.no_active_fix" "true"
  assert_json "$result" ".conditions.branch_up_to_date" "true"
  assert_json "$result" ".details.merge_state" "CLEAN"
  assert_json "$result" ".details.head_sha" "abc123"
  assert_json "$result" ".details.base_ref" "master"
  assert_json "$result" ".details.approval_count" "1"
  assert_json "$result" ".details.unresolved_threads" "0"
}

# ── Test 2: Tests failing -> action is "wait" ──

@test "tests failing returns action wait" {
  # baseRefName
  mock_gh_response "baseRefName" "master"
  # headRefOid
  mock_gh_response "headRefOid" "abc123"
  # check-runs: test fails, e2e pass
  mock_gh_response "check-runs" 'test|failure|completed
test-chromium|success|completed
test-performance|success|completed
test-cross-browser|success|completed'
  # reviews (1 approval)
  mock_gh_response "reviews" "1"
  # graphql (unresolved threads = 0)
  mock_gh_response "graphql" "0"
  # review-fix.yml runs (none active)
  mock_gh_response "review-fix.yml" "0"
  # mergeStateStatus
  mock_gh_response "mergeStateStatus" "CLEAN"

  result=$("$SCRIPTS_DIR/evaluate-merge-gate.sh" 42 2>/dev/null)

  assert_json "$result" ".action" "wait"
  assert_json "$result" ".ready" "false"
  assert_json "$result" ".conditions.tests_pass" "false"
  assert_json "$result" ".conditions.e2e_pass" "true"
}

# ── Test 3: Missing one E2E job -> action is "wait" ──

@test "missing e2e job returns action wait" {
  # baseRefName
  mock_gh_response "baseRefName" "master"
  # headRefOid
  mock_gh_response "headRefOid" "abc123"
  # check-runs: test passes, test-performance missing
  mock_gh_response "check-runs" 'test|success|completed
test-chromium|success|completed
test-cross-browser|success|completed'
  # reviews (1 approval)
  mock_gh_response "reviews" "1"
  # graphql (unresolved threads = 0)
  mock_gh_response "graphql" "0"
  # review-fix.yml runs (none active)
  mock_gh_response "review-fix.yml" "0"
  # mergeStateStatus
  mock_gh_response "mergeStateStatus" "CLEAN"

  result=$("$SCRIPTS_DIR/evaluate-merge-gate.sh" 42 2>/dev/null)

  assert_json "$result" ".action" "wait"
  assert_json "$result" ".ready" "false"
  assert_json "$result" ".conditions.tests_pass" "true"
  assert_json "$result" ".conditions.e2e_pass" "false"
}

# ── Test 4: No approval -> action is "wait" ──

@test "no approval returns action wait" {
  # baseRefName
  mock_gh_response "baseRefName" "master"
  # headRefOid
  mock_gh_response "headRefOid" "abc123"
  # check-runs: all pass
  mock_gh_response "check-runs" 'test|success|completed
test-chromium|success|completed
test-performance|success|completed
test-cross-browser|success|completed'
  # reviews (0 approvals)
  mock_gh_response "reviews" "0"
  # graphql (unresolved threads = 0)
  mock_gh_response "graphql" "0"
  # review-fix.yml runs (none active)
  mock_gh_response "review-fix.yml" "0"
  # mergeStateStatus
  mock_gh_response "mergeStateStatus" "CLEAN"

  result=$("$SCRIPTS_DIR/evaluate-merge-gate.sh" 42 2>/dev/null)

  assert_json "$result" ".action" "wait"
  assert_json "$result" ".ready" "false"
  assert_json "$result" ".conditions.approved" "false"
  assert_json "$result" ".details.approval_count" "0"
}

# ── Test 5: Unresolved threads -> action is "wait" ──

@test "unresolved threads returns action wait" {
  # baseRefName
  mock_gh_response "baseRefName" "master"
  # headRefOid
  mock_gh_response "headRefOid" "abc123"
  # check-runs: all pass
  mock_gh_response "check-runs" 'test|success|completed
test-chromium|success|completed
test-performance|success|completed
test-cross-browser|success|completed'
  # reviews (1 approval)
  mock_gh_response "reviews" "1"
  # graphql (2 unresolved threads)
  mock_gh_response "graphql" "2"
  # review-fix.yml runs (none active)
  mock_gh_response "review-fix.yml" "0"
  # mergeStateStatus
  mock_gh_response "mergeStateStatus" "CLEAN"

  result=$("$SCRIPTS_DIR/evaluate-merge-gate.sh" 42 2>/dev/null)

  assert_json "$result" ".action" "wait"
  assert_json "$result" ".ready" "false"
  assert_json "$result" ".conditions.threads_resolved" "false"
  assert_json "$result" ".details.unresolved_threads" "2"
}

# ── Test 6: Branch behind master -> action is "update_branch" ──

@test "branch behind master returns action update_branch" {
  # baseRefName
  mock_gh_response "baseRefName" "master"
  # headRefOid
  mock_gh_response "headRefOid" "abc123"
  # check-runs: all pass
  mock_gh_response "check-runs" 'test|success|completed
test-chromium|success|completed
test-performance|success|completed
test-cross-browser|success|completed'
  # reviews (1 approval)
  mock_gh_response "reviews" "1"
  # graphql (unresolved threads = 0)
  mock_gh_response "graphql" "0"
  # review-fix.yml runs (none active)
  mock_gh_response "review-fix.yml" "0"
  # mergeStateStatus
  mock_gh_response "mergeStateStatus" "BEHIND"

  result=$("$SCRIPTS_DIR/evaluate-merge-gate.sh" 42 2>/dev/null)

  assert_json "$result" ".action" "update_branch"
  assert_json "$result" ".ready" "false"
  assert_json "$result" ".conditions.branch_up_to_date" "false"
  assert_json "$result" ".details.merge_state" "BEHIND"
  # Core conditions should still be true
  assert_json "$result" ".conditions.tests_pass" "true"
  assert_json "$result" ".conditions.e2e_pass" "true"
  assert_json "$result" ".conditions.approved" "true"
  assert_json "$result" ".conditions.threads_resolved" "true"
}

# ── Test 7: PR doesn't target master -> action is "skip" ──

@test "PR targeting non-master branch returns action skip" {
  # baseRefName is develop, not master
  mock_gh_response "baseRefName" "develop"

  result=$("$SCRIPTS_DIR/evaluate-merge-gate.sh" 42 2>/dev/null)

  assert_json "$result" ".action" "skip"
  assert_json "$result" ".ready" "false"
  assert_json "$result" ".details.base_ref" "develop"
}

# ── Test 8: Individual function tests ──

@test "check_tests_passed returns true when test job succeeds" {
  export _EVALUATE_MERGE_GATE_SOURCED=true
  source "$SCRIPTS_DIR/evaluate-merge-gate.sh"

  local check_runs='test|success|completed
test-chromium|success|completed'

  result=$(check_tests_passed "$check_runs")
  [ "$result" = "true" ]
}

@test "check_tests_passed returns false when test job fails" {
  export _EVALUATE_MERGE_GATE_SOURCED=true
  source "$SCRIPTS_DIR/evaluate-merge-gate.sh"

  local check_runs='test|failure|completed
test-chromium|success|completed'

  result=$(check_tests_passed "$check_runs")
  [ "$result" = "false" ]
}

@test "check_tests_passed returns false when test job missing" {
  export _EVALUATE_MERGE_GATE_SOURCED=true
  source "$SCRIPTS_DIR/evaluate-merge-gate.sh"

  local check_runs='test-chromium|success|completed
test-performance|success|completed'

  result=$(check_tests_passed "$check_runs")
  [ "$result" = "false" ]
}

@test "check_e2e_passed returns true when all 3 jobs succeed" {
  export _EVALUATE_MERGE_GATE_SOURCED=true
  source "$SCRIPTS_DIR/evaluate-merge-gate.sh"

  local check_runs='test|success|completed
test-chromium|success|completed
test-performance|success|completed
test-cross-browser|success|completed'

  result=$(check_e2e_passed "$check_runs")
  [ "$result" = "true" ]
}

@test "check_e2e_passed returns false when one job missing" {
  export _EVALUATE_MERGE_GATE_SOURCED=true
  source "$SCRIPTS_DIR/evaluate-merge-gate.sh"

  local check_runs='test|success|completed
test-chromium|success|completed
test-cross-browser|success|completed'

  result=$(check_e2e_passed "$check_runs")
  [ "$result" = "false" ]
}

@test "check_e2e_passed returns false when one job fails" {
  export _EVALUATE_MERGE_GATE_SOURCED=true
  source "$SCRIPTS_DIR/evaluate-merge-gate.sh"

  local check_runs='test-chromium|success|completed
test-performance|failure|completed
test-cross-browser|success|completed'

  result=$(check_e2e_passed "$check_runs")
  [ "$result" = "false" ]
}

@test "check_e2e_passed returns false with empty input" {
  export _EVALUATE_MERGE_GATE_SOURCED=true
  source "$SCRIPTS_DIR/evaluate-merge-gate.sh"

  result=$(check_e2e_passed "")
  [ "$result" = "false" ]
}

# ── Test: Active review-fix blocks merge ──

@test "active review-fix run returns action wait" {
  # All conditions pass EXCEPT review-fix is active
  mock_gh_response "baseRefName" "master"
  mock_gh_response "headRefOid" "abc123"
  mock_gh_response "check-runs" 'test|success|completed
test-chromium|success|completed
test-performance|success|completed
test-cross-browser|success|completed'
  mock_gh_response "reviews" "1"
  mock_gh_response "graphql" "0"
  # review-fix.yml has 1 active run
  mock_gh_response "review-fix.yml" "1"
  mock_gh_response "mergeStateStatus" "CLEAN"

  result=$("$SCRIPTS_DIR/evaluate-merge-gate.sh" 42 2>/dev/null)

  assert_json "$result" ".action" "wait"
  assert_json "$result" ".ready" "false"
  assert_json "$result" ".conditions.no_active_fix" "false"
  # All other conditions should still be true
  assert_json "$result" ".conditions.tests_pass" "true"
  assert_json "$result" ".conditions.e2e_pass" "true"
  assert_json "$result" ".conditions.approved" "true"
  assert_json "$result" ".conditions.threads_resolved" "true"
}

@test "all conditions pass includes no_active_fix in output" {
  mock_all_pass

  result=$("$SCRIPTS_DIR/evaluate-merge-gate.sh" 42 2>/dev/null)

  assert_json "$result" ".action" "merge"
  assert_json "$result" ".conditions.no_active_fix" "true"
}
