# Design: Reusable verify-and-fix workflow

## Problem

Quality checks + fix retry logic was reimplemented in multiple workflows with inconsistent patterns.

## Solution: `verify-and-fix.yml`

A single reusable workflow (`workflow_dispatch`) that runs quality checks and optionally retries with Claude auto-fix on a **temp branch** (never pushes broken code to the target).

### Interface

```yaml
inputs:
  branch:        # Target branch (PR branch — only receives verified code)
  work_branch:   # Temp branch (empty on first call, set internally for retries)
  issue_number:  # Issue/PR number for status comments
  checks:        # "all", "ci", or "e2e"
  fix_enabled:   # Enable Claude auto-fix on failure
  max_attempts:  # Max fix attempts (1 = verify only)
  attempt:       # Current attempt number (internal)
  fix_context:   # Additional context for Claude fix prompt
```

### Temp branch pattern

```
Attempt 1:
  verify job → checks out `branch` directly → run checks
    → PASS → done (no temp branch needed)
    → FAIL → fix job creates tmp/vf-<branch>-<run_id> from target
           → Claude fixes on temp branch, pushes there
           → dispatches attempt 2 with work_branch=tmp/vf-...

Attempt 2+:
  verify job → checks out `work_branch` (has previous fix work) → run checks
    → PASS → merge job: merge work_branch into branch, delete work_branch
    → FAIL → fix job continues on work_branch, dispatches next attempt

Max attempts reached:
  give-up job → comment failure, dispatch pipeline-doctor
```

Key properties:
- **Target branch stays clean** — broken code never lands on the PR branch
- **Each attempt builds on previous** — temp branch accumulates fixes
- **`.claude-fix-log.md`** persists on temp branch so Claude doesn't repeat approaches
- **Temp branch cleanup** — merge job deletes it after successful merge

### Jobs

```
verify → (pass, no work branch)                     → done
       → (pass, work branch exists)                  → merge (temp → target, cleanup)
       → (fail + fix_enabled + attempt < max)        → fix (on temp branch, retry)
       → (fail + no fix / max reached)               → give-up (pipeline-doctor)
```

### Check modes

| Mode | Checks |
|------|--------|
| `all` | lint (changed files) + typecheck + bundle + test + E2E |
| `ci` | typecheck + bundle + test |
| `e2e` | webpack + Playwright (chromium + firefox) |

### Current callers

| Workflow | Dispatch |
|---------|----------|
| `review-fix.yml` | `checks: "all"`, `max_attempts: 3`, `fix_context: "review feedback..."` |
| `test.yml` (on failure) | `checks: "ci"`, `max_attempts: 3` |
| `e2e-smoke.yml` (on failure) | `checks: "e2e"`, `max_attempts: 3` |

| `claude.yml` (issue context) | `checks: "ci"`, `max_attempts: 6`, `merge_into: "claude/issue-N"`, `create_pr: true` |
| `watcher.yml` (stuck stories) | `checks: "ci"`, `max_attempts: 6`, `merge_into: "claude/issue-N"`, `create_pr: true` |

### Not yet migrated

| Workflow | Why |
|---------|-----|
| `release.yml` | Could use `checks: "all"`, `fix_enabled: false` as a gate. Low priority. |
