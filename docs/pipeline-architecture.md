# Autonomous Pipeline Architecture

## Overview

The pipeline autonomously implements GitHub issues using Claude (or Gemini), with bot code reviews, automated fix cycles, and story-to-story orchestration.

## Workflow Inventory

### Active Workflows (GitHub Actions)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `daily-planner.yml` | Cron (weekends) / manual | Creates epics with stories |
| `claude.yml` | `@claude` comment | Runs Claude on issue or PR; sends Inngest events on completion |
| `gemini.yml` | `@gemini` comment | Runs Gemini on issue or PR |
| `test.yml` | Push/PR to master | CI checks (lint, typecheck, test); sends Inngest verify event on failure |
| `e2e-smoke.yml` | Push/PR to master | E2E tests (Playwright); sends Inngest verify event on failure |
| `inngest-relay.yml` | PR merged, CI done, review submitted | Relays GitHub events to Inngest Cloud |
| `deploy-pipeline.yml` | Push to master (pipeline/ changes) | Builds and deploys the Inngest pipeline server |
| `pipeline-doctor.yml` | Inngest escalation / manual | Diagnoses failures, creates fix PRs |
| `resolve-conflicts.yml` | Push to master / manual | Auto-resolves merge conflicts on open PRs |
| `agent-switcher.yml` | Manual / comment | Switches preferred agent |
| `pipeline-toggle.yml` | Manual | Enables/disables pipeline |
| `build-ios.yml` | Push to master / manual | iOS build |
| `build-android.yml` | Push to master / PR / manual | Android debug build + lint |
| `release.yml` | Tag push / manual | Release workflow |

### Removed Workflows (replaced by Inngest functions)

| Old Workflow | Replaced By | Removed In |
|-------------|-------------|------------|
| `orchestrate.yml` | `story-lifecycle` Inngest function | Sprint 5 |
| `auto-merge.yml` | `merge-gate` Inngest function | Sprint 5 |
| `verify-and-fix.yml` | `verify-and-fix` Inngest function | Sprint 5 |
| `review-relay.yml` | `review-relay` Inngest function | Sprint 5 |
| `review-fix.yml` | `review-fix` Inngest function | Sprint 5 |
| `review-guardian.yml` | `ensure-review` Inngest function | Sprint 5 |
| `watcher.yml` | `pipeline-watcher` Inngest function | Sprint 5 |

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
| `setup-node` | Node.js 20 + pnpm + `pnpm install` with frozen lockfile fallback | verify-and-fix, review-fix, test, build-ios, build-android, e2e-smoke, claude, daily-planner |
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
|   Merges only when ALL 7 conditions are met:                        |
|     1. Tests workflow passed                                        |
|     2. E2E passed (all 3 jobs: chromium, performance, cross-browser)|
|     3. Android build passed                                         |
|     4. PR has at least one approval                                 |
|     5. No unresolved review threads                                 |
|     6. No active review-fix runs                                    |
|     7. Branch up to date with master                                |
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
| Event-driven approval | ensure-review checks thread resolution AND all CI checks (tests, e2e, android build) after a workflow_run passes; approves only when all threads resolved AND all CI passed (self-healing after review-fix) |
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

---

## Inngest Migration (In Progress)

The orchestration layer is being migrated from GitHub Actions workflow-dispatch chaining to [Inngest](https://www.inngest.com/) durable functions. This provides:

- **Durable execution**: Steps are memoized and survive crashes/restarts
- **Built-in retry**: Exponential backoff per step, no manual attempt tracking
- **Concurrency controls**: Per-function, per-tenant limits via configuration
- **Type-safe events**: All pipeline events are strongly typed in TypeScript
- **Testable functions**: Pure TypeScript functions testable with Vitest

### Architecture

```
GitHub Events (PR merged, CI complete, review submitted)
    │
    ▼
inngest-relay.yml (thin GitHub Actions workflow)
    │ curl POST to Inngest API
    ▼
Inngest Cloud / Self-hosted
    │ routes events to functions
    ▼
┌─────────────────────────────────────────┐
│        pipeline/ (TypeScript)            │
│                                          │
│  Functions:                              │
│  ├── story-lifecycle  (orchestrate.yml)  │
│  ├── verify-and-fix   (verify-and-fix)   │
│  ├── merge-gate       (auto-merge.yml)   │
│  ├── ensure-review    (review-guardian)   │
│  ├── review-relay     (review-relay)      │
│  ├── review-fix       (review-fix)        │
│  └── watcher          (watcher.yml)       │
│                                          │
│  Shared Libraries:                       │
│  ├── github.ts        (lib.sh port)      │
│  └── state-machine.ts (state-machine.sh) │
└─────────────────────────────────────────┘
    │ Octokit API calls
    ▼
GitHub API (issues, PRs, checks, reviews)
```

### Event Flow

| Inngest Event | Replaces | Trigger |
|---------------|----------|---------|
| `pipeline/pr.merged` | `orchestrate.yml` | PR merged to master |
| `pipeline/story.trigger` | `trigger_story_agent()` | Story ready for implementation |
| `pipeline/verify.requested` | `verify-and-fix.yml` dispatch | Code needs verification |
| `pipeline/ci.completed` | `auto-merge.yml` workflow_run | CI checks finished |
| `pipeline/merge.evaluate` | `auto-merge.yml` dispatch | Merge gate re-evaluation |
| `pipeline/review.submitted` | `review-relay.yml` trigger | Bot/human review posted |
| `pipeline/review.fix-requested` | `review-fix.yml` dispatch | Review fixes needed |
| `pipeline/review.ensure` | `review-guardian.yml` trigger | Ensure PR gets reviewed |
| `pipeline/watcher.tick` | `watcher.yml` cron | Health check (every 20min) |
| `pipeline/doctor.requested` | `pipeline-doctor.yml` dispatch | Diagnosis needed |

### Project Structure

```
pipeline/
├── package.json          # Inngest + Octokit + Hono + Vitest
├── tsconfig.json         # Standalone TypeScript config
├── vitest.config.ts      # Test configuration
├── Dockerfile            # Container build for deployment
├── .dockerignore         # Docker build exclusions
├── DEPLOY.md             # Deployment and secrets setup guide
└── src/
    ├── inngest.ts        # Client + event type definitions
    ├── types.ts          # State machine types, CI status, config
    ├── serve.ts          # Hono HTTP server (Node adapter, health endpoints)
    ├── functions/
    │   ├── story-lifecycle.ts      # PR merged → close story → next story
    │   ├── verify-and-fix.ts       # Verify CI → fix loop → escalate
    │   ├── merge-gate.ts           # 6-condition merge evaluation
    │   ├── review-orchestration.ts # Ensure review + relay + fix
    │   └── watcher.ts              # Scheduled health monitoring
    ├── lib/
    │   ├── github.ts               # Octokit wrapper (port of lib.sh)
    │   ├── state-machine.ts        # State persistence (port of state-machine.sh)
    │   └── env.ts                  # Environment config with validation
    └── __tests__/
        ├── state-machine.test.ts   # 24 tests
        ├── merge-gate.test.ts      # 9 tests
        ├── events.test.ts                          # 2 tests
        ├── story-lifecycle.integration.test.ts     # 8 tests
        ├── merge-gate.integration.test.ts          # 9 tests
        ├── verify-and-fix.integration.test.ts      # 6 tests
        ├── review-orchestration.integration.test.ts # 8 tests
        ├── watcher.integration.test.ts             # 7 tests
        └── helpers/
            ├── index.ts                # Barrel exports
            ├── mock-step.ts            # Mock Inngest step primitives
            └── mock-github.ts          # Mock GitHubClient with state
```

### Testing

The pipeline has two test layers:

| Layer | Files | What it covers |
|-------|-------|---------------|
| **Unit tests** | `*.test.ts` | Pure logic: state transitions, merge gate evaluation, event types |
| **Integration tests** | `*.integration.test.ts` | Full function flows with mocked GitHub API + Inngest step primitives |

Integration tests mock `GitHubClient` and `PipelineStateMachine` at the module level, then exercise each Inngest function's handler with a mock step context. This verifies:
- Correct GitHub API call sequences
- State machine transitions at each stage
- Event emission (step.sendEvent) for downstream functions
- Sleep/wait behavior for async operations
- Error handling and escalation paths

Run all pipeline tests: `cd pipeline && pnpm test`

Pipeline tests also run in CI as the `pipeline-test` job in `test.yml`.

### Migration Status

- [x] Sprint 1: Core infrastructure (types, events, state machine, GitHub client, all functions, tests)
- [x] Sprint 2: Integration testing (mock step harness, 38 integration tests across all functions, CI job)
- [x] Sprint 3: Deploy infrastructure (Dockerfile, env config, deploy workflow, hardened relay, DEPLOY.md)
- [x] Sprint 4: Parallel run — shadow mode, parity logging, write interception via Proxy
- [x] Sprint 5: Cutover — removed 7 old workflows, updated CI to send Inngest events, cleaned up shell scripts

### Sprint 4: Parallel Run (Shadow Mode)

The parallel run allows old GHA workflows and new Inngest functions to run simultaneously. Inngest functions observe and record decisions but skip write actions.

**Architecture:**
- `INNGEST_SHADOW_MODE=true` enables shadow mode globally
- `PARITY_TRACKING_ISSUE=N` sets the GitHub issue for parity logging
- Each Inngest function wraps its `GitHubClient` with `createShadowContext()`
- The shadow context uses a JS `Proxy` to intercept write methods (merge, comment, label, approve, etc.)
- Read methods (checkCIStatus, countApprovals, getPR, etc.) pass through unchanged
- Intercepted writes are recorded as `ParityAction[]` and logged to the tracking issue
- All function return values include a `_shadow: true` flag in shadow mode

**Parity Logging:**
Each function decision is posted to the tracking issue with:
- Function ID and event name
- Decision made (merge, wait, triggered, etc.)
- Table of intercepted write actions (type, target, detail)
- Conditions evaluated (e.g., CI status, approval count)

This allows comparing what Inngest would do vs what the old GHA workflows actually did.

**Key files:**
| File | Purpose |
|------|---------|
| `pipeline/src/lib/parity.ts` | `isShadowMode()`, `wrapForShadow()`, `recordParity()` |
| `pipeline/src/lib/shadow-context.ts` | `createShadowContext()` — shared helper for all functions |
| `pipeline/src/__tests__/parity.test.ts` | 14 tests for shadow mode + parity recording |
| `pipeline/src/__tests__/shadow-context.test.ts` | 8 tests for shadow context lifecycle |

### Sprint 5: Cutover

Completed the migration from GitHub Actions workflow-dispatch chains to Inngest durable functions.

**Removed 7 old workflows:**
- `orchestrate.yml`, `auto-merge.yml`, `verify-and-fix.yml`
- `review-relay.yml`, `review-fix.yml`, `review-guardian.yml`, `watcher.yml`

**Updated remaining workflows:**
- `test.yml` — sends `pipeline/verify.requested` event to Inngest on CI failure (was: dispatch verify-and-fix.yml)
- `e2e-smoke.yml` — sends `pipeline/verify.requested` event to Inngest on E2E failure (was: dispatch verify-and-fix.yml)
- `claude.yml` — sends `pipeline/verify.requested` event to Inngest after agent push (was: dispatch verify-and-fix.yml)

**Updated shell scripts:**
- `lib.sh` `approve_and_merge()` — no longer dispatches auto-merge.yml (Inngest handles merge gating)
- `evaluate-merge-gate.sh` `check_no_active_review_fix()` — always returns true (review-fix handled by Inngest)

**Rollback procedure:**
If Inngest functions encounter issues, restore the old workflows from git history:
```bash
git checkout HEAD~1 -- .github/workflows/orchestrate.yml .github/workflows/auto-merge.yml \
  .github/workflows/verify-and-fix.yml .github/workflows/review-relay.yml \
  .github/workflows/review-fix.yml .github/workflows/review-guardian.yml \
  .github/workflows/watcher.yml
```
Then revert the dispatch changes in test.yml, e2e-smoke.yml, and claude.yml.

### Deployment

The pipeline server deploys as a Docker container. See `pipeline/DEPLOY.md` for full setup.

**Required GitHub Secrets:**
| Secret | Purpose |
|--------|---------|
| `GH_PAT` | GitHub API access for pipeline functions |
| `INNGEST_EVENT_KEY` | Inngest event sending authentication |
| `INNGEST_SIGNING_KEY` | Inngest webhook request verification |

**Optional Environment Variables (Parallel Run):**
| Variable | Purpose |
|----------|---------|
| `INNGEST_SHADOW_MODE` | Set to `true` to enable observe-only mode |
| `PARITY_TRACKING_ISSUE` | GitHub issue number for parity decision logging |

**Deploy workflow:** `deploy-pipeline.yml` runs on push to master when `pipeline/` changes.
Builds Docker image → pushes to registry → verifies health endpoint.

**Relay workflow:** `inngest-relay.yml` bridges GitHub webhook events to Inngest Cloud.
Uses `jq` for safe JSON construction, validates HTTP responses, checks secret presence.
