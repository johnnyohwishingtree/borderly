#!/bin/bash
# Pre-Bash hook: blocks "git add -A" and "git add ." to prevent blanket staging.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
  COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"$//')
fi

# Block "git add -A" and "git add ."
if echo "$COMMAND" | grep -qE 'git add (-A|--all|\.)'; then
  echo '{"continue":false,"stopReason":"Use specific file paths instead of git add -A or git add . — always add files by name."}'
  exit 0
fi

exit 0
