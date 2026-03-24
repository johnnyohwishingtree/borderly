#!/bin/bash
# Pre-Bash hook: enforces commit gate before any git commit.
# Runs lint, typecheck, and test. Blocks the commit if any fail.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
  COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"$//')
fi

# Only intercept commands containing "git commit"
case "$COMMAND" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"Running commit gate: lint + typecheck + test..."}}'

# Run all three checks
cd "$PROJECT_ROOT"

LINT_OUT=$(pnpm lint 2>&1)
LINT_EXIT=$?

TYPE_OUT=$(pnpm typecheck 2>&1)
TYPE_EXIT=$?

TEST_OUT=$(pnpm test 2>&1)
TEST_EXIT=$?

if [ $LINT_EXIT -ne 0 ] || [ $TYPE_EXIT -ne 0 ] || [ $TEST_EXIT -ne 0 ]; then
  ERRORS=""
  if [ $LINT_EXIT -ne 0 ]; then
    ERRORS="$ERRORS\n--- LINT FAILED ---\n$(echo "$LINT_OUT" | tail -20)\n"
  fi
  if [ $TYPE_EXIT -ne 0 ]; then
    ERRORS="$ERRORS\n--- TYPECHECK FAILED ---\n$(echo "$TYPE_OUT" | grep -E '^(src/|__tests__/|e2e/)' | head -20)\n"
  fi
  if [ $TEST_EXIT -ne 0 ]; then
    ERRORS="$ERRORS\n--- TESTS FAILED ---\n$(echo "$TEST_OUT" | grep -E '(FAIL|Error|✕)' | head -20)\n"
  fi

  echo -e "{\"continue\":false,\"stopReason\":\"Commit gate failed. Fix errors before committing:\n$ERRORS\"}"
  exit 0
fi

exit 0
