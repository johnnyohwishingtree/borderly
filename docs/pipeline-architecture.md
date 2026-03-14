# Autonomous Pipeline Architecture

## Overview

The pipeline autonomously implements GitHub issues using Claude (or Gemini), with bot code reviews, automated fix cycles, and story-to-story orchestration.

## Workflow Inventory

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `daily-planner.yml` | Cron (weekends) / manual | Creates epics with stories |
| `claude.yml` | `@claude` comment | Runs Claude on issue or PR |
| `gemini.yml` | `@gemini` comment | Runs Gemini on issue or PR |
| `verify-merge.yml` | Dispatched by claude/gemini | Tests code, fixes errors, merges |
| `test.yml` | Push/PR to master | CI checks (lint, typecheck, test) |
| `e2e-smoke.yml` | Push/PR to master | E2E tests (Playwright) |
| `review-relay.yml` | Bot review submitted | Forwards bot review to Claude |
| `review-guardian.yml` | CI complete / bot comment / review | Ensures PRs get reviewed and approved |
| `orchestrate.yml` | PR merged to master | Closes story, triggers next one |
| `watcher.yml` | Cron (every 20min) | Unsticks stories, fixes PRs, cleans up |
| `agent-switcher.yml` | Manual / comment | Switches preferred agent |
| `pipeline-toggle.yml` | Manual | Enables/disables pipeline |
| `build-ios.yml` | Push to master / manual | iOS build |
| `release.yml` | Tag push / manual | Release workflow |

---

## Main Flow: Issue --> Merge

```
+---------------------------------------------------------------------+
| 1. PLANNING                                                         |
|                                                                     |
|   daily-planner.yml (weekends)                                      |
|     |                                                               |
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
|   +-- Detect context: issue or PR                                   |
|   |                                                                 |
|   +-- If Issue context:                                             |
|   |     - Stay on master                                            |
|   |     - claude-code-action creates claude/issue-N-TIMESTAMP       |
|   |     - Claude works --> commits to its branch                    |
|   |     - Push work to tmp/claude-<run_id>                          |
|   |     - Extract issue number from branch name                     |
|   |     - Trigger verify-merge.yml                                  |
|   |                                                                 |
|   +-- If PR context:                                                |
|         - Checkout existing PR branch                               |
|         - Claude works --> commits to PR branch                     |
|         - Push directly to PR branch (NO verify-merge)              |
|         - Resolve bot review threads                                |
|         - Enable auto-merge on PR                                   |
|                                                                     |
|   KEY: PR context pushes directly. Only issue context uses          |
|   the tmp branch --> verify-merge flow.                             |
+----------------------------+----------------------------------------+
                             |
              (issue context only)
                             |
                             v
+---------------------------------------------------------------------+
| 3. VERIFY & MERGE (verify-merge.yml)                                |
|                                                                     |
|   Trigger: workflow_dispatch from claude.yml (issue context only)    |
|   Concurrency: per-tmp-branch + per-attempt (no cancellation)       |
|   Max attempts: 6                                                   |
|                                                                     |
|   +-------------------------+                                       |
|   | VERIFY job              |                                       |
|   |  Checkout tmp branch    |                                       |
|   |  Run: lint, typecheck   |                                       |
|   |  Run: metro bundle      |                                       |
|   |  Run: test              |                                       |
|   |  Run: native dep check  |                                       |
|   |  Output: pass=true/false|                                       |
|   +-----------+-------------+                                       |
|               |                                                     |
|         +-----+-----+                                               |
|         |           |                                                |
|       pass=true   pass=false                                        |
|         |           |                                                |
|         v           +-- attempt < 6 ----------+                     |
|       +-----+       |                         v                     |
|       |MERGE|     attempt=6            +------------+               |
|       | job |       |                  |  FIX job   |               |
|       +--+--+       v                  |            |               |
|          |     +--------+              | Capture    |               |
|          |     |GIVE-UP |              | errors     |               |
|          |     +---+----+              |   |        |               |
|          |         |                   | Claude fix |               |
|          |    Comment on               | (agent     |               |
|          |    issue (no                |  mode,     |               |
|          |    @claude!)                |  30 turns) |               |
|          |         |                   |   |        |               |
|          |    Clean up                 | Push to    |               |
|          |    stale tmp/               | same tmp   |               |
|          |    branches                 | branch     |               |
|          |                             |   |        |               |
|          |                             | Trigger    |               |
|          |                             | verify-    |               |
|          |                             | merge      |               |
|          |                             | attempt+1  |               |
|          |                             +-----+------+               |
|          |                                   |                      |
|          |                        +----------+                      |
|          |                        | (loops back to VERIFY)          |
|          |                        |                                 |
|          v                        |                                 |
|       +-----------------------+   |                                 |
|       | Merge tmp --> target  |   |                                 |
|       | Delete tmp branch     |   |                                 |
|       | Create PR to master   |   |                                 |
|       | (NO auto-merge)       |   |                                 |
|       +-----------+-----------+   |                                 |
|                   |                                                 |
+-------------------+-------------------------------------------------+
                    |
                    v
+---------------------------------------------------------------------+
| 4. CODE REVIEW                                                      |
|                                                                     |
|   PR created on master <-- triggers test.yml + e2e-smoke.yml        |
|                                                                     |
|   +-- Gemini Code Assist reviews automatically                      |
|   |     +-- Posts inline comments with severity levels              |
|   |                                                                 |
|   +-- review-guardian.yml (multiple triggers):                       |
|   |     |                                                           |
|   |     +-- Bot posts COMMENTED review (no critical issues):        |
|   |     |     +-- Auto-approve the PR                               |
|   |     |                                                           |
|   |     +-- Bot posts COMMENTED review WITH critical issues:        |
|   |     |     +-- Comment @claude to fix critical findings          |
|   |     |        (does NOT auto-approve)                            |
|   |     |                                                           |
|   |     +-- Gemini fails ("unable to generate"):                    |
|   |     |     +-- Request fallback review from preferred agent      |
|   |     |                                                           |
|   |     +-- CI passes but no reviews exist:                         |
|   |     |     +-- Wait 60s --> request fallback review              |
|   |     |                                                           |
|   |     +-- Claude posts review response:                           |
|   |           +-- No issues flagged --> auto-approve                |
|   |           +-- Issues flagged --> request Claude fix             |
|   |                                                                 |
|   +-- review-relay.yml:                                             |
|         |                                                           |
|         +-- Trigger: bot submits review (commented/changes_req)     |
|         +-- Only relays bot reviewers (gemini, copilot)             |
|         +-- Skips merged/closed PRs                                 |
|         +-- Collects inline comments from the reviewer              |
|         +-- Posts @claude comment with review summary               |
|         +-- Safety limit: 3 relay rounds                            |
|         +-- After limit: "human should review"                      |
|         +-- Review body passed via env (not shell interpolation)    |
|                                                                     |
|   Review feedback --> @claude comment --> claude.yml runs on PR:    |
|     1. Claude fixes the code on the PR branch                      |
|     2. Resolves review threads                                     |
|     3. Pushes directly to PR branch (NO verify-merge)              |
|     4. Enables auto-merge on PR                                    |
|                                                                     |
|   Auto-merge triggers when:                                         |
|     [x] All status checks pass (test, e2e, build)                  |
|     [x] PR is approved                                             |
|     [x] Conversations resolved (branch ruleset)                    |
+----------------------------+----------------------------------------+
                             |
                             v
+---------------------------------------------------------------------+
| 5. ORCHESTRATION (orchestrate.yml)                                  |
|                                                                     |
|   Trigger: PR merged to master                                      |
|   Gate: PIPELINE_ENABLED != 'false'                                 |
|                                                                     |
|   1. Extract story number from PR body ("Closes #N")                |
|   2. Close story issue, label "completed"                           |
|   3. Find next pending story in same epic (lowest issue number)     |
|      +-- No more stories --> close the epic                         |
|      +-- Next story found:                                          |
|           4. Safety check: >=3 consecutive unmerged PRs --> pause   |
|           5. Label story "in-progress"                              |
|           6. Comment @{PREFERRED_AGENT} to implement                |
|              +-- This triggers claude.yml --> back to step 2        |
+---------------------------------------------------------------------+
```

---

## Recovery & Health (watcher.yml -- every 20 min)

```
+---------------------------------------------------------------------+
| PIPELINE WATCHER                                                    |
|                                                                     |
| Gate: PIPELINE_ENABLED != 'false'                                   |
| Concurrency limit: 3 simultaneous Claude runs                       |
|                                                                     |
| 1. CHECK OPEN claude/ PRs                                           |
|    +-- Merge conflicts --> @claude to rebase                        |
|    +-- CI failing + no commits in 15min --> @claude to fix          |
|    |   (up to 5 retries per PR)                                     |
|    +-- Missing CI check + stale --> close/reopen to retrigger       |
|    +-- Track which epics are "busy" (have open PR)                  |
|                                                                     |
| 2. CHECK IN-PROGRESS STORIES (no PR yet)                            |
|    +-- >=5 @claude attempts --> create "pipeline-stuck" issue       |
|    +-- Last trigger < 15min ago --> skip (grace period)             |
|    +-- Epic already busy --> skip                                   |
|    +-- Otherwise --> re-trigger @claude                             |
|                                                                     |
| 3. CHECK STALLED EPICS                                              |
|    +-- No in-progress story + pending stories exist                 |
|    |    +-- Trigger next pending story                              |
|    +-- No open stories at all                                       |
|    |    +-- Close the epic                                          |
|    +-- Epic already busy --> skip                                   |
|                                                                     |
| 4. CLOSE ORPHAN PRs                                                 |
|    +-- claude/ PRs with no "Closes #N" in body                     |
|    +-- Older than 15min + no recent activity                        |
|    +-- Close PR + delete branch                                     |
+---------------------------------------------------------------------+
```

---

## Verify-Merge: Detailed Check Pipeline

```
+---------------------------------------------------------------------+
| VERIFY JOB - Checks run in order, fail-fast                         |
|                                                                     |
|   1. eslint --quiet (changed files vs master only)                   |
|   2. pnpm typecheck                                                 |
|   3. npx react-native bundle (metro bundle check)                   |
|   4. pnpm test                                                      |
|   5. Native dependency check:                                       |
|      - Scan package.json for react-native-* / @react-native-*      |
|      - Check if each has .podspec or ios/ dir (native code)         |
|      - Verify it appears in ios/Podfile.lock                        |
|      - Fail if native pkg is missing from Podfile.lock              |
|                                                                     |
| FIX JOB - Claude's error context                                    |
|                                                                     |
|   Error files captured:                                             |
|     /tmp/lint_errors.txt                                            |
|     /tmp/tc_errors.txt                                              |
|     /tmp/bundle_errors.txt                                          |
|     /tmp/test_errors.txt                                            |
|     /tmp/native_dep_errors.txt                                      |
|                                                                     |
|   Native dep constraint: CI runs on Ubuntu, cannot run              |
|   `pod install`. Claude must work around unlinked native deps       |
|   (lazy imports, optional requires) -- Podfile.lock must be         |
|   updated on macOS by a human.                                      |
+---------------------------------------------------------------------+
```

---

## Issue vs PR Context: Two Paths in claude.yml

This is a critical architectural distinction. When `@claude` is commented on an **issue** vs a **PR**, the workflow takes fundamentally different paths:

```
                        @claude comment
                             |
                    +--------+--------+
                    |                 |
              Issue context      PR context
              (new work)         (fix reviews)
                    |                 |
                    v                 v
           Stay on master      Checkout PR branch
                    |                 |
           claude-code-action   Claude fixes code
           creates branch            |
           claude/issue-N-TS         |
                    |                 |
           Push to tmp branch   Push directly to
           tmp/claude-<run_id>  PR branch
                    |                 |
           Extract issue #      Resolve review
                    |           threads
           Trigger              |
           verify-merge.yml     Enable auto-merge
                    |                 |
           (verify, fix loop,        |
            merge, create PR)        |
                    |                 |
                    v                 v
              New PR created    Existing PR updated
              (needs review)    (CI re-runs, may
                                 auto-merge)
```

**Why two paths?**
- Issue context: No PR exists yet. Work needs validation before creating a PR.
  verify-merge runs lint/typecheck/test, fixes errors, then creates the PR.
- PR context: PR already exists with CI checks. Pushing directly to the PR
  branch triggers CI automatically. No need for a redundant verify-merge cycle.

---

## Edge Cases & Safety Mechanisms

### Bot Comment Isolation
- **Problem**: claude[bot] posts status comments that trigger `issue_comment`
- **Solution**: Concurrency group includes `${{ github.event.comment.user.login }}`
  - Human run: `claude-247-johnnyohwishingtree`
  - Bot run: `claude-247-claude[bot]`
- **Also**: `github.event.comment.user.type != 'Bot'` filter skips bot-triggered runs

### Fix Attempt Isolation
- **Problem**: verify-merge attempt 2 could cancel attempt 1's fix job
- **Solution**: Concurrency group includes attempt number
  - `verify-merge-tmp/claude-123-attempt-1`
  - `verify-merge-tmp/claude-123-attempt-2`
- `cancel-in-progress: false` prevents any cancellation

### Branch Naming
- **Problem**: `claude-code-action@v1` creates its own `claude/issue-N-TIMESTAMP` branch
- **Solution**: Don't pre-create branches for issue triggers. The push step captures whatever branch Claude ends up on via `git branch --show-current`

### Give-Up Comment
- **Problem**: Give-up text containing `@claude` triggered a new ghost run
- **Solution**: Give-up comment uses neutral language, no agent mentions

### Auto-Merge Timing
- **Problem**: Auto-merge on PR creation skipped bot review feedback
- **Solution**: verify-merge creates PR without auto-merge. claude.yml enables auto-merge only after addressing reviews (PR context)

### Review Relay Loop Prevention
- 3 relay rounds max per PR
- Count by comment body content (not author, since GH_PAT posts as PAT owner)

### Review Body Shell Injection
- **Problem**: `${{ github.event.review.body }}` interpolated in shell `run:` blocks caused review text to be executed as shell commands
- **Solution**: Pass review body via `env:` block, reference as `$REVIEW_BODY`

### Duplicate verify-merge from Review Relay
- **Problem**: verify-merge creates PR --> Gemini reviews --> review-relay posts `@claude` --> claude.yml runs again on same branch --> dispatches redundant verify-merge
- **Solution**: claude.yml detects issue vs PR context. PR-context runs push directly to the PR branch and skip verify-merge entirely. Only issue-context runs go through verify-merge.

### Lint Scope in verify-merge
- **Problem**: `pnpm lint` has thousands of pre-existing errors in generated/third-party files. verify-merge's lint step always failed, causing infinite fix loops where Claude fixed its own errors but lint still exited non-zero.
- **Solution**: verify-merge only lints files changed vs master (`git diff --name-only origin/master...HEAD`), using `eslint --quiet` (errors only, no warnings). This catches new lint errors without failing on pre-existing ones.
- **Note**: `test.yml` (normal CI) doesn't run lint at all — only typecheck, bundle, and test.

### Native Dependency Linkage
- **Problem**: Claude adds `react-native-*` packages on Ubuntu CI but can't run `pod install` to link them in iOS
- **Solution**: verify-merge checks that every native package in `package.json` appears in `ios/Podfile.lock`. If missing, the fix job is told to use lazy/optional imports instead of failing on the missing linkage.

### Race Condition: PR Merged While Pipeline Runs
- **Problem**: If a PR is manually merged while claude.yml or verify-merge is still running, subsequent steps try to checkout deleted branches
- **Impact**: Harmless failure -- the work was already merged
- **Mitigation**: verify-merge's merge job checks if the target branch exists before checkout

### Consecutive Failure Detection
- orchestrate.yml checks for 3+ unmerged PRs --> pauses pipeline, creates bug issue
- watcher.yml checks for 5+ @claude attempts on a story --> creates "pipeline-stuck" issue

### Concurrency Limiting
- watcher.yml tracks active Claude runs (max 3)
- Won't trigger new stories if at capacity
- Tracks "busy epics" to avoid parallel work on same epic

### Stale Resource Cleanup
- verify-merge give-up: cleans tmp/ branches (keeps current)
- watcher: closes orphan PRs (no linked story, stale)

---

## Complete Lifecycle Example

```
                    Human or Planner
                         |
                    "Epic: Add WebView submission"
                    + Story 1, 2, 3, 4
                         |
                    @claude on Story 1
                         |
               +---------v----------+
               |    claude.yml      |
               |  (issue context)   |
               |  Claude implements |
               |  Push --> tmp branch|
               +--------+-----------+
                         |
               +---------v----------+
               |  verify-merge.yml  | <--- attempt 1/6
               |  lint, typecheck,  |
               |  bundle, test,     |
               |  native dep check  |
               +--------+-----------+
                         | pass
               +---------v----------+
               |  Merge --> PR #259 |
               |  (no auto-merge)   |
               +--------+-----------+
                         |
               +---------v----------+
               |  Gemini reviews    |
               |  "2 medium issues" |
               +--------+-----------+
                         |
               +---------v----------+
               | review-relay.yml   |
               | @claude fix issues |
               +--------+-----------+
                         |
               +---------v----------+
               |    claude.yml      |
               |  (PR context)      |
               |  Fix review issues |
               |  Push to PR branch |  <--- direct push, NO verify-merge
               |  Resolve threads   |
               |  Enable auto-merge |
               +--------+-----------+
                         |
               +---------v----------+
               |  CI re-runs on PR  |
               |  test.yml passes   |
               |  e2e-smoke passes  |
               +--------+-----------+
                         |
               +---------v----------+
               |  Auto-merge fires  |
               |  (checks pass,     |
               |   approved,        |
               |   threads resolved)|
               +--------+-----------+
                         |
               +---------v----------+
               |  orchestrate.yml   |
               |  Close Story 1     |
               |  @claude Story 2   |
               +--------+-----------+
                         |
                    (cycle repeats)
                         |
               +---------v----------+
               |  All stories done  |
               |  Close Epic        |
               +--------------------+
```

---

## Token/Cost Efficiency Notes

- **PR context skips verify-merge**: This is the biggest token saver. Review fixes push directly to the PR branch, avoiding a full verify-merge cycle (checkout, install, lint, typecheck, test, potentially 6 fix attempts).
- **verify-merge fail-fast**: Checks run in order (lint --> typecheck --> bundle --> test --> native dep). If lint fails, test doesn't run.
- **Fix job gets all errors at once**: All 5 error files are captured before Claude starts fixing, so it can address everything in one pass.
- **Concurrency limits**: Max 3 simultaneous Claude runs prevents runaway costs.
- **Relay limit**: Max 3 review relay rounds per PR prevents infinite review-fix cycles.
