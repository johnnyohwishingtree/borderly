#!/bin/bash
# Post-edit typecheck hook: runs pnpm typecheck after .ts/.tsx file edits.
# Exits non-zero to block Claude from continuing if typecheck fails.

# Parse the file path from the tool input (JSON on stdin)
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"$//')

# Only run for TypeScript files
case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

# Skip test snapshots and generated files
case "$FILE_PATH" in
  *__snapshots__*|*.snap|*/dist/*|*/node_modules/*) exit 0 ;;
esac

# Run typecheck, capture output
OUTPUT=$(cd /Users/johnnyhuang/personal/borderly && pnpm typecheck 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  # Show only errors (not the pnpm wrapper lines)
  echo "TYPECHECK FAILED after editing $FILE_PATH"
  echo "Fix these errors before continuing:"
  echo ""
  echo "$OUTPUT" | grep -E "^(src/|__tests__/|e2e/)" | head -30
  echo ""
  echo "Run 'pnpm typecheck' for full output."
  exit 1
fi

exit 0
