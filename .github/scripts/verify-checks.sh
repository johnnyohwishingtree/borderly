#!/usr/bin/env bash
# verify-checks.sh — Runs lint, typecheck, metro bundle, unit tests, and
# native dependency checks.  Returns structured JSON output.
#
# Usage: ./verify-checks.sh [--lint-only-changed] [--fail-fast] [--skip-native]
#
# Environment:
#   GITHUB_REPOSITORY - for diff base (optional, uses master if set)
#
# Output (stdout): JSON
# {
#   "pass": true/false,
#   "checks": {
#     "lint":        {"pass": true, "errors": ""},
#     "typecheck":   {"pass": true, "errors": ""},
#     "bundle":      {"pass": true, "errors": ""},
#     "test":        {"pass": false, "errors": "FAIL src/..."},
#     "native_deps": {"pass": true, "errors": ""}
#   },
#   "summary": "TYPECHECK ERRORS:\nerror TS2345..."
# }
#
# Exit code: 0 if all pass, 1 if any fail

set -euo pipefail

# ---------------------------------------------------------------------------
# Guard: allow sourcing without executing
# ---------------------------------------------------------------------------
_VERIFY_CHECKS_SOURCED=false
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  _VERIFY_CHECKS_SOURCED=true
fi

# ---------------------------------------------------------------------------
# Parse flags
# ---------------------------------------------------------------------------
LINT_ONLY_CHANGED=false
FAIL_FAST=false
SKIP_NATIVE=false

for arg in "$@"; do
  case "$arg" in
    --lint-only-changed) LINT_ONLY_CHANGED=true ;;
    --fail-fast)         FAIL_FAST=true ;;
    --skip-native)       SKIP_NATIVE=true ;;
    *)                   echo "Unknown flag: $arg" >&2; exit 2 ;;
  esac
done

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
_PASS=true
_SUMMARY=""

# Per-check state (plain variables for subshell/bats compatibility)
_CHECK_PASS_lint=true
_CHECK_PASS_typecheck=true
_CHECK_PASS_bundle=true
_CHECK_PASS_test=true
_CHECK_PASS_native_deps=true

_CHECK_ERRORS_lint=""
_CHECK_ERRORS_typecheck=""
_CHECK_ERRORS_bundle=""
_CHECK_ERRORS_test=""
_CHECK_ERRORS_native_deps=""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_progress() {
  echo "$@" >&2
}

_record_failure() {
  local check="$1"
  local errors="$2"
  local label="$3"

  _PASS=false
  eval "_CHECK_PASS_${check}=false"
  eval "_CHECK_ERRORS_${check}=\$errors"
  _SUMMARY="${_SUMMARY}
${label}:
${errors}"
}

# Accessor helpers for per-check state
_get_check_pass() { eval "echo \"\$_CHECK_PASS_${1}\""; }
_get_check_errors() { eval "echo \"\$_CHECK_ERRORS_${1}\""; }

_should_skip() {
  # In fail-fast mode, skip if any earlier check already failed
  [[ "$FAIL_FAST" == "true" && "$_PASS" == "false" ]]
}

# ---------------------------------------------------------------------------
# JSON output (no jq dependency — built with printf)
# ---------------------------------------------------------------------------
_json_escape() {
  local s="$1"
  # Escape backslashes, double quotes, and newlines
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\t'/\\t}"
  s="${s//$'\r'/}"
  printf '%s' "$s"
}

_emit_json() {
  local pass_bool="true"
  [[ "$_PASS" == "false" ]] && pass_bool="false"

  printf '{\n'
  printf '  "pass": %s,\n' "$pass_bool"
  printf '  "checks": {\n'

  local first=true
  for check in lint typecheck bundle test native_deps; do
    local cp
    cp=$(_get_check_pass "$check")
    local ce
    ce=$(_json_escape "$(_get_check_errors "$check")")

    if [[ "$first" == "true" ]]; then
      first=false
    else
      printf ',\n'
    fi
    printf '    "%s": {"pass": %s, "errors": "%s"}' "$check" "$cp" "$ce"
  done

  printf '\n  },\n'
  printf '  "summary": "%s"\n' "$(_json_escape "$_SUMMARY")"
  printf '}\n'
}

# ---------------------------------------------------------------------------
# Check functions (individually callable when sourced)
# ---------------------------------------------------------------------------

check_lint() {
  _progress "=== Lint ==="

  if [[ "$LINT_ONLY_CHANGED" == "true" ]]; then
    local changed_files
    changed_files=$(git diff --name-only origin/master...HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null | grep -v node_modules || true)

    if [[ -z "$changed_files" ]]; then
      _progress "No changed JS/TS files to lint"
      return
    fi

    _progress "Linting $(echo "$changed_files" | wc -l | tr -d ' ') changed files"
    local lint_out
    lint_out=$(echo "$changed_files" | xargs npx eslint --quiet 2>&1) || true
  else
    _progress "Linting all files"
    local lint_out
    lint_out=$(npx eslint . --quiet 2>&1) || true
  fi

  if echo "$lint_out" | grep -qE "error "; then
    _progress "Lint FAILED"
    local errors
    errors=$(echo "$lint_out" | grep -E "error " | head -10)
    _record_failure "lint" "$errors" "LINT ERRORS"
  else
    _progress "Lint passed"
  fi
}

check_typecheck() {
  _progress "=== Typecheck ==="

  local tc_out
  tc_out=$(pnpm typecheck 2>&1) || true

  if echo "$tc_out" | grep -qE "error TS"; then
    _progress "Typecheck FAILED"
    local errors
    errors=$(echo "$tc_out" | grep -E "error TS" | head -10)
    _record_failure "typecheck" "$errors" "TYPECHECK ERRORS"
  else
    _progress "Typecheck passed"
  fi
}

check_bundle() {
  _progress "=== Metro Bundle ==="

  if _should_skip; then
    _progress "Skipping (earlier check failed with --fail-fast)"
    return
  fi

  local bundle_out
  bundle_out=$(npx react-native bundle \
    --platform ios \
    --dev false \
    --entry-file index.js \
    --bundle-output /tmp/bundle.js 2>&1) || true

  if echo "$bundle_out" | grep -qiE "error|unable to resolve"; then
    _progress "Metro Bundle FAILED"
    local errors
    errors=$(echo "$bundle_out" | grep -iE "error|unable to resolve" | head -5)
    _record_failure "bundle" "$errors" "BUNDLE ERRORS"
  else
    _progress "Metro Bundle passed"
  fi
}

check_test() {
  _progress "=== Tests ==="

  if _should_skip; then
    _progress "Skipping (earlier check failed with --fail-fast)"
    return
  fi

  local test_out
  test_out=$(pnpm test 2>&1) || true

  if echo "$test_out" | grep -qE "FAIL "; then
    _progress "Tests FAILED"
    local errors
    errors=$(echo "$test_out" | grep -E "FAIL |● |Expected|Received" | grep -v "● Console" | head -20)
    _record_failure "test" "$errors" "TEST FAILURES"
  else
    _progress "Tests passed"
  fi
}

check_native_deps() {
  _progress "=== Native Dependency Check ==="

  if [[ "$SKIP_NATIVE" == "true" ]]; then
    _progress "Skipping (--skip-native)"
    return
  fi

  if _should_skip; then
    _progress "Skipping (earlier check failed with --fail-fast)"
    return
  fi

  local missing=""
  local pkg

  for pkg in $(node -e "
    const pkg = require('./package.json');
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    Object.keys(deps)
      .filter(d => d.startsWith('react-native-') || d.startsWith('@react-native-'))
      .forEach(d => console.log(d));
  "); do
    local pkg_dir="node_modules/$pkg"
    [[ ! -d "$pkg_dir" ]] && continue

    local has_native=false
    if ls "$pkg_dir"/*.podspec 1>/dev/null 2>&1 || [[ -d "$pkg_dir/ios" ]]; then
      has_native=true
    fi

    if [[ "$has_native" == "true" ]]; then
      if ! grep -q "node_modules/$pkg" ios/Podfile.lock 2>/dev/null; then
        missing="$missing $pkg"
      fi
    fi
  done

  if [[ -n "$missing" ]]; then
    _progress "Native Dependency Check FAILED"
    local native_errors=""
    local m
    for m in $missing; do
      native_errors="${native_errors}
UNLINKED: $m is in package.json with native iOS code but missing from ios/Podfile.lock"
    done
    _record_failure "native_deps" "$native_errors" "NATIVE DEP ERRORS"
  else
    _progress "Native Dependency Check passed"
  fi
}

# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
_run_all_checks() {
  check_lint
  check_typecheck
  check_bundle
  check_test
  check_native_deps

  _emit_json

  if [[ "$_PASS" == "true" ]]; then
    exit 0
  else
    exit 1
  fi
}

# Only run when executed directly (not sourced)
if [[ "$_VERIFY_CHECKS_SOURCED" == "false" ]]; then
  _run_all_checks
fi
