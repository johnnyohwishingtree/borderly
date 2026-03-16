#!/bin/bash
# Shared test helpers for pipeline script tests
# Source this from each .bats file: load 'test-helper'

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOCK_DIR=""

# Create a temp directory for mock binaries
setup_mocks() {
  MOCK_DIR="$(mktemp -d)"
  export PATH="$MOCK_DIR:$PATH"
  export GH_TOKEN="test-token-fake"
  export GITHUB_REPOSITORY="testowner/testrepo"
}

# Clean up mock directory
teardown_mocks() {
  if [ -n "$MOCK_DIR" ] && [ -d "$MOCK_DIR" ]; then
    rm -rf "$MOCK_DIR"
  fi
}

# Create a mock `gh` that returns canned responses based on arguments
# Usage: mock_gh_response "pattern" "response"
# The mock checks if the full argument string contains "pattern"
mock_gh_response() {
  local pattern="$1"
  local response="$2"

  # Append to the mock script (creates it on first call)
  if [ ! -f "$MOCK_DIR/gh" ]; then
    cat > "$MOCK_DIR/gh" <<'HEADER'
#!/bin/bash
ARGS="$*"
HEADER
    chmod +x "$MOCK_DIR/gh"
  fi

  # Remove the final fallback before appending
  sed -i.bak '/^echo ""$/d' "$MOCK_DIR/gh" 2>/dev/null || true
  rm -f "$MOCK_DIR/gh.bak"

  cat >> "$MOCK_DIR/gh" <<RULE
if echo "\$ARGS" | grep -q '${pattern}'; then
  echo '${response}'
  exit 0
fi
RULE

  # Add fallback at the end
  echo 'echo ""' >> "$MOCK_DIR/gh"
}

# Create a mock `gh` that fails for a pattern
mock_gh_failure() {
  local pattern="$1"
  local error_msg="${2:-mock gh failure}"

  if [ ! -f "$MOCK_DIR/gh" ]; then
    cat > "$MOCK_DIR/gh" <<'HEADER'
#!/bin/bash
ARGS="$*"
HEADER
    chmod +x "$MOCK_DIR/gh"
  fi

  sed -i.bak '/^echo ""$/d' "$MOCK_DIR/gh" 2>/dev/null || true
  rm -f "$MOCK_DIR/gh.bak"

  cat >> "$MOCK_DIR/gh" <<RULE
if echo "\$ARGS" | grep -q '${pattern}'; then
  echo '${error_msg}' >&2
  exit 1
fi
RULE

  echo 'echo ""' >> "$MOCK_DIR/gh"
}

# Assert that output contains a substring
assert_contains() {
  local haystack="$1"
  local needle="$2"
  if ! echo "$haystack" | grep -q "$needle"; then
    echo "Expected output to contain: $needle"
    echo "Got: $haystack"
    return 1
  fi
}

# Assert JSON field value (requires jq)
assert_json() {
  local json="$1"
  local path="$2"
  local expected="$3"
  local actual
  actual=$(echo "$json" | jq -r "$path" 2>/dev/null)
  if [ "$actual" != "$expected" ]; then
    echo "Expected $path = $expected"
    echo "Got: $actual"
    echo "Full JSON: $json"
    return 1
  fi
}
