# Autonomous Pipeline Architecture

## Overview

The pipeline autonomously implements GitHub issues using Claude (or Gemini), with bot code reviews, automated fix cycles, and story-to-story orchestration.

## Workflow Inventory

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `daily-planner.yml` | Cron (weekends) / manual | Creates epics with stories |
| `claude.yml` | `@claude` comment | Runs Claude on issue or PR |
| `gemini.yml` | `@gemini` comment | Runs Gemini on issue or PR |
| `verify-and-fix.yml` | Dispatched by workflows | Reusable verify + fix loop + merge + PR creation |
| `pipeline-doctor.yml` | verify-and-fix give-up / watcher / manual | Diagnoses failures, creates fix PRs |
| `test.yml` | Push/PR to master | CI checks (lint, typecheck, test); dispatches verify-and-fix on failure |
| `e2e-smoke.yml` | Push/PR to master | E2E tests (Playwright); dispatches verify-and-fix on failure |
| `review-relay.yml` | Bot review submitted | Detects bot reviews, dispatches review-fix |
| `review-fix.yml` | Dispatched by review-relay | Fixes review feedback, dispatches verify-and-fix for quality gate |
| `review-guardian.yml` | CI complete / bot comment / review | Ensures PRs get reviewed and approved |
| `auto-merge.yml` | CI complete / review / PR sync / dispatch | Single merge gate (6 conditions) |
| `resolve-conflicts.yml` | Push to master / manual | Auto-resolves merge conflicts on open PRs |
| `orchestrate.yml` | PR merged to master | Closes story, triggers next one |
| `watcher.yml` | Cron (every 20min) | Unsticks stories, fixes PRs, cleans up |
| `agent-switcher.yml` | Manual / comment | Switches preferred agent |
| `pipeline-toggle.yml` | Manual | Enables/disables pipeline |
| `build-ios.yml` | Push to master / manual | iOS build |
| `release.yml` | Tag push / manual | Release workflow |

---

## Shared Scripts & Composite Actions

Reusable logic is extracted into `.github/scripts/` (testable shell scripts) and `.github/actions/` (composite actions). Workflows are thin YAML wrappers that call these.

### Scripts (`.github/scripts/`)

| Script | Purpose | Tests |
|--------|---------|-------|
| `lib.sh` | 18 shared functions: `setup_git_auth`, `get_pr_number`, `check_ci_status`, `count_unresolved_threads`, `resolve_all_threads`, `count_approvals`, `merge_master_into_branch`, `check_changes_and_commit`, `smart_push`, `comment_on_issue`, `count_fix_attempts`, `is_workflow_active`, `dispatch_workflow`, `parse_repo`, `count_critical_comments`, `approve_and_merge`, `get_next_pending_story`, `trigger_story_agent` | 58 |
| `state-machine.sh` | Issue-based state machine with 12 states, transition validation, JSON state comments, and idempotent locking | 18 |
| `workflow.sh` | Temporal-like activity runner: `activity_start` (guard + lock), `activity_success` (transition + unlock), `activity_fail` (retry counter + escalation) | 43 |
| `evaluate-merge-gate.sh` | Evaluates 6 merge conditions → JSON with `action: merge|update_branch|wait|skip` | 16 |
| `verify-checks.sh` | Runs lint, typecheck, metro bundle, tests, native dep checks → JSON output | 27 |

Run `bats .github/scripts/__tests__/*.bats` to see the full suite (includes regression tests for documented bugs).

### Composite Actions (`.github/actions/`)

| Action | Purpose | Used By |
|--------|---------|---------|
| `setup-auth` | Git remote URL auth + user identity | claude, review-fix, resolve-conflicts, verify-and-fix, pipeline-doctor |
| `setup-node` | Node.js 20 + pnpm + `pnpm install` with frozen lockfile fallback | verify-and-fix, review-fix, test, build-ios, e2e-smoke, claude, daily-planner |
| `merge-master` | Fetch + merge master with strategy (`abort`, `infra-theirs`, `ours`) | verify-and-fix |

---

## Main Flow: Issue → Merge

```
+---------------------------------------------------------------------+
| 1. PLANNING                                                         |
|                                                                     |
|   daily-planner.yml (weekends)                                      |
|     +-- Gate: <=3 open epics, <=10 open stories                     |
|     +-- Claude creates Epic issue + 3-6 Story issues                |
|     +-- Labels: epic, epic:<slug>, story, pending                   |
|     +-- Triggers first story with @claude comment                   |
|                                                                     |
|   OR: Human comments @claude on any story issue                     |
+----------------------------+----------------------------------------+
                             |
                             v
+---------------------------------------------------------------------+
| 2. IMPLEMENTATION (claude.yml)                                      |
|                                                                     |
|   Trigger: @claude comment (human only, bot filter)                 |
|   Concurrency: per-issue + per-user (bot comments isolated)         |
|                                                                     |
|   +-- Issue context:                                                |
|   |     - Resume from existing work branches if found               |
|   |     - Create claude/issue-N (clean PR branch)                   |
|   |     - Create tmp/claude-<run_id> (work branch)                  |
|   |     - Action creates claude/issue-N-TIMESTAMP internally        |
|   |     - Claude works, mid-run pushes to internal branch           |
|   |     - End: copy all to tmp branch                               |
|   |     - Trigger verify-and-fix.yml                                 |
|   |                                                                 |
|   +-- PR context:                                                   |
|   |     - Checkout existing PR branch                               |
|   |     - Claude fixes code, pushes directly                        |
|   |     - Resolves review threads                                   |
|   |     - NO verify-and-fix (CI runs on PR push)                     |
|   |                                                                 |
|   +-- Timeout rescue (if: cancelled()):                             |
|         - Commit uncommitted work, push to tmp branch               |
|         - Mid-run pushes already on internal branch                 |
+----------------------------+----------------------------------------+
                             |
              (issue context only)
                             v
+---------------------------------------------------------------------+
| 3. VERIFY & FIX (verify-and-fix.yml)                                |
|                                                                     |
|   Reusable workflow — all code-pushing paths use it.                |
|   Temp branch pattern: fixes on tmp/vf-*, merge only on pass.      |
|                                                                     |
|   VERIFY job: runs checks (ci, e2e, or all)                        |
|     |                                                                |
|     +-- pass → MERGE job (merge work→target, create PR if needed)  |
|     +-- fail + attempt < max → FIX job (Claude fixes on temp)      |
|     +-- fail + attempt = max → GIVE-UP (pipeline-doctor.yml)       |
|                                                                     |
|   FIX job context:                                                  |
|     - .claude-fix-log.md persists across attempts                   |
|     - Commit log + diff vs master (intent context)                  |
|     - Milestone pushes for timeout safety                           |
+----------------------------+----------------------------------------+
                             |
                             v
+---------------------------------------------------------------------+
| 4. CODE REVIEW                                                      |
|                                                                     |
|   Gemini Code Assist reviews automatically                          |
|                                                                     |
|   review-guardian.yml:                                               |
|     +-- Bot review (pull_request_review event):                     |
|     |     No critical issues → auto-approve                         |
|     |     WITH critical issues → skip (review-relay handles)        |
|     |     Checks for active review-fix before approving             |
|     +-- Gemini fails → request Claude fallback review               |
|     +-- On CI completion:                                           |
|     |     +-- No formal review → request Claude review              |
|     |     +-- Formal review exists → dispatch auto-merge            |
|                                                                     |
|   review-relay.yml:                                                 |
|     +-- Bot submits review → dispatches review-fix.yml              |
|     +-- Max 3 relay rounds per PR                                   |
|                                                                     |
|   review-fix.yml:                                                   |
|     +-- Claude fixes code (no push permission in prompt)            |
|     +-- Resolves review threads, pushes changes                     |
|     +-- Dispatches verify-and-fix.yml (3 attempts) for quality gate |
+----------------------------+----------------------------------------+
                             |
                             v
+---------------------------------------------------------------------+
| 5. AUTO-MERGE GATE (auto-merge.yml)                                 |
|                                                                     |
|   Triggers: workflow_run, pull_request_review,                      |
|             pull_request (synchronize), workflow_dispatch            |
|                                                                     |
|   Merges only when ALL 6 conditions are met:                        |
|     1. Tests workflow passed                                        |
|     2. E2E passed (all 3 jobs: chromium, performance, cross-browser)|
|     3. PR has at least one approval                                 |
|     4. No unresolved review threads                                 |
|     5. No active review-fix runs                                    |
|     6. Branch up to date with master                                |
|                                                                     |
|   If branch behind → merge master into PR branch → re-evaluate     |
+----------------------------+----------------------------------------+
                             |
                             v
+---------------------------------------------------------------------+
| 6. ORCHESTRATION (orchestrate.yml)                                  |
|                                                                     |
|   Trigger: PR merged to master                                      |
|   1. Close story issue, label "completed"                           |
|   2. Find next pending story in same epic                           |
|   3. Safety: >=3 consecutive unmerged PRs → pause pipeline          |
|   4. Trigger @{PREFERRED_AGENT} on next story                       |
|   5. No more stories → close epic                                   |
+---------------------------------------------------------------------+
```

---

## Recovery & Health (watcher.yml — every 20 min)

```
+---------------------------------------------------------------------+
| PIPELINE WATCHER                                                    |
|                                                                     |
| Gate: PIPELINE_ENABLED != 'false'                                   |
| Concurrency limit: 3 simultaneous Claude runs                       |
|                                                                     |
| 1. CHECK OPEN claude/ PRs                                           |
|    +-- Merge conflicts → dispatch resolve-conflicts                 |
|    +-- CI failing + no commits in 15min → @claude to fix            |
|    +-- Missing CI check + stale → close/reopen to retrigger         |
|    +-- CI passes + unresolved threads + stale → resolve + retrigger |
|    +-- CI passes + approved + stale → dispatch auto-merge           |
|                                                                     |
| 2. CHECK IN-PROGRESS STORIES (no PR yet)                            |
|    +-- Active workflow running → skip                               |
|    +-- Existing work branch → trigger verify-and-fix directly       |
|    +-- >=5 successful runs → pipeline doctor                        |
|    +-- Otherwise → re-trigger @claude                               |
|                                                                     |
| 3. CHECK STALLED EPICS                                              |
|    +-- Pending stories + no in-progress → trigger next              |
|    +-- No stories left → close epic                                 |
|                                                                     |
| 4. CLOSE ORPHAN PRs (no linked story, stale)                        |
+---------------------------------------------------------------------+
```

---

## Temporal-like Activity Model

The pipeline uses a Temporal-inspired activity runner (`workflow.sh`):

- **Activities**: implement, verify, fix, review, fix-review, merge, orchestrate
- **State Machine**: Durable state in JSON issue comments
- **Retry Policies**: Per-activity max attempts (implement: 3, verify: 6, fix: 6, review: 3, merge: 3)
- **Idempotent Locking**: `activity_start` acquires keyed lock (same key = reentrant, different key = reject)

### State Flow

```
planned → implementing → verifying ←→ fix-loop → verified → reviewing ←→ fix-reviews → approved → merging → merged
                              ↓                                    ↓                                    ↓
                          escalated                            escalated                             escalated
```

### Activity-to-Workflow Mapping

| Activity | Workflow | On Success | On Failure |
|----------|----------|------------|------------|
| implement | `claude.yml` | → implementing | retry or escalate |
| verify | `verify-and-fix.yml` | → verified | → fix-loop |
| fix | `verify-and-fix.yml` | → verifying | retry or escalate |
| review | `review-guardian.yml` | → approved | → fix-reviews |
| fix-review | `review-fix.yml` | → reviewing | retry or escalate |
| merge | `auto-merge.yml` | → merged | retry or escalate |
| orchestrate | `orchestrate.yml` | → planned (next) | escalate |

---

## Key Design Decisions

### Issue vs PR: Two Paths in claude.yml
- **Issue context**: No PR exists. Creates work branches, goes through verify-and-fix.
- **PR context**: PR exists. Pushes directly to PR branch, skips verify-and-fix. This is the biggest token saver.

### Three Branches (Issue Context)
1. `claude/issue-N` — clean PR branch, only receives verified code
2. `tmp/claude-<run_id>` — work branch for verify-and-fix
3. `claude/issue-N-TIMESTAMP` — action's internal branch (mid-run safety pushes)

### review-relay → review-fix (Not @claude PR Comments)
`claude-code-action@v1` restricts tools on PR comments (read-only). review-relay dispatches `review-fix.yml` via `workflow_dispatch` for full tool access.

### Auto-Approve → Explicit Auto-Merge Dispatch
`GITHUB_TOKEN` approvals don't emit `pull_request_review` events. All auto-approve paths dispatch `auto-merge.yml` explicitly.

### Reusable Verify-and-Fix Loop
`verify-and-fix.yml` is the single quality gate for all code-pushing workflows. It replaces the old `verify-merge.yml` by combining verify, fix, merge, and PR creation into one workflow.

Callers dispatch it with configurable check mode and retry count:
- `claude.yml` → `checks: "ci"`, `max_attempts: 6`, `merge_into` + `create_pr` (implement → verify → merge → PR)
- `review-fix.yml` → `checks: "all"`, `max_attempts: 3` (after addressing review feedback)
- `test.yml` → `checks: "ci"`, `max_attempts: 3` (on CI failure for claude/ branches)
- `e2e-smoke.yml` → `checks: "e2e"`, `max_attempts: 3` (on E2E failure for claude/ branches)
- `watcher.yml` → `checks: "ci"`, `max_attempts: 6`, `merge_into` + `create_pr` (unstick stories with existing work)

The workflow self-dispatches with `attempt+1` for retry (since `workflow_call` can't self-dispatch).

### Temp Branch Pattern
All fix attempts work on `tmp/vf-*` branches — never pushing broken code to the target branch. Only verified code merges into the target. This keeps PR branches and git history clean.

### Fix Context
- `.claude-fix-log.md` persists on temp branch across attempts (deleted before merge)
- Commit log + diff included so Claude understands intent
- Milestone pushes for timeout safety
- Early bail-out if Claude produces no changes

---

## Edge Cases & Safety Mechanisms

Historical bugs and their fixes are tracked as regression tests in `.github/scripts/__tests__/regression.test.bats`. For detailed root-cause analysis and solutions, see [`pipeline-edge-cases.md`](pipeline-edge-cases.md). Key safety mechanisms:

| Mechanism | Purpose |
|-----------|---------|
| Bot comment isolation | Concurrency group includes `comment.user.login` to prevent bot status comments from cancelling real runs |
| Cancel-in-progress guard | Only `@claude` comments can cancel; status comments queue harmlessly |
| Fix attempt isolation | Concurrency group includes attempt number; no cancellation |
| Give-up comment safety | Neutral language, no `@claude`/`@gemini` triggers |
| Review-fix → verify-and-fix | Review-fix pushes then dispatches verify-and-fix for quality gate with retry |
| CI failure → verify-and-fix | test.yml and e2e-smoke.yml dispatch verify-and-fix instead of @claude PR comments (which have restricted tools) |
| Review thread resolution | Threads resolved before push so auto-merge gate passes on first eval |
| Review-guardian badge check | Checks inline `![critical]`/`![high]` badges before auto-approving |
| Event-driven approval | ensure-review never auto-approves; approval flows through review event hooks only |
| Merge conflict resolution | `resolve-conflicts.yml` auto-resolves on push to master |
| Branch behind detection | Auto-merge merges master into PR branch when behind |
| Watcher race prevention | Checks active/queued workflows before retriggering |
| Timeout rescue | `if: cancelled()` commits + pushes work on timeout |
| Lint scope | verify-and-fix only lints changed files vs master |
| Native dep check | Verifies react-native packages are in Podfile.lock |
| Consecutive failure detection | >=3 unmerged PRs pauses pipeline; >=5 runs triggers doctor |
| Pipeline doctor | Diagnoses failures, checks out work branch, reproduces errors |
| Orphan PR cleanup | Watcher closes stale PRs with no linked story |

---

## Token/Cost Efficiency

- PR context skips verify-and-fix (direct push to PR branch)
- verify-and-fix fail-fast (lint → typecheck → bundle → test → native deps)
- Fix job gets all errors at once (5 error files)
- Max 3 concurrent Claude runs
- Max 3 review relay rounds per PR
- Timeout rescue preserves work (no lost token spend)
- Watcher reuses existing work branches instead of re-running claude.yml
- Single merge gate (`auto-merge.yml`) — no workflow needs its own merge logic
