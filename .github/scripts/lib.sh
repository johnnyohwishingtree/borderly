#!/bin/bash
set -euo pipefail

# ============================================================================
# lib.sh — Shared shell library for GitHub Actions workflows
#
# Source this file in workflow steps:
#   source .github/scripts/lib.sh
#
# All functions use $GH_TOKEN from env for GitHub API calls.
# Functions return exit codes; callers decide what to do with failures.
# ============================================================================

# Guard: prevent execution when sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "This script is meant to be sourced, not executed directly."
  echo "Usage: source .github/scripts/lib.sh"
  exit 1
fi

# ────────────────────────────────────────────────────────────────────────────
# setup_git_auth
#
# Configure git remote URL with token and set user.name/email.
#
# Env:
#   GH_TOKEN            — GitHub token (required)
#   GITHUB_REPOSITORY   — owner/repo (required)
#   GIT_USER_NAME       — git user.name (optional, default: "Claude CI")
#   GIT_USER_EMAIL      — git user.email (optional, default: "claude-ci@users.noreply.github.com")
#
# Usage:
#   setup_git_auth
#   GIT_USER_NAME="Pipeline Doctor" GIT_USER_EMAIL="doctor@noreply" setup_git_auth
# ────────────────────────────────────────────────────────────────────────────
setup_git_auth() {
  local token="${GH_TOKEN:?GH_TOKEN is required}"
  local repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
  local user_name="${GIT_USER_NAME:-Claude CI}"
  local user_email="${GIT_USER_EMAIL:-claude-ci@users.noreply.github.com}"

  git remote set-url origin "https://x-access-token:${token}@github.com/${repo}.git"
  git config user.name "$user_name"
  git config user.email "$user_email"
}

# ────────────────────────────────────────────────────────────────────────────
# parse_repo
#
# Split GITHUB_REPOSITORY into REPO_OWNER and REPO_NAME.
# Sets global variables REPO_OWNER and REPO_NAME.
#
# Env:
#   GITHUB_REPOSITORY   — owner/repo (required)
#
# Usage:
#   parse_repo
#   echo "$REPO_OWNER"  # => "johnnyhuang"
#   echo "$REPO_NAME"   # => "borderly"
# ────────────────────────────────────────────────────────────────────────────
parse_repo() {
  local repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
  REPO_OWNER=$(echo "$repo" | cut -d/ -f1)
  REPO_NAME=$(echo "$repo" | cut -d/ -f2)
}

# ────────────────────────────────────────────────────────────────────────────
# get_pr_number
#
# Resolve PR number from various GitHub event contexts.
#
# Args:
#   $1 — event name (e.g., "workflow_dispatch", "workflow_run", "pull_request",
#         "pull_request_review", "issue_comment")
#
# Env:
#   GH_TOKEN                — GitHub token (required for workflow_run lookup)
#   GITHUB_REPOSITORY       — owner/repo (required)
#   INPUT_PR_NUMBER         — PR number from workflow_dispatch inputs (optional)
#   WORKFLOW_RUN_HEAD_BRANCH — head branch from workflow_run event (optional)
#   PR_NUMBER_FROM_EVENT    — PR number from pull_request/pull_request_review/issue_comment (optional)
#
# Returns:
#   Prints PR number to stdout, or empty string if not found.
#
# Usage:
#   PR_NUM=$(get_pr_number "workflow_dispatch")
#   PR_NUM=$(INPUT_PR_NUMBER="42" get_pr_number "workflow_dispatch")
# ────────────────────────────────────────────────────────────────────────────
get_pr_number() {
  local event_name="${1:?event_name is required}"
  local repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
  local pr_num=""

  case "$event_name" in
    workflow_dispatch)
      pr_num="${INPUT_PR_NUMBER:-}"
      ;;
    workflow_run)
      local branch="${WORKFLOW_RUN_HEAD_BRANCH:-}"
      if [ -n "$branch" ]; then
        pr_num=$(gh pr list --repo "$repo" --head "$branch" --state open \
          --json number -q '.[0].number' 2>/dev/null || echo "")
      fi
      ;;
    pull_request|pull_request_review|issue_comment)
      pr_num="${PR_NUMBER_FROM_EVENT:-}"
      ;;
  esac

  echo "$pr_num"
}

# ────────────────────────────────────────────────────────────────────────────
# check_ci_status
#
# Query check-runs API and return structured pass/fail for Tests and E2E.
#
# Args:
#   $1 — HEAD SHA to check
#   $2 — repo (owner/repo format)
#
# Outputs (printed to stdout, one per line):
#   TESTS_PASS=true|false
#   E2E_PASS=true|false
#
# Env:
#   GH_TOKEN — GitHub token (required)
#
# Usage:
#   eval "$(check_ci_status "$SHA" "$REPO")"
#   echo "Tests: $TESTS_PASS, E2E: $E2E_PASS"
# ────────────────────────────────────────────────────────────────────────────
check_ci_status() {
  local sha="${1:?SHA is required}"
  local repo="${2:?repo is required}"

  local check_runs
  check_runs=$(gh api "repos/$repo/commits/$sha/check-runs" \
    --jq '.check_runs[] | "\(.name)|\(.conclusion)|\(.status)"' 2>/dev/null || echo "")

  local tests_pass=false
  if echo "$check_runs" | grep -q "^test|success|"; then
    tests_pass=true
  fi

  local e2e_pass=false
  local e2e_chromium e2e_perf e2e_cross
  e2e_chromium=$(echo "$check_runs" | grep "^test-chromium|success|" || true)
  e2e_perf=$(echo "$check_runs" | grep "^test-performance|success|" || true)
  e2e_cross=$(echo "$check_runs" | grep "^test-cross-browser|success|" || true)

  if [ -n "$e2e_chromium" ] && [ -n "$e2e_perf" ] && [ -n "$e2e_cross" ]; then
    e2e_pass=true
  fi

  echo "TESTS_PASS=$tests_pass"
  echo "E2E_PASS=$e2e_pass"
}

# ────────────────────────────────────────────────────────────────────────────
# count_unresolved_threads
#
# GraphQL query for unresolved review threads on a PR.
#
# Args:
#   $1 — PR number
#   $2 — repo (owner/repo format)
#
# Env:
#   GH_TOKEN — GitHub token (required)
#
# Returns:
#   Prints count of unresolved threads to stdout.
#
# Usage:
#   UNRESOLVED=$(count_unresolved_threads 42 "owner/repo")
# ────────────────────────────────────────────────────────────────────────────
count_unresolved_threads() {
  local pr_num="${1:?PR number is required}"
  local repo="${2:?repo is required}"
  local owner name

  owner=$(echo "$repo" | cut -d/ -f1)
  name=$(echo "$repo" | cut -d/ -f2)

  gh api graphql -f query="
    query {
      repository(owner: \"$owner\", name: \"$name\") {
        pullRequest(number: $pr_num) {
          reviewThreads(first: 100) {
            nodes { isResolved }
          }
        }
      }
    }
  " --jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)] | length' 2>/dev/null || echo "0"
}

# ────────────────────────────────────────────────────────────────────────────
# resolve_all_threads
#
# Resolve all unresolved review threads on a PR.
#
# Args:
#   $1 — PR number
#   $2 — repo (owner/repo format)
#
# Env:
#   GH_TOKEN — GitHub token (required)
#
# Returns:
#   0 on success (or if no threads to resolve), non-zero on failure.
#
# Usage:
#   resolve_all_threads 42 "owner/repo"
# ────────────────────────────────────────────────────────────────────────────
resolve_all_threads() {
  local pr_num="${1:?PR number is required}"
  local repo="${2:?repo is required}"
  local owner name thread_ids

  owner=$(echo "$repo" | cut -d/ -f1)
  name=$(echo "$repo" | cut -d/ -f2)

  thread_ids=$(gh api graphql -f query="
    query {
      repository(owner: \"$owner\", name: \"$name\") {
        pullRequest(number: $pr_num) {
          reviewThreads(first: 100) {
            nodes { id isResolved }
          }
        }
      }
    }
  " --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | .id' 2>/dev/null || echo "")

  if [ -z "$thread_ids" ]; then
    echo "No unresolved review threads"
    return 0
  fi

  echo "$thread_ids" | while read -r tid; do
    if [ -n "$tid" ]; then
      gh api graphql -f query="
        mutation {
          resolveReviewThread(input: {threadId: \"$tid\"}) {
            thread { isResolved }
          }
        }
      " 2>/dev/null && echo "Resolved thread $tid" || echo "Failed to resolve $tid"
    fi
  done
}

# ────────────────────────────────────────────────────────────────────────────
# count_approvals
#
# Count PR approvals.
#
# Args:
#   $1 — PR number
#   $2 — repo (owner/repo format)
#
# Env:
#   GH_TOKEN — GitHub token (required)
#
# Returns:
#   Prints approval count to stdout.
#
# Usage:
#   APPROVALS=$(count_approvals 42 "owner/repo")
# ────────────────────────────────────────────────────────────────────────────
count_approvals() {
  local pr_num="${1:?PR number is required}"
  local repo="${2:?repo is required}"

  gh pr view "$pr_num" --repo "$repo" --json reviews \
    -q '[.reviews[] | select(.state == "APPROVED")] | length' 2>/dev/null || echo "0"
}

# ────────────────────────────────────────────────────────────────────────────
# merge_master_into_branch
#
# Fetch and merge master into the current branch. Handles conflicts.
#
# Returns:
#   0 on success (clean merge)
#   1 on conflict (merge aborted, MERGE_CONFLICT=true exported to env)
#
# Note:
#   Requires git user.name/email to be configured (use setup_git_auth first).
#   Writes MERGE_CONFLICT=true to $GITHUB_ENV if available, or exports it.
#
# Usage:
#   if ! merge_master_into_branch; then
#     echo "Merge conflict detected"
#   fi
# ────────────────────────────────────────────────────────────────────────────
merge_master_into_branch() {
  git fetch origin master

  if git merge origin/master --no-edit; then
    return 0
  else
    echo "::warning::Merge conflict with master"
    git merge --abort

    # Export MERGE_CONFLICT for downstream steps
    if [ -n "${GITHUB_ENV:-}" ]; then
      echo "MERGE_CONFLICT=true" >> "$GITHUB_ENV"
    fi
    export MERGE_CONFLICT=true

    return 1
  fi
}

# ────────────────────────────────────────────────────────────────────────────
# check_changes_and_commit
#
# Check for uncommitted changes and commit with standard format.
# Excludes output.txt from change detection (claude-code-action artifact).
#
# Args:
#   $1 — commit message (required)
#   $2 — co-author string (optional, default: "Claude <noreply@anthropic.com>")
#
# Returns:
#   0 if a commit was created
#   1 if nothing to commit
#
# Usage:
#   check_changes_and_commit "fix: resolve lint errors"
#   check_changes_and_commit "fix: resolve review feedback" "Gemini <noreply@google.com>"
# ────────────────────────────────────────────────────────────────────────────
check_changes_and_commit() {
  local message="${1:?commit message is required}"
  local co_author="${2:-Claude <noreply@anthropic.com>}"

  local changes
  changes=$(git status --porcelain | grep -v '^?? output.txt$' || true)

  if [ -z "$changes" ]; then
    echo "No uncommitted changes"
    return 1
  fi

  git add -u

  if [ -z "$(git diff --cached --name-only)" ]; then
    echo "No staged changes after filtering"
    return 1
  fi

  git commit -m "$(cat <<EOF
${message}

Co-authored-by: ${co_author}
EOF
  )"

  return 0
}

# ────────────────────────────────────────────────────────────────────────────
# smart_push
#
# Push to remote with local/remote HEAD comparison.
# Handles: already pushed (skip), ahead (push), behind (pull --rebase then push).
#
# Args:
#   $1 — branch name (required)
#   $2 — pre-push HEAD SHA (optional, for "no changes" detection)
#
# Returns:
#   0 on success or if nothing to push
#   1 on push failure
#
# Usage:
#   smart_push "my-branch"
#   smart_push "my-branch" "$PRE_FIX_HEAD"
# ────────────────────────────────────────────────────────────────────────────
smart_push() {
  local branch="${1:?branch name is required}"
  local pre_push_head="${2:-}"

  git fetch origin "$branch" 2>/dev/null || true

  local local_head remote_head
  local_head=$(git rev-parse HEAD)
  remote_head=$(git rev-parse "origin/$branch" 2>/dev/null || echo "none")

  # If a pre-push HEAD was provided, check if anything actually changed
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

  # Rebase local work on top of anything already pushed
  git pull --rebase origin "$branch" 2>/dev/null || true
  git push origin "HEAD:refs/heads/$branch"
  echo "Pushed to $branch"
}

# ────────────────────────────────────────────────────────────────────────────
# comment_on_issue
#
# Post a formatted comment on an issue or PR.
# Silently fails if posting fails.
#
# Args:
#   $1 — issue or PR number (required)
#   $2 — comment body text (required)
#   $3 — repo (optional, defaults to GITHUB_REPOSITORY)
#
# Env:
#   GH_TOKEN            — GitHub token (required)
#   GITHUB_REPOSITORY   — owner/repo (used as default for $3)
#
# Usage:
#   comment_on_issue 42 "Build passed"
#   comment_on_issue 42 "Build passed" "owner/repo"
# ────────────────────────────────────────────────────────────────────────────
comment_on_issue() {
  local issue_num="${1:?issue number is required}"
  local body="${2:?body text is required}"
  local repo="${3:-${GITHUB_REPOSITORY:-}}"

  if [ -z "$repo" ]; then
    echo "Error: repo not specified and GITHUB_REPOSITORY not set"
    return 1
  fi

  gh issue comment "$issue_num" --repo "$repo" --body "$body" 2>/dev/null || true
}

# ────────────────────────────────────────────────────────────────────────────
# count_fix_attempts
#
# Count previous fix attempts by searching comments on an issue or PR.
#
# Args:
#   $1 — issue or PR number (required)
#   $2 — search pattern (grep -c pattern) (required)
#   $3 — repo (owner/repo format) (required)
#
# Env:
#   GH_TOKEN — GitHub token (required)
#
# Returns:
#   Prints count to stdout.
#
# Usage:
#   COUNT=$(count_fix_attempts 42 "@claude.*failing" "owner/repo")
# ────────────────────────────────────────────────────────────────────────────
count_fix_attempts() {
  local issue_num="${1:?issue number is required}"
  local pattern="${2:?search pattern is required}"
  local repo="${3:?repo is required}"

  gh api "repos/$repo/issues/$issue_num/comments" \
    --jq "[.[] | select(.body | test(\"$pattern\"))] | length" 2>/dev/null || echo "0"
}

# ────────────────────────────────────────────────────────────────────────────
# is_workflow_active
#
# Check if a workflow is currently running for an issue.
# Searches both in_progress and queued runs, matching by issue number
# in the displayTitle.
#
# Args:
#   $1 — workflow filename (e.g., "verify-merge.yml") (required)
#   $2 — issue number (required)
#   $3 — repo (owner/repo format) (required)
#
# Env:
#   GH_TOKEN — GitHub token (required)
#
# Returns:
#   0 if active (in_progress or queued)
#   1 if not active
#
# Usage:
#   if is_workflow_active "verify-merge.yml" 42 "owner/repo"; then
#     echo "Already running"
#   fi
# ────────────────────────────────────────────────────────────────────────────
is_workflow_active() {
  local workflow="${1:?workflow name is required}"
  local issue_num="${2:?issue number is required}"
  local repo="${3:?repo is required}"

  local active queued total

  active=$(gh run list --repo "$repo" --workflow "$workflow" \
    --status in_progress --json displayTitle \
    -q "[.[] | select(.displayTitle | contains(\"#${issue_num}\"))] | length" 2>/dev/null || echo "0")

  queued=$(gh run list --repo "$repo" --workflow "$workflow" \
    --status queued --json displayTitle \
    -q "[.[] | select(.displayTitle | contains(\"#${issue_num}\"))] | length" 2>/dev/null || echo "0")

  total=$((active + queued))

  if [ "$total" -gt 0 ]; then
    return 0
  else
    return 1
  fi
}

# ────────────────────────────────────────────────────────────────────────────
# dispatch_workflow
#
# Trigger a workflow_dispatch event.
#
# Args:
#   $1 — workflow file (e.g., "verify-merge.yml") (required)
#   Remaining args — passed directly to `gh workflow run` (e.g., -f key=value)
#
# If --ref is not specified in the remaining args, defaults to "master".
#
# Env:
#   GH_TOKEN            — GitHub token (required)
#   GITHUB_REPOSITORY   — owner/repo (required)
#
# Usage:
#   dispatch_workflow "verify-merge.yml" \
#     -f tmp_branch="tmp/claude-123" \
#     -f target_branch="claude/issue-42" \
#     -f issue_number="42" \
#     -f attempt="1"
#
#   dispatch_workflow "pipeline-doctor.yml" \
#     --ref "some-branch" \
#     -f issue_number="42"
# ────────────────────────────────────────────────────────────────────────────
dispatch_workflow() {
  local workflow="${1:?workflow file is required}"
  shift
  local repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"

  # Check if --ref was provided in remaining args
  local has_ref=false
  for arg in "$@"; do
    if [ "$arg" = "--ref" ]; then
      has_ref=true
      break
    fi
  done

  if [ "$has_ref" = "true" ]; then
    gh workflow run "$workflow" --repo "$repo" "$@"
  else
    gh workflow run "$workflow" --repo "$repo" --ref master "$@"
  fi
}
