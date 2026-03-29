#!/bin/bash
# PostToolUse hook: silently track changed files in dirty-files.
# MUST produce zero stdout — any output costs tokens in main context.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DIRTY_FILE="$PROJECT_DIR/.claude/dirty-files"

# Read hook input from stdin
INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty')

# Skip if we can't parse
[ -z "$TOOL_NAME" ] && exit 0

collect_paths() {
  local paths=()

  case "$TOOL_NAME" in
    Edit|Write)
      local fp
      fp=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
      [ -n "$fp" ] && paths+=("$fp")
      ;;
    Bash)
      local cmd
      cmd=$(echo "$TOOL_INPUT" | jq -r '.command // empty')
      [ -z "$cmd" ] && exit 0

      # Skip read-only commands — no files changed
      local readonly_prefixes=(
        "ls" "cat" "head" "tail" "less" "more" "wc"
        "grep" "rg" "find" "which" "where" "file" "stat"
        "git status" "git log" "git diff" "git show" "git branch"
        "git remote" "git fetch" "git stash list" "git tag"
        "npm " "npx " "pnpm " "yarn " "node " "python " "ruby "
        "echo" "printf" "pwd" "env" "export" "set " "type "
        "cd " "pushd" "popd" "test " "[" "mkdir"
      )
      for prefix in "${readonly_prefixes[@]}"; do
        if [[ "$cmd" == "$prefix"* ]]; then
          exit 0
        fi
      done

      # Extract file paths from destructive commands (rm, mv, git rm, git mv)
      # Only look at tokens before shell operators
      local tokens
      tokens=$(echo "$cmd" | sed 's/[;&|><].*//')
      local first_word
      first_word=$(echo "$tokens" | awk '{print $1}')

      case "$first_word" in
        rm|unlink)
          for token in $tokens; do
            [[ "$token" == rm || "$token" == unlink || "$token" == -* ]] && continue
            paths+=("$token")
          done
          ;;
        mv)
          # Last arg is destination, rest are sources (skip flags)
          local args=()
          for token in $tokens; do
            [[ "$token" == mv || "$token" == -* ]] && continue
            args+=("$token")
          done
          # All args are relevant (source moved, dest created)
          for arg in "${args[@]}"; do
            paths+=("$arg")
          done
          ;;
        git)
          local subcmd
          subcmd=$(echo "$tokens" | awk '{print $2}')
          case "$subcmd" in
            rm|mv)
              for token in $tokens; do
                [[ "$token" == git || "$token" == "$subcmd" || "$token" == -* ]] && continue
                paths+=("$token")
              done
              ;;
          esac
          ;;
      esac
      ;;
  esac

  # Track all project files EXCEPT the ones the knowledge-sync agent writes to.
  # The exclusion list prevents feedback loops (agent edits file → hook tracks it → agent re-triggers).
  # Everything the agent does NOT write to is safe to track.
  for p in "${paths[@]}"; do
    # Resolve to absolute path if relative
    [[ "$p" != /* ]] && p="$PROJECT_DIR/$p"

    # Must be inside project
    [[ "$p" != "$PROJECT_DIR/"* ]] && continue

    # Get relative path
    local rel="${p#$PROJECT_DIR/}"

    # EXCLUDE: paths the knowledge-sync agent writes to (prevents loops)
    [[ "$rel" == .knowledge/* ]] && continue
    [[ "$rel" == tmp/* ]] && continue
    [[ "$rel" == .claude/* ]] && continue

    # EXCLUDE: CLAUDE.md files (folder guardrails, not source)
    [[ "$(basename "$p")" == "CLAUDE.md" ]] && continue

    # EXCLUDE: generated/vendored dirs (not meaningful changes)
    [[ "$rel" == node_modules/* ]] && continue
    [[ "$rel" == ios/Pods/* ]] && continue
    [[ "$rel" == android/build/* ]] && continue

    # Deduplicate: only add if not already in dirty-files
    if [ -f "$DIRTY_FILE" ]; then
      grep -qxF "$rel" "$DIRTY_FILE" 2>/dev/null && continue
    fi

    echo "$rel" >> "$DIRTY_FILE"
  done
}

collect_paths

# CRITICAL: produce zero stdout so this costs zero tokens
exit 0
