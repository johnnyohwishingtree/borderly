#!/usr/bin/env bash
# Backward-compatibility shim — delegates to TypeScript pipeline CLI.
#
# This file exists so that workflows on master (which set BASH_ENV=lib.sh)
# can still work when checking out PR branches that have migrated to TS.
# Safe to delete once all workflows on master use the TS CLI directly.

PIPELINE_CLI=".github/scripts/lib/cli/pipeline.ts"

_ensure_pipeline_ts() {
  if [ ! -d ".github/scripts/node_modules" ]; then
    echo "Installing pipeline TS dependencies..."
    (cd .github/scripts && pnpm install --frozen-lockfile 2>/dev/null || pnpm install --no-frozen-lockfile) >/dev/null 2>&1
  fi
}

_pipeline() {
  _ensure_pipeline_ts
  npx tsx "$PIPELINE_CLI" "$@"
}

# ─── Git operations (pure bash — no TS dependency needed) ───────────────

setup_git_auth() {
  local token="${GH_TOKEN:-$GH_PAT}"
  local repo="${GITHUB_REPOSITORY}"
  git remote set-url origin "https://x-access-token:${token}@github.com/${repo}.git"
  git config user.name "${GIT_USER_NAME:-Claude CI}"
  git config user.email "${GIT_USER_EMAIL:-claude-ci@users.noreply.github.com}"
}

merge_master_into_branch() {
  git fetch origin master
  if ! git merge origin/master --no-edit; then
    echo "::warning::Merge conflict with master"
    git merge --abort 2>/dev/null || true
    echo "MERGE_CONFLICT=true" >> "${GITHUB_ENV:-/dev/null}"
    return 1
  fi
}

check_changes_and_commit() {
  local message="$1"
  local co_author="${2:-Claude <noreply@anthropic.com>}"

  local changes
  changes=$(git status --porcelain | grep -v '^?? output.txt$' || true)
  if [ -z "$changes" ]; then
    echo "No uncommitted changes"
    return 1
  fi

  git add -u
  local staged
  staged=$(git diff --cached --name-only)
  if [ -z "$staged" ]; then
    echo "No staged changes after filtering"
    return 1
  fi

  git commit -m "${message}

Co-authored-by: ${co_author}"
}

smart_push() {
  local branch="$1"
  local pre_push_head="${2:-}"

  git fetch origin "$branch" 2>/dev/null || true
  local local_head
  local_head=$(git rev-parse HEAD)
  local remote_head
  remote_head=$(git rev-parse "origin/$branch" 2>/dev/null || echo "none")

  if [ -n "$pre_push_head" ]; then
    if [ "$local_head" = "$pre_push_head" ] && [ "$remote_head" = "$pre_push_head" ]; then
      echo "No changes produced (local and remote unchanged)"
      return 0
    fi
  fi

  if [ "$local_head" = "$remote_head" ]; then
    echo "Local HEAD matches remote — nothing to push"
    return 0
  fi

  git pull --rebase origin "$branch" 2>/dev/null || true
  git push origin "HEAD:refs/heads/$branch"
  echo "Pushed to $branch"
}

# ─── GitHub API operations (delegate to TS CLI) ────────────────────────

comment_on_issue() {
  _pipeline comment "$@"
}

dispatch_workflow() {
  _pipeline dispatch "$@"
}

approve_and_merge() {
  _pipeline approve-and-merge "$@"
}

get_pr_number() {
  _pipeline get-pr-number "$@"
}

count_approvals() {
  _pipeline count-approvals "$@"
}

count_unresolved_threads() {
  _pipeline count-unresolved-threads "$@"
}

resolve_all_threads() {
  _pipeline resolve-all-threads "$@"
}

check_ci_status() {
  _pipeline check-ci-status "$@"
}

is_workflow_active() {
  _pipeline is-workflow-active "$@"
}

count_critical_comments() {
  _pipeline count-critical-comments "$@"
}

get_next_pending_story() {
  _pipeline get-next-pending-story "$@"
}

trigger_story_agent() {
  _pipeline trigger-story-agent "$@"
}

# parse_repo is only used internally by the old lib.sh — not needed in shim
parse_repo() {
  echo "${1:-$GITHUB_REPOSITORY}"
}

# count_fix_attempts is only used via state machine now
count_fix_attempts() {
  echo "0"
}
