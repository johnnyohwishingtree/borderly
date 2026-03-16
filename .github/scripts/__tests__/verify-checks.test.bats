#!/usr/bin/env bats
# Tests for .github/scripts/verify-checks.sh
#
# Requires bash 4+ for associative arrays used by the script under test.
# On macOS: SHELL=/opt/homebrew/bin/bash bats <this file>
# On Linux/CI (bash 4+): works out of the box.

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

load 'test-helper'

# ---------------------------------------------------------------------------
# setup / teardown
# ---------------------------------------------------------------------------
setup() {
  setup_mocks

  # Source the script. The _VERIFY_CHECKS_SOURCED guard prevents _run_all_checks
  # from executing. We must:
  #   1. Clear positional params so the flag parser doesn't see bats' $@
  #   2. Disable nounset (-u) after sourcing -- associative array reads via
  #      variable subscripts (e.g. ${_CHECK_PASS[$check]}) fail under set -u
  #      in bats due to scope isolation between the sourced file and test shell.
  set --
  source "$SCRIPTS_DIR/verify-checks.sh"
  set +u

  # Re-init scalar state (these survive across scopes fine)
  _PASS=true
  _SUMMARY=""
  LINT_ONLY_CHANGED=false
  FAIL_FAST=false
  SKIP_NATIVE=false

  # Note: The associative arrays _CHECK_PASS and _CHECK_ERRORS are declared
  # in the sourced script via `declare -A` (local to setup). They're accessible
  # within functions defined in the sourced file (e.g. _record_failure,
  # _emit_json) but not directly in the test body. We verify array state
  # through _emit_json JSON output rather than direct array reads.
}

teardown() {
  teardown_mocks
}

# ===================================================================
# 1. _json_escape
# ===================================================================

@test "_json_escape escapes double quotes" {
  local result
  result=$(_json_escape 'say "hello"')
  [ "$result" = 'say \"hello\"' ]
}

@test "_json_escape escapes newlines" {
  local result
  result=$(_json_escape $'line1\nline2')
  [ "$result" = 'line1\nline2' ]
}

@test "_json_escape escapes backslashes" {
  local result
  result=$(_json_escape 'path\\to\\file')
  [ "$result" = 'path\\\\to\\\\file' ]
}

@test "_json_escape escapes tabs" {
  local result
  result=$(_json_escape $'col1\tcol2')
  [ "$result" = 'col1\tcol2' ]
}

# ===================================================================
# 2. _record_failure
# ===================================================================

@test "_record_failure sets _PASS to false" {
  _record_failure "lint" "some error" "LINT ERRORS"
  [ "$_PASS" = "false" ]
}

@test "_record_failure records check-level failure in JSON output" {
  _record_failure "lint" "unused var" "LINT ERRORS"

  local json
  json=$(_emit_json)
  assert_json "$json" ".checks.lint.pass" "false"
  assert_json "$json" ".checks.lint.errors" "unused var"
}

@test "_record_failure accumulates summary for multiple failures" {
  _record_failure "lint" "lint err" "LINT ERRORS"
  _record_failure "typecheck" "ts err" "TYPECHECK ERRORS"

  assert_contains "$_SUMMARY" "LINT ERRORS"
  assert_contains "$_SUMMARY" "lint err"
  assert_contains "$_SUMMARY" "TYPECHECK ERRORS"
  assert_contains "$_SUMMARY" "ts err"
}

# ===================================================================
# 3. _should_skip with FAIL_FAST
# ===================================================================

@test "_should_skip returns 1 (don't skip) when _PASS=true" {
  _PASS=true
  FAIL_FAST=true
  run _should_skip
  [ "$status" -eq 1 ]
}

@test "_should_skip returns 0 (skip) when _PASS=false and FAIL_FAST=true" {
  _PASS=false
  FAIL_FAST=true
  run _should_skip
  [ "$status" -eq 0 ]
}

@test "_should_skip returns 1 (don't skip) when _PASS=false and FAIL_FAST=false" {
  _PASS=false
  FAIL_FAST=false
  run _should_skip
  [ "$status" -eq 1 ]
}

# ===================================================================
# 4. _emit_json
# ===================================================================

@test "_emit_json outputs pass=true when all checks pass" {
  local json
  json=$(_emit_json)

  assert_json "$json" ".pass" "true"
  assert_json "$json" ".checks.lint.pass" "true"
  assert_json "$json" ".checks.typecheck.pass" "true"
  assert_json "$json" ".checks.bundle.pass" "true"
  assert_json "$json" ".checks.test.pass" "true"
  assert_json "$json" ".checks.native_deps.pass" "true"
}

@test "_emit_json outputs pass=false when one check fails" {
  _record_failure "typecheck" "error TS2345: bad type" "TYPECHECK ERRORS"

  local json
  json=$(_emit_json)

  assert_json "$json" ".pass" "false"
  assert_json "$json" ".checks.typecheck.pass" "false"
  local errors
  errors=$(echo "$json" | jq -r '.checks.typecheck.errors')
  assert_contains "$errors" "error TS2345"
}

@test "_emit_json summary contains all error sections on multiple failures" {
  _record_failure "lint" "no-unused-vars" "LINT ERRORS"
  _record_failure "test" "FAIL src/foo.test.ts" "TEST FAILURES"

  local json
  json=$(_emit_json)

  assert_json "$json" ".pass" "false"
  local summary
  summary=$(echo "$json" | jq -r '.summary')
  assert_contains "$summary" "LINT ERRORS"
  assert_contains "$summary" "TEST FAILURES"
}

# ===================================================================
# 5. check_lint with no changed files (lint-only-changed mode)
# ===================================================================

@test "check_lint skips when lint-only-changed and no changed files" {
  LINT_ONLY_CHANGED=true

  # Mock git to return no files
  cat > "$MOCK_DIR/git" <<'EOF'
#!/bin/bash
echo ""
EOF
  chmod +x "$MOCK_DIR/git"

  check_lint

  [ "$_PASS" = "true" ]
  local json
  json=$(_emit_json)
  assert_json "$json" ".checks.lint.pass" "true"
}

# ===================================================================
# 6. check_lint with errors
# ===================================================================

@test "check_lint fails when eslint reports errors" {
  LINT_ONLY_CHANGED=true

  # Mock git to return changed files
  cat > "$MOCK_DIR/git" <<'EOF'
#!/bin/bash
echo "src/foo.ts"
EOF
  chmod +x "$MOCK_DIR/git"

  # Mock npx (eslint) to output error lines
  cat > "$MOCK_DIR/npx" <<'EOF'
#!/bin/bash
echo "src/foo.ts:3:5: error  no-unused-vars  'x' is defined but never used"
echo "src/foo.ts:7:1: error  no-console      Unexpected console statement"
exit 1
EOF
  chmod +x "$MOCK_DIR/npx"

  check_lint

  [ "$_PASS" = "false" ]
  local json
  json=$(_emit_json)
  assert_json "$json" ".checks.lint.pass" "false"
  local errors
  errors=$(echo "$json" | jq -r '.checks.lint.errors')
  assert_contains "$errors" "error"
}

# ===================================================================
# 7. check_typecheck pass
# ===================================================================

@test "check_typecheck passes on clean output" {
  cat > "$MOCK_DIR/pnpm" <<'EOF'
#!/bin/bash
echo "Done in 4.2s"
exit 0
EOF
  chmod +x "$MOCK_DIR/pnpm"

  check_typecheck

  [ "$_PASS" = "true" ]
  local json
  json=$(_emit_json)
  assert_json "$json" ".checks.typecheck.pass" "true"
}

# ===================================================================
# 8. check_typecheck fail
# ===================================================================

@test "check_typecheck fails when TS errors are found" {
  cat > "$MOCK_DIR/pnpm" <<'EOF'
#!/bin/bash
if [[ "$1" == "typecheck" ]]; then
  echo "src/foo.ts(3,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'."
  exit 1
fi
EOF
  chmod +x "$MOCK_DIR/pnpm"

  check_typecheck

  [ "$_PASS" = "false" ]
  local json
  json=$(_emit_json)
  assert_json "$json" ".checks.typecheck.pass" "false"
  local errors
  errors=$(echo "$json" | jq -r '.checks.typecheck.errors')
  assert_contains "$errors" "error TS2345"
}

# ===================================================================
# 9. Fail-fast skipping
# ===================================================================

@test "check_bundle is skipped when _PASS=false and FAIL_FAST=true" {
  _PASS=false
  FAIL_FAST=true

  # npx should NOT be called
  cat > "$MOCK_DIR/npx" <<'EOF'
#!/bin/bash
echo "error: should not have been called"
exit 1
EOF
  chmod +x "$MOCK_DIR/npx"

  check_bundle

  # bundle check still shows pass since it was skipped (never ran)
  local json
  json=$(_emit_json)
  assert_json "$json" ".checks.bundle.pass" "true"
}

@test "check_test is skipped when _PASS=false and FAIL_FAST=true" {
  _PASS=false
  FAIL_FAST=true

  cat > "$MOCK_DIR/pnpm" <<'EOF'
#!/bin/bash
echo "FAIL src/something.test.ts"
exit 1
EOF
  chmod +x "$MOCK_DIR/pnpm"

  check_test

  # test check still shows pass since it was skipped
  local json
  json=$(_emit_json)
  assert_json "$json" ".checks.test.pass" "true"
}

# ===================================================================
# 10. Flag parsing
# ===================================================================

@test "--lint-only-changed sets LINT_ONLY_CHANGED flag" {
  set -- --lint-only-changed
  source "$SCRIPTS_DIR/verify-checks.sh" --lint-only-changed
  [ "$LINT_ONLY_CHANGED" = "true" ]
  [ "$FAIL_FAST" = "false" ]
  [ "$SKIP_NATIVE" = "false" ]
}

@test "--fail-fast sets FAIL_FAST flag" {
  set -- --fail-fast
  source "$SCRIPTS_DIR/verify-checks.sh" --fail-fast
  [ "$FAIL_FAST" = "true" ]
  [ "$LINT_ONLY_CHANGED" = "false" ]
}

@test "--skip-native sets SKIP_NATIVE flag" {
  set -- --skip-native
  source "$SCRIPTS_DIR/verify-checks.sh" --skip-native
  [ "$SKIP_NATIVE" = "true" ]
}

@test "multiple flags can be combined" {
  set -- --lint-only-changed --fail-fast --skip-native
  source "$SCRIPTS_DIR/verify-checks.sh" --lint-only-changed --fail-fast --skip-native
  [ "$LINT_ONLY_CHANGED" = "true" ]
  [ "$FAIL_FAST" = "true" ]
  [ "$SKIP_NATIVE" = "true" ]
}

# ===================================================================
# Additional: check_native_deps skipped with --skip-native
# ===================================================================

@test "check_native_deps is skipped when SKIP_NATIVE=true" {
  SKIP_NATIVE=true

  # Mock node -- should NOT be called
  cat > "$MOCK_DIR/node" <<'EOF'
#!/bin/bash
echo "should-not-be-called"
exit 1
EOF
  chmod +x "$MOCK_DIR/node"

  check_native_deps

  [ "$_PASS" = "true" ]
  local json
  json=$(_emit_json)
  assert_json "$json" ".checks.native_deps.pass" "true"
}

# ===================================================================
# Additional: check_test pass and fail
# ===================================================================

@test "check_test passes on clean output" {
  cat > "$MOCK_DIR/pnpm" <<'EOF'
#!/bin/bash
echo "Test Suites: 5 passed, 5 total"
echo "Tests:       42 passed, 42 total"
exit 0
EOF
  chmod +x "$MOCK_DIR/pnpm"

  check_test

  [ "$_PASS" = "true" ]
  local json
  json=$(_emit_json)
  assert_json "$json" ".checks.test.pass" "true"
}

@test "check_test fails when FAIL lines are present" {
  cat > "$MOCK_DIR/pnpm" <<'EOF'
#!/bin/bash
echo "FAIL src/services/formEngine.test.ts"
echo "  formEngine > should auto-fill fields"
echo "    Expected: 42"
echo "    Received: 0"
exit 1
EOF
  chmod +x "$MOCK_DIR/pnpm"

  check_test

  [ "$_PASS" = "false" ]
  local json
  json=$(_emit_json)
  assert_json "$json" ".checks.test.pass" "false"
  local errors
  errors=$(echo "$json" | jq -r '.checks.test.errors')
  assert_contains "$errors" "FAIL "
}

# ===================================================================
# Additional: check_lint full (not lint-only-changed)
# ===================================================================

@test "check_lint runs eslint on all files when not lint-only-changed" {
  LINT_ONLY_CHANGED=false

  cat > "$MOCK_DIR/npx" <<'EOF'
#!/bin/bash
echo "All files passed linting"
exit 0
EOF
  chmod +x "$MOCK_DIR/npx"

  check_lint

  [ "$_PASS" = "true" ]
  local json
  json=$(_emit_json)
  assert_json "$json" ".checks.lint.pass" "true"
}
