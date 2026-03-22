# Autonomous Pipeline Architecture

## Overview

The pipeline autonomously implements GitHub issues using Claude (or Gemini), with bot code reviews, automated fix cycles, and story-to-story orchestration.

## Workflow Inventory

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `daily-planner.yml` | Cron (every 3h) / manual | Creates epics with stories |
| `claude.yml` | `@claude` comment | Runs Claude on issue or PR |
| `gemini.yml` | `@gemini` comment | Runs Gemini on issue or PR |
| `verify-and-fix.yml` | Dispatched by workflows | Reusable verify + fix loop + merge + PR creation |
| `pipeline-doctor.yml` | verify-and-fix give-up / watcher / manual | Diagnoses failures, creates fix PRs |
| `test.yml` | Push/PR to master / manual | CI checks (lint, typecheck, test); dispatches verify-and-fix on failure |
| `e2e-smoke.yml` | Push/PR to master / manual | E2E tests (Playwright) with 3 parallel chromium shards + rollup gate; dispatches verify-and-fix on failure |
| `review-relay.yml` | Bot review submitted | Detects bot reviews, dispatches review-fix |
| `review-fix.yml` | Dispatched by review-relay | Fixes review feedback, dispatches verify-and-fix for quality gate |
| `review-guardian.yml` | CI complete / bot comment / review | Ensures PRs get reviewed and approved |
| `auto-merge.yml` | CI complete / review / PR sync / push to master / dispatch | Single merge gate (6 conditions); evaluates all open PRs on master push |
| `resolve-conflicts.yml` | Push to master / manual | Auto-resolves merge conflicts on open PRs |
| `orchestrate.yml` | PR merged to master | Closes story, triggers next one |
| `watcher.yml` | Cron (every 20min) / manual | Unsticks stories, fixes PRs, cleans up |
| `agent-switcher.yml` | Manual / comment | Switches preferred agent |
| `pipeline-toggle.yml` | Manual | Enables/disables pipeline |
| `build-ios.yml` | Push to master (ios/pkg paths) / manual | iOS build |
| `build-android.yml` | Push to master / manual | Android debug build (master only) |
| ~~`screenshot-capture.yml`~~ | _(removed)_ | Screenshots are now colocated in source tree, updated in-PR via `/capture-screens` |
| `ux-audit.yml` | Cron (twice daily: midnight + noon PST) / manual | Captures screen + component screenshots (parallel), runs flow audit, creates epic with stories for UX issues |
| `release.yml` | Tag push / manual | Release workflow |

---

## Shared Scripts & Composite Actions

Reusable logic is organized into TypeScript modules (`.github/scripts/lib/`) and composite actions (`.github/actions/`). Workflows call these via CLI entry points (`npx tsx .github/scripts/lib/cli/pipeline.ts <command>`).

### TypeScript Modules (`.github/scripts/lib/`)

The primary pipeline logic is implemented in TypeScript with full type safety and Vitest tests.

| Module | Purpose | CLI Entry Point |
|--------|---------|-----------------|
| `github.ts` | Typed GitHub API client (Octokit REST + GraphQL) | — (library) |
| `git.ts` | Local git operations (auth, merge, commit, push) | `lib/cli/pipeline.ts` |
| `verify-checks.ts` | Runs lint, typecheck, metro bundle, tests, native dep checks → JSON output | `lib/cli/verify-checks.ts` |
| `state-machine.ts` | Pipeline state persistence in GitHub issue comments | `lib/cli/state-machine.ts` |
| `workflow.ts` | Temporal-like activity runner: start, success, fail, retry | `lib/cli/activity.ts` |
| `merge-gate.ts` | Evaluates 6 merge conditions → `merge\|update_branch\|wait\|skip` | `lib/cli/evaluate-merge-gate.ts` |
| `ci-dispatch.ts` | CI failure dispatch (label check, failed items, verify-and-fix dispatch) | `lib/cli/pipeline.ts` |
| `watcher.ts` | Pipeline watcher (slot counting, PR health, story retrigger, orphan cleanup) | `lib/cli/pipeline.ts` |
| `doctor.ts` | Pipeline doctor evidence collection and failure reproduction | `lib/cli/pipeline.ts` |
| `review-guardian.ts` | Review guardian auto-approve and review decision logic | `lib/cli/pipeline.ts` |
| `types.ts` | Shared types, state transitions, activity limits | — (library) |
| `env.ts` | Environment validation and typed access | — (library) |

The unified pipeline CLI (`lib/cli/pipeline.ts`) provides all GitHub API and git commands as subcommands (e.g., `pipeline.ts dispatch`, `pipeline.ts comment`, `pipeline.ts setup-git-auth`).

Run `cd .github/scripts && pnpm test` for the TypeScript test suite.

### Composite Actions (`.github/actions/`)

| Action | Purpose | Used By |
|--------|---------|---------|
| `setup-auth` | Git remote URL auth + user identity | claude, review-fix, resolve-conflicts, verify-and-fix, pipeline-doctor |
| `setup-node` | Node.js 20 + pnpm + `pnpm install` with frozen lockfile fallback | verify-and-fix, review-fix, test, build-ios, build-android, e2e-smoke, claude, daily-planner |
| `setup-pipeline-ts` | Node.js 20 + pnpm + pipeline TS deps (`.github/scripts/`) | All workflows using the pipeline CLI |
| `merge-master` | Fetch + merge master with strategy (`abort`, `infra-theirs`, `ours`) | verify-and-fix |

---

## Main Flow: Issue → Merge

```
+---------------------------------------------------------------------+
| 1. PLANNING                                                         |
|                                                                     |
|   daily-planner.yml (manual dispatch)                                |
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
|     +-- pass + merge needed → MERGE job (work→target, create PR)   |
|     +-- pass + no merge → RETRIGGER job (re-run failed CI checks)  |
|     +-- fail + attempt < max → FIX job (Claude fixes on temp)      |
|     +-- fail + attempt = max → GIVE-UP (pipeline-doctor.yml)       |
|         Evidence collection in lib/doctor.ts (tested TypeScript)    |
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
|     Decision logic in lib/review-guardian.ts (tested TypeScript)     |
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
|     2. E2E passed (chromium rollup, performance, cross-browser)     |
|     3. PR has at least one approval (owner PRs implicitly approved) |
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

## Recovery & Health (watcher.yml — every 10 min)

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

All watcher logic is implemented in `lib/watcher.ts` (testable TypeScript) and invoked via `watcher-run` CLI command. The workflow YAML is a thin shell that calls:
```
npx tsx .github/scripts/lib/cli/pipeline.ts watcher-run <maxConcurrent> <graceMinutes> <maxRetries>
```

---

## Temporal-like Activity Model

The pipeline uses a Temporal-inspired activity runner (`workflow.ts`):

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
- `test.yml` → `checks: "ci"`, `max_attempts: 3` (on CI failure, via `ci-dispatch-pr`/`ci-dispatch-master` CLI; pipeline-test always runs on master push to catch breakage from file moves)
- `e2e-smoke.yml` → `checks: "e2e"`, `max_attempts: 3` (on E2E failure, via `ci-dispatch-pr`/`ci-dispatch-master` CLI)
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

Historical bugs and their fixes are tracked as regression tests in `.github/scripts/__tests__/lib/`. For detailed root-cause analysis and solutions, see [`pipeline-edge-cases.md`](pipeline-edge-cases.md). Key safety mechanisms:

| Mechanism | Purpose |
|-----------|---------|
| Bot comment isolation | Concurrency group includes `comment.user.login` to prevent bot status comments from cancelling real runs |
| Cancel-in-progress guard | Only `@claude` comments can cancel; status comments queue harmlessly |
| Fix attempt isolation | Concurrency group includes attempt number; no cancellation |
| Give-up comment safety | Neutral language, no `@claude`/`@gemini` triggers |
| Review-fix → verify-and-fix | Review-fix pushes then dispatches verify-and-fix for quality gate with retry |
| CI failure → verify-and-fix | test.yml and e2e-smoke.yml dispatch verify-and-fix on any PR branch (opt out with `no-autofix` label) and on master push failures (creates fix/master-* branch + PR) |
| Colocated screenshots | Screenshots live in `src/screens/<domain>/<ScreenName>/__screenshots__/` and are updated in the same PR as code changes via `/capture-screens`. No post-merge workflow needed. |
| Review thread resolution | Threads resolved before push so auto-merge gate passes on first eval |
| Review-guardian badge check | Checks inline `![critical]`/`![high]` badges before auto-approving |
| Event-driven approval | ensure-review checks thread resolution AND all CI checks (tests, e2e) after a workflow_run passes; approves only when all threads resolved AND all CI passed (self-healing after review-fix) |
| Bot review fallback | Bot reviews (Gemini) posted with GITHUB_TOKEN don't fire `pull_request_review` events, so review-relay never triggers. ensure-review dispatches review-fix directly when unresolved threads exist |
| Merge conflict resolution | `resolve-conflicts.yml` auto-resolves on push to master |
| Branch behind detection | Auto-merge merges master into PR branch when behind |
| Watcher race prevention | Checks active/queued workflows before retriggering |
| Timeout rescue | `if: cancelled()` commits + pushes work on timeout |
| Lint scope | verify-and-fix only lints changed files vs master |
| Native dep check | Verifies react-native packages are in Podfile.lock |
| Consecutive failure detection | >=3 unmerged PRs pauses pipeline; >=5 runs triggers doctor |
| Pipeline doctor | Diagnoses failures, checks out work branch, reproduces errors |
| Orphan PR cleanup | Watcher closes stale PRs with no linked story |
| Stale check recovery | verify-and-fix retrigger job: when verify passes with no merge needed, merges master into PR branch and pushes (triggers fresh CI), or re-runs failed checks if already up-to-date |
| Missing target branch | verify-and-fix merge job checks if target branch exists remotely; creates it from source if missing (handles claude-code-action timestamped branches vs claude.yml non-timestamped names) |
| Watcher updateBranch | Watcher uses GitHub update-branch API (triggers `pull_request synchronize`) instead of `workflow_dispatch` for missing CI — dispatch runs don't attach checks to PRs |
| Auto-close stale screenshots | _(legacy, inactive)_ Watcher auto-closes `chore/update-screenshots-*` PRs — no longer generated since screenshots are colocated in source tree |
| Generated file conflicts | `.gitattributes` marks screenshots, flow-graph.json, manifest.json as `merge=ours` — auto-resolves conflicts on generated files |
| Orphan branch safety | Branch cleanup skips branches belonging to in-progress stories — prevents deleting work before verify-and-fix can use it |
| E2E skip for screenshots | `e2e-smoke.yml` skips full E2E suite for screenshot/maestro-only PRs (same as pipeline-only skip) |
| Event-driven branch updates | `auto-merge.yml` triggers on push to master and evaluates all open PRs — PRs behind master get `updateBranch` immediately instead of waiting for watcher polling |
| Pipeline vitest in CI | `test.yml` runs pipeline vitest when `.github/scripts/` files change — catches pipeline TS breakages before they hit watcher/doctor at runtime |
| App test skip for pipeline PRs | `test.yml` skips typecheck/bundle/unit tests for PRs that only change `.github/*`, `docs/*`, `e2e/screenshots/*` — merge gate accepts skipped checks as passing |
| Cross-epic story chaining | `orchestrate.yml` checks all open epics for pending stories after completing an epic — no watcher delay |
| Merge failure visibility | `verify-and-fix` merge job comments on issue on failure — makes silent merge failures visible immediately |
| Claude failure visibility | `claude.yml` comments on issue on failure — watcher can pick up retrigger faster |

---

## Country Schema CI Coverage

All **8 country schemas** bundled in the app are covered in CI on every PR:

| Country | Code | CI Coverage | Portal Validation |
|---------|------|-------------|-------------------|
| Canada | CAN | `country-submissions` E2E project | Graceful-degradation spec (archived — ArriveCAN discontinued Oct 2023) |
| United Kingdom | GBR | `country-submissions` E2E project | `e2e/portal-validation/gbr.spec.ts` |
| Japan | JPN | `portal-submission` E2E project | `e2e/portal-validation/jpn.spec.ts` |
| Malaysia | MYS | `country-submissions` E2E project | `e2e/portal-validation/mys.spec.ts` |
| Singapore | SGP | `country-submissions` E2E project | `e2e/portal-validation/sgp.spec.ts` |
| Thailand | THA | `country-submissions` E2E project | Deferred (no automation portal yet) |
| United States | USA | `country-submissions` E2E project | `e2e/portal-validation/usa.spec.ts` |
| Vietnam | VNM | `country-submissions` E2E project | `e2e/portal-validation/vnm.spec.ts` |

### CI layers for country schemas

1. **Unit tests** (`pnpm test`): Schema structure and field validation for each country in `__tests__/schemas/`.
2. **In-app E2E** (`e2e-smoke.yml` — `country-submissions` project): Playwright tests verify trip leg cards render and DynamicForm loads for each country.
3. **Portal validation** (`e2e/portal-validation/` — run on-demand, not in CI): Verifies CSS selectors in field mappings resolve to real DOM elements on live government portals. CAN uses a graceful-degradation spec (automation disabled); THA is deferred.

### CAN archived-status handling

Canada's eTA schema (`CAN.json`) has `metadata.implementationStatus = "archived"` and `automation.enabled = false` because ArriveCAN was discontinued by the CBSA in October 2023. The pipeline:
- Runs CAN in-app submission tests normally (trip leg, DynamicForm render)
- Runs `e2e/portal-validation/can.spec.ts` which asserts archived status and skips live portal navigation
- The submission guide for CAN shows a manual-only fallback message to the traveller

Matrix coverage is validated by `.github/scripts/__tests__/lib/portal-pipeline-matrix.test.ts` (22 vitest tests).

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
