#!/bin/bash
# Post-edit typecheck hook: runs pnpm typecheck after .ts/.tsx file edits.
# Exits non-zero to block Claude from continuing if typecheck fails.

# Parse the file path from the tool input (JSON on stdin)
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // empty' 2>/dev/null)

# Fallback if jq is not available
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"$//')
fi

# Only run for TypeScript files
case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

# Skip test snapshots and generated files
case "$FILE_PATH" in
  *__snapshots__*|*.snap|*/dist/*|*/node_modules/*) exit 0 ;;
esac

# Find the project root (nearest directory with tsconfig.json)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Run typecheck from project root
OUTPUT=$(cd "$PROJECT_ROOT" && pnpm typecheck 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "TYPECHECK FAILED after editing $FILE_PATH"
  echo "Fix these errors before continuing:"
  echo ""
  echo "$OUTPUT" | grep -E "^(src/|__tests__/|e2e/)" | head -30
  echo ""
  echo "Run 'pnpm typecheck' for full output."
  exit 1
fi

exit 0
