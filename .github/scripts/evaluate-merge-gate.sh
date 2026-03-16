#!/usr/bin/env bash
#
# evaluate-merge-gate.sh — Evaluate whether a PR is ready to merge.
#
# Usage: ./evaluate-merge-gate.sh <pr_number>
#
# Environment:
#   GH_TOKEN           - GitHub token for API calls
#   GITHUB_REPOSITORY  - owner/repo
#
# Output (stdout): JSON
# {
#   "ready": true/false,
#   "pr_number": 42,
#   "conditions": {
#     "tests_pass": true,
#     "e2e_pass": true,
#     "approved": true,
#     "threads_resolved": true,
#     "branch_up_to_date": true
#   },
#   "details": {
#     "approval_count": 1,
#     "unresolved_threads": 0,
#     "merge_state": "CLEAN",
#     "head_sha": "abc123",
#     "base_ref": "master"
#   },
#   "action": "merge" | "update_branch" | "wait" | "skip"
# }
#
# Exit code: 0 always (decision is in the JSON output)

# Guard: allow sourcing for unit testing individual functions.
# When sourced, _EVALUATE_MERGE_GATE_SOURCED is set and main() is not called.
_EVALUATE_MERGE_GATE_SOURCED="${_EVALUATE_MERGE_GATE_SOURCED:-}"

set -euo pipefail

REPO="${GITHUB_REPOSITORY:-}"

# ── Condition 1: Tests passed ──
# Checks the check-runs API for a "test" job with conclusion "success".
check_tests_passed() {
  local check_runs="$1"
  if echo "$check_runs" | grep -q "^test|success|"; then
    echo "true"
  else
    echo "false"
  fi
}

# ── Condition 2: E2E passed (all 3 jobs) ──
# Requires test-chromium, test-performance, and test-cross-browser all with "success".
check_e2e_passed() {
  local check_runs="$1"
  local chromium perf cross

  chromium=$(echo "$check_runs" | grep "^test-chromium|success|" || true)
  perf=$(echo "$check_runs" | grep "^test-performance|success|" || true)
  cross=$(echo "$check_runs" | grep "^test-cross-browser|success|" || true)

  if [ -n "$chromium" ] && [ -n "$perf" ] && [ -n "$cross" ]; then
    echo "true"
  else
    echo "false"
  fi
}

# ── Condition 3: PR approved ──
# Returns "true" if there is at least one APPROVED review. Also outputs the count.
# Usage: result=$(check_approved <pr_number>)
#   echo "$result" | cut -d'|' -f1  # "true" or "false"
#   echo "$result" | cut -d'|' -f2  # approval count
check_approved() {
  local pr_number="$1"
  local count

  count=$(gh pr view "$pr_number" --repo "$REPO" --json reviews \
    -q '[.reviews[] | select(.state == "APPROVED")] | length' 2>/dev/null || echo "0")

  if [ "$count" -gt 0 ]; then
    echo "true|$count"
  else
    echo "false|$count"
  fi
}

# ── Condition 4: No unresolved review threads ──
# Uses GraphQL to count unresolved threads. Returns "true|<count>" or "false|<count>".
check_threads_resolved() {
  local pr_number="$1"
  local owner name unresolved

  owner=$(echo "$REPO" | cut -d/ -f1)
  name=$(echo "$REPO" | cut -d/ -f2)

  unresolved=$(gh api graphql -f query="
    query {
      repository(owner: \"$owner\", name: \"$name\") {
        pullRequest(number: $pr_number) {
          reviewThreads(first: 100) {
            nodes { isResolved }
          }
        }
      }
    }
  " --jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)] | length' 2>/dev/null || echo "0")

  if [ "$unresolved" -eq 0 ]; then
    echo "true|$unresolved"
  else
    echo "false|$unresolved"
  fi
}

# ── Condition 5: No active review-fix runs ──
# Returns "true" if no review-fix.yml runs are in_progress or queued for this PR.
check_no_active_review_fix() {
  local pr_number="$1"
  local active_runs

  active_runs=$(gh run list --repo "$REPO" --workflow review-fix.yml \
    --json status,displayTitle \
    -q "[.[] | select(.status == \"in_progress\" or .status == \"queued\") | select(.displayTitle | contains(\"PR #${pr_number}\"))] | length" \
    2>/dev/null)

  # Fail-safe: if the gh command fails or returns non-numeric output,
  # assume a fix is active to prevent an incorrect merge.
  if [[ "$active_runs" =~ ^[0-9]+$ ]] && [ "$active_runs" -eq 0 ]; then
    echo "true"
  else
    echo "false"
  fi
}

# ── Condition 6: Branch up to date ──
# Checks mergeStateStatus via gh pr view. Returns the merge state string.
check_branch_status() {
  local pr_number="$1"
  local merge_state

  merge_state=$(gh pr view "$pr_number" --repo "$REPO" --json mergeStateStatus \
    -q '.mergeStateStatus' 2>/dev/null || echo "UNKNOWN")

  echo "$merge_state"
}

# ── Build JSON output ──
build_result() {
  local ready="$1"
  local pr_number="$2"
  local tests_pass="$3"
  local e2e_pass="$4"
  local approved="$5"
  local threads_resolved="$6"
  local no_active_fix="$7"
  local branch_up_to_date="$8"
  local approval_count="$9"
  local unresolved_threads="${10}"
  local merge_state="${11}"
  local head_sha="${12}"
  local base_ref="${13}"
  local action="${14}"

  jq -n \
    --argjson ready "$ready" \
    --argjson pr_number "$pr_number" \
    --argjson tests_pass "$tests_pass" \
    --argjson e2e_pass "$e2e_pass" \
    --argjson approved "$approved" \
    --argjson threads_resolved "$threads_resolved" \
    --argjson no_active_fix "$no_active_fix" \
    --argjson branch_up_to_date "$branch_up_to_date" \
    --argjson approval_count "$approval_count" \
    --argjson unresolved_threads "$unresolved_threads" \
    --arg merge_state "$merge_state" \
    --arg head_sha "$head_sha" \
    --arg base_ref "$base_ref" \
    --arg action "$action" \
    '{
      ready: $ready,
      pr_number: $pr_number,
      conditions: {
        tests_pass: $tests_pass,
        e2e_pass: $e2e_pass,
        approved: $approved,
        threads_resolved: $threads_resolved,
        no_active_fix: $no_active_fix,
        branch_up_to_date: $branch_up_to_date
      },
      details: {
        approval_count: $approval_count,
        unresolved_threads: $unresolved_threads,
        merge_state: $merge_state,
        head_sha: $head_sha,
        base_ref: $base_ref
      },
      action: $action
    }'
}

main() {
  local pr_number="${1:-}"

  if [ -z "$pr_number" ]; then
    echo "Usage: $0 <pr_number>" >&2
    echo "Error: pr_number is required" >&2
    exit 1
  fi

  if [ -z "$REPO" ]; then
    echo "Error: GITHUB_REPOSITORY environment variable is required" >&2
    exit 1
  fi

  echo "Evaluating merge readiness for PR #$pr_number" >&2

  # ── Verify PR targets master ──
  local base_ref
  base_ref=$(gh pr view "$pr_number" --repo "$REPO" --json baseRefName \
    -q '.baseRefName' 2>/dev/null || echo "")

  if [ "$base_ref" != "master" ]; then
    echo "PR #$pr_number targets '$base_ref', not master — skipping" >&2
    build_result false "$pr_number" false false false false false false 0 0 "UNKNOWN" "" "$base_ref" "skip"
    exit 0
  fi

  # ── Get head SHA ──
  local head_sha
  head_sha=$(gh pr view "$pr_number" --repo "$REPO" --json headRefOid \
    -q '.headRefOid' 2>/dev/null || echo "")

  if [ -z "$head_sha" ]; then
    echo "Cannot determine head SHA for PR #$pr_number — skipping" >&2
    build_result false "$pr_number" false false false false false false 0 0 "UNKNOWN" "" "$base_ref" "skip"
    exit 0
  fi

  echo "Head SHA: $head_sha" >&2

  # ── Fetch check runs once ──
  local check_runs
  check_runs=$(gh api "repos/$REPO/commits/$head_sha/check-runs" \
    --jq '.check_runs[] | "\(.name)|\(.conclusion)|\(.status)"' 2>/dev/null || echo "")

  # ── Evaluate conditions ──
  local tests_pass e2e_pass
  tests_pass=$(check_tests_passed "$check_runs")
  e2e_pass=$(check_e2e_passed "$check_runs")

  local approved_result approved approval_count
  approved_result=$(check_approved "$pr_number")
  approved=$(echo "$approved_result" | cut -d'|' -f1)
  approval_count=$(echo "$approved_result" | cut -d'|' -f2)

  local threads_result threads_resolved unresolved_threads
  threads_result=$(check_threads_resolved "$pr_number")
  threads_resolved=$(echo "$threads_result" | cut -d'|' -f1)
  unresolved_threads=$(echo "$threads_result" | cut -d'|' -f2)

  local no_active_fix
  no_active_fix=$(check_no_active_review_fix "$pr_number")

  local merge_state branch_up_to_date
  merge_state=$(check_branch_status "$pr_number")
  if [ "$merge_state" = "BEHIND" ]; then
    branch_up_to_date=false
  else
    branch_up_to_date=true
  fi

  echo "Conditions:" >&2
  echo "  Tests passed:       $tests_pass" >&2
  echo "  E2E passed:         $e2e_pass" >&2
  echo "  Approved:           $approved ($approval_count approvals)" >&2
  echo "  Threads resolved:   $threads_resolved ($unresolved_threads unresolved)" >&2
  echo "  No active fix:      $no_active_fix" >&2
  echo "  Branch up to date:  $branch_up_to_date (merge state: $merge_state)" >&2

  # ── Decision logic ──
  local action ready
  local core_conditions_met=false

  if [ "$tests_pass" = "true" ] && [ "$e2e_pass" = "true" ] && \
     [ "$approved" = "true" ] && [ "$threads_resolved" = "true" ] && \
     [ "$no_active_fix" = "true" ]; then
    core_conditions_met=true
  fi

  if [ "$core_conditions_met" = "true" ] && [ "$branch_up_to_date" = "true" ]; then
    action="merge"
    ready=true
  elif [ "$core_conditions_met" = "true" ] && [ "$branch_up_to_date" = "false" ]; then
    action="update_branch"
    ready=false
  else
    action="wait"
    ready=false
  fi

  echo "Decision: action=$action ready=$ready" >&2

  build_result "$ready" "$pr_number" "$tests_pass" "$e2e_pass" "$approved" \
    "$threads_resolved" "$no_active_fix" "$branch_up_to_date" "$approval_count" \
    "$unresolved_threads" "$merge_state" "$head_sha" "$base_ref" "$action"
}

# Only run main when executed directly (not sourced)
if [ -z "$_EVALUATE_MERGE_GATE_SOURCED" ]; then
  main "$@"
fi
