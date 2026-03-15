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
| `pipeline-doctor.yml` | verify-merge give-up / watcher / manual | Diagnoses pipeline failures, creates fix PRs |
| `test.yml` | Push/PR to master | CI checks (lint, typecheck, test) |
| `e2e-smoke.yml` | Push/PR to master | E2E tests (Playwright) |
| `review-relay.yml` | Bot review submitted | Forwards bot review to Claude |
| `review-guardian.yml` | CI complete / bot comment / review | Ensures PRs get reviewed and approved |
| `auto-merge.yml` | CI complete / review / PR sync | Single merge gate: tests + E2E + approval + threads resolved |
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
|   |     - Check for existing work from previous runs:               |
|   |       Scan claude/issue-N and claude/issue-N-* branches         |
|   |       Pick the one with the most commits ahead of master        |
|   |       If found: check it out so Claude resumes instead of restarting    |
|   |     - Create clean PR branch: claude/issue-N (if not exists)    |
|   |     - Create tmp work branch: tmp/claude-<run_id> (from HEAD)   |
|   |     - claude-code-action creates internal branch                |
|   |       claude/issue-N-TIMESTAMP (we don't control this)          |
|   |     - System prompt includes RESUMING note if previous work     |
|   |       found, telling Claude to continue instead of starting over          |
|   |     - Claude works, pushes milestones to internal branch        |
|   |       (mid-run safety: work is on remote if timeout)            |
|   |     - After completion: push all work to tmp branch             |
|   |     - Trigger verify-merge.yml (tmp --> claude/issue-N)          |
|   |                                                                 |
|   +-- If PR context:                                                |
|         - Checkout existing PR branch                               |
|         - Claude works --> commits to PR branch                     |
|         - Push directly to PR branch (NO verify-merge)              |
|         - Resolve bot review threads                                |
|                                                                     |
|   +-- If TIMEOUT (cancelled after 60min):                           |
|         - Commit all uncommitted work                               |
|         - Push to tmp/claude-<run_id> branch                        |
|         - Comment on issue with tmp branch link                     |
|         - Mid-run pushes also on claude/issue-N-TIMESTAMP           |
|         - Work is preserved in both places                          |
|                                                                     |
|   KEY: Issue context creates two branches upfront + action          |
|   creates a third internally:                                       |
|   - claude/issue-N = clean PR branch (only verified code)           |
|   - tmp/claude-<run_id> = work branch (end-of-run + rescue)         |
|   - claude/issue-N-TIMESTAMP = action's internal branch             |
|     (mid-run pushes land here — work is safe on remote)             |
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
|   +-- LINK-TO-ISSUE job: posts workflow run link on issue           |
|       (runs in parallel with verify, for easy tracking)             |
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
|          |    issue                    |  mode,     |               |
|          |         |                   |  50 turns, |               |
|          |    Trigger                  |  60min)    |               |
|          |    pipeline-               |   |        |               |
|          |    doctor.yml              |   |        |               |
|          |         |                   |   |        |               |
|          |    Clean up                 |   |        |               |
|          |    stale tmp/               | Mid-run    |               |
|          |    branches                 | pushes to  |               |
|          |                             | tmp branch |               |
|          |                             |   |        |               |
|          |                             | Push to    |               |
|          |                             | same tmp   |               |
|          |                             | branch     |               |
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
|                                                                     |
+----------------------------+----------------------------------------+
                             |
                             v
+---------------------------------------------------------------------+
| 4b. AUTO-MERGE GATE (auto-merge.yml)                               |
|                                                                     |
|   Triggers: workflow_run (Tests/E2E complete),                      |
|             pull_request_review (approval submitted),               |
|             pull_request (synchronize)                              |
|                                                                     |
|   Single gate controlling ALL merges to master.                     |
|   Merges only when ALL conditions are met:                          |
|     [x] Tests workflow passed (test job)                            |
|     [x] E2E passed (test-chromium, test-performance,               |
|         test-cross-browser — all 3 jobs)                            |
|     [x] PR has at least one approval                               |
|     [x] No unresolved review threads                               |
|                                                                     |
|   If any condition is not met: logs status and exits.               |
|   Re-evaluates on every trigger until all conditions align.         |
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
|    +-- Active claude.yml or verify-merge run --> skip               |
|    +-- Open PR already exists for this story --> skip               |
|    +-- Existing work branch found (claude/issue-N-* or tmp/)?       |
|    |     YES + verify-merge gave up 2+ times --> pipeline doctor    |
|    |     YES + first time --> trigger verify-merge directly          |
|    |     (skips claude.yml — don't redo work that's already done)   |
|    +-- No existing work:                                            |
|    |   +-- >=5 successful claude.yml runs --> pipeline doctor       |
|    |       (only counts runs where Claude completed, not infra)     |
|    |   +-- Last trigger < 15min ago --> skip (grace period)         |
|    |   +-- Epic already busy --> skip                               |
|    |   +-- Otherwise --> re-trigger @claude                         |
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
|   0. Merge master in (picks up latest config/fixes)                 |
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
|   Error summary embedded directly in prompt:                        |
|     - Top 10 lint/typecheck errors, top 5 bundle errors,            |
|       top 10 test failures are inlined so Claude sees them           |
|       immediately without needing to read files first               |
|                                                                     |
|   Cross-attempt context (.claude-fix-log.md):                       |
|     - Lives on the tmp branch, persists across fix attempts         |
|     - Each attempt reads it first to avoid repeating failed fixes   |
|     - Each attempt appends a log of: errors found, changes made,    |
|       check results, and remaining issues                           |
|     - Merge job deletes it before merging into target branch        |
|                                                                     |
|   Milestone push (mid-run safety):                                  |
|     - Claude is instructed to push after each significant fix       |
|     - git push allowed in tool list, auth configured before Claude  |
|     - If job times out, pushed work survives on the tmp branch      |
|                                                                     |
|   Early bail-out:                                                   |
|     - If Claude produces no changes, skip remaining attempts        |
|     - Comment on issue explaining fix failed, link to tmp branch    |
|                                                                     |
|   Timeout rescue (if: cancelled()):                                 |
|     - Commits any uncommitted work                                  |
|     - Pushes to tmp branch (rebases on mid-run pushes)              |
|     - Auto-triggers next attempt so fix loop continues              |
|     - Comments on issue with status                                 |
|                                                                     |
|   Git tools available to fix job Claude:                            |
|     git add, commit, status, diff, log, show, rm, push,            |
|     fetch, merge, checkout, rebase + pnpm, npx, node               |
|     (fetch/merge/checkout/rebase needed for conflict resolution)    |
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
              (new or resume)    (fix reviews)
                    |                 |
                    v                 v
           Check for existing  Checkout PR branch
           work on claude/           |
           issue-N-* branches  Claude fixes code
                    |                 |
           If found: checkout  Push directly to
           existing work       PR branch
           If not: use master        |
                    |                 |
           Create branches:          |
           - claude/issue-N          |
             (if not exists)         |
           - tmp/claude-<rid>        |
             (from HEAD)             |
                    |                 |
           Action creates      Resolve review
           internal branch:    threads
           claude/issue-N-TS         |
                    |                 |
           Claude works,             |
           mid-run pushes to         |
           internal branch           |
           (safety net)              |
                    |                 |
           End-of-run: push          |
           all to tmp/ branch        |
                    |                 |
           Trigger                   |
           verify-merge.yml          |
           (tmp → claude/issue-N)    |
                    |                 |
                    v                 v
              New PR created    Existing PR updated
              from claude/      (CI re-runs,
              issue-N branch     auto-merge.yml
                                 evaluates gate)
```

**Why two paths?**
- Issue context: No PR exists yet. On retrigger, checks for existing branches
  from previous runs and resumes from the one with the most progress. Creates a
  clean PR branch (`claude/issue-N`) for verified code and a tmp work branch
  (`tmp/claude-<run_id>`) for incremental pushes. verify-merge validates then
  merges into the PR branch.
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

### Cancellation by Status Comments
- **Problem**: `claude-code-action` posts "Claude Code is working…" status comments via the GH_PAT (same user as the triggerer). This triggers a new workflow run in the same concurrency group with `cancel-in-progress: true`, which cancels the real `@claude` run. The replacement run then skips because the status comment doesn't contain `@claude`. Net result: real work cancelled, nothing runs.
- **Solution**: `cancel-in-progress: ${{ contains(github.event.comment.body, '@claude') }}`. Only comments containing `@claude` can cancel a previous run. Status comments still trigger the workflow (unavoidable) but queue harmlessly with `cancel-in-progress: false`, then skip at the job `if` condition.

### Fix Attempt Isolation
- **Problem**: verify-merge attempt 2 could cancel attempt 1's fix job
- **Solution**: Concurrency group includes attempt number
  - `verify-merge-tmp/claude-123-attempt-1`
  - `verify-merge-tmp/claude-123-attempt-2`
- `cancel-in-progress: false` prevents any cancellation

### Branch Naming (Three Branches)
- **Problem**: `claude-code-action@v1` creates its own `claude/issue-N-TIMESTAMP` branch and pushes to it via its built-in push script, ignoring our system prompt push command
- **Solution**: We create two branches upfront: `claude/issue-N` (clean PR branch) and `tmp/claude-<run_id>` (work branch for verify-merge). The action also creates `claude/issue-N-TIMESTAMP` and Claude pushes milestones there. This is fine — work is safe on the remote. The end-of-run step copies everything to `tmp/` for verify-merge. Three branches total:
  1. `claude/issue-N` — clean PR branch, only receives verified code via verify-merge
  2. `tmp/claude-<run_id>` — work branch for verify-merge (populated at end-of-run)
  3. `claude/issue-N-TIMESTAMP` — action's internal branch (mid-run pushes land here)

### Give-Up Comment
- **Problem**: Give-up text containing `@claude` triggered a new ghost run
- **Solution**: Give-up comment uses neutral language, no agent mentions

### Auto-Merge Gate
- **Problem**: Auto-merge on PR creation skipped bot review feedback and merged before reviews
- **Solution**: `auto-merge.yml` is the single gate controlling all merges to master. It evaluates on every CI completion, review submission, and PR sync. Merges only when all four conditions are met: tests pass, E2E passes (all 3 jobs), PR approved, no unresolved threads. No other workflow merges PRs.

### Review Relay Loop Prevention
- 3 relay rounds max per PR
- Count by comment body content (not author, since GH_PAT posts as PAT owner)

### Review Body Shell Injection
- **Problem**: `${{ github.event.review.body }}` interpolated in shell `run:` blocks caused review text to be executed as shell commands
- **Solution**: Pass review body via `env:` block, reference as `$REVIEW_BODY`

### Duplicate verify-merge from Review Relay
- **Problem**: verify-merge creates PR --> Gemini reviews --> review-relay posts `@claude` --> claude.yml runs again on same branch --> dispatches redundant verify-merge
- **Solution**: claude.yml detects issue vs PR context. PR-context runs push directly to the PR branch and skip verify-merge entirely. Only issue-context runs go through verify-merge.

### Duplicate `@claude` Triggers from Reviews
- **Problem**: When Gemini posts a review with critical issues, both `review-guardian.yml` and `review-relay.yml` post separate `@claude` comments. With `cancel-in-progress: true`, earlier runs get killed by later ones, and Claude may end up with confused context from multiple overlapping instructions.
- **Solution**: `review-guardian.yml` no longer posts `@claude` when it finds critical issues — it just skips auto-approve. `review-relay.yml` is the single owner of triggering Claude to fix review feedback, since it includes the actual inline comments with file paths and line numbers.

### Fix Job Permission Denials
- **Problem**: verify-merge fix job's `allowedTools` was missing `Bash(cat:*)`, `Bash(grep:*)`, etc. The prompt tells Claude to "read error files at /tmp/*.txt" but Claude couldn't — `Read` tool only works on project files, and `cat` wasn't allowed. Result: 43 permission denials per attempt, Claude spinning uselessly.
- **Solution**: Added `Bash(cat:*)`, `Bash(head:*)`, `Bash(tail:*)`, `Bash(grep:*)`, `Bash(wc:*)` to the fix job's allowedTools. Also fixed error summary to filter out `● Console` noise lines that drowned out real test failures.

### Fix Attempts Repeating Same Failed Fix
- **Problem**: Each verify-merge fix attempt starts with fresh Claude context. Claude has no idea what previous attempts tried, so it often repeats the same failed approach across all 6 attempts.
- **Solution**: A `.claude-fix-log.md` file on the tmp branch persists across attempts. Each fix attempt reads it first, then appends what it tried and whether it worked. The merge job deletes it before merging so it never reaches the PR.

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

### Tmp Branch Diverged from Master
- **Problem**: Tmp branches created before pipeline fixes land on master don't have those fixes (e.g., `.eslintignore`, lint config). Checks fail for reasons unrelated to the actual code.
- **Solution**: Both verify and fix jobs merge master into the tmp branch before running checks. If the merge conflicts, verify fails fast and the fix job Claude resolves the conflicts.

### Timeout Work Rescue (claude.yml)
- **Problem**: Claude's job times out (60min limit). All subsequent steps (push, verify-merge trigger) are skipped. Uncommitted work is lost.
- **Solution**: Two layers of protection:
  1. **Mid-run pushes**: Claude pushes milestones to `claude/issue-N-TIMESTAMP` (action's internal branch) during the run. Most work is already on the remote before timeout.
  2. **Rescue step**: `if: cancelled()` commits any remaining uncommitted changes and pushes to `tmp/claude-<run_id>`. Comments on the issue with a link and resume instructions. Work ends up on both the internal branch and tmp branch.

### Timeout Work Rescue (verify-merge fix job)
- **Problem**: Fix job times out (60min limit). Claude was mid-fix, work is lost, and the fix loop stops.
- **Solution**: Three layers:
  1. **Milestone pushes**: Claude pushes to the tmp branch after each significant fix during the run.
  2. **Rescue step**: `if: cancelled()` commits uncommitted work, pushes to tmp branch.
  3. **Auto-continue**: Rescue step triggers the next verify-merge attempt so the fix loop doesn't stall.

### Watcher Race Condition
- **Problem**: Pipeline watcher retriggers `@claude` on in-progress stories while `claude.yml` or `verify-merge.yml` is still running, creating duplicate competing runs.
- **Solution**: Watcher collects issue numbers from all active/queued `claude.yml` and `verify-merge.yml` runs by parsing `displayTitle` (e.g., "Verify #277 → ..."). Skips retrigger if any workflow is already in flight for that story.
- **Bug fixed**: Originally tried to read `verify-merge.yml` inputs via `gh api .inputs.issue_number`, but `.inputs` is `null` for `workflow_dispatch` runs via the API. Switched to parsing `displayTitle` like we do for `claude.yml`.

### Same tmp_branch and target_branch
- **Problem**: verify-merge can be triggered with `tmp_branch == target_branch` (e.g., manual retrigger or when claude-code-action pushes directly to the target). The merge step merges a branch into itself (no-op), then the delete step deletes the target branch, and `gh pr create` fails because GitHub's ref is gone.
- **Solution**: Three guards: (1) merge step skips `git merge` when branches are the same, (2) delete step skips when branches are the same — never delete the target branch, (3) PR creation retries with a fresh branch name (`pr/issue-N`) if GitHub returns "Head sha can't be blank" or "No commits between" errors (handles stale ref cache after force-pushes).

### Post-Action Push Race
- **Problem**: `claude-code-action@v1` uses an internal `git-push.sh` script that pushes to the PR/tmp branch mid-run. Our post-action push steps then fail with non-fast-forward rejection.
- **Solution**: All post-action push steps fetch the remote, compare HEAD to remote HEAD. If equal, skip (nothing new). If ahead, rebase before pushing. If behind, pull --rebase first.

### Consecutive Failure Detection
- orchestrate.yml checks for >=3 unmerged PRs --> pauses pipeline, creates bug issue
- watcher.yml checks for >=5 successful claude.yml runs on a story --> triggers pipeline doctor
  (infra failures like push rejections don't count toward retry budget)
- verify-merge give-up (6 failed fix attempts) --> triggers pipeline doctor with failed run IDs

### Concurrency Limiting
- watcher.yml tracks active Claude runs (max 3)
- Won't trigger new stories if at capacity
- Tracks "busy epics" to avoid parallel work on same epic

### Stale Test Assertions (Fix Job Context Gap)
- **Problem**: Code is intentionally changed (e.g., fixing a wrong URL), but existing tests still assert the old value. The fix job sees "expected A, got B" but has no context about whether the code change or the test is correct. Result: Claude produces zero file changes across all 6 attempts, and the pipeline doctor also can't resolve it.
- **Solution**: verify-merge fix job now includes commit context — `git log --oneline` and `git diff --stat` of the work branch vs master. This tells Claude what was intentionally changed and why, so it can decide whether to update tests or revert code. Pipeline doctor also now checks out the work branch, reproduces failures, and includes commit history + actual Expected/Received values in its evidence.

### Pipeline Doctor (pipeline-doctor.yml)
- **Purpose**: Automated diagnosis and fixing of pipeline failures
- **Triggers**: verify-merge give-up (after 6 failed attempts), watcher (story stuck at max retries), manual (pass issue number)
- **Evidence collection**: Gathers issue details, related branches/PRs, **work branch commit log and diffs** (to understand intent), **reproduced test failures** with Expected/Received values, failed run logs (`gh run view --log-failed`), current workflow YAML files, known bug patterns, and previous diagnoses — all with GitHub links for traceability
- **Actions**: If stale test assertions → checks out work branch and updates tests. If pipeline bug → creates fix PR. If code bug → fixes code on the story branch and retriggers verify-merge. If unknown → creates diagnostic issue with label `pipeline-diagnosis`.
- **Repeat run awareness**: Collects logs from previous doctor runs for the same issue. Prompt explicitly tells Claude to try a different approach if previous runs didn't fix the problem.
- **Deduplication**: Watcher checks if doctor already ran (not just if active) before retriggering. Concurrency group prevents parallel runs for same issue.

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
               |  Create branches:  |
               |  - claude/issue-1  |
               |    (clean PR)      |
               |  - tmp/claude-rid  |
               |    (for verify)    |
               |  Action creates:   |
               |  - claude/issue-1  |
               |    -TIMESTAMP      |
               |  Claude implements |
               |  Mid-run pushes    |
               |  --> internal branch|
               |  End: copy to tmp  |
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
               |  Merge tmp -->     |
               |  claude/issue-1    |
               |  Create PR #259    |
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
               +--------+-----------+
                         |
               +---------v----------+
               |  CI re-runs on PR  |
               |  test.yml passes   |
               |  e2e-smoke passes  |
               +--------+-----------+
                         |
               +---------v----------+
               | auto-merge.yml     |
               | evaluates gate:    |
               |  [x] tests pass    |
               |  [x] e2e pass      |
               |  [x] approved      |
               |  [x] threads clear |
               |  --> squash merge  |
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
- **Timeout rescue**: If Claude times out at 60min (in claude.yml or verify-merge fix job), all work is saved via rescue steps. Mid-run milestone pushes preserve most work before timeout even hits. This prevents losing up to 60min of token spend.
- **Watcher skips active work**: Watcher checks for in-flight workflows before retriggering, preventing duplicate runs that waste tokens on the same story.
- **Watcher skips stories with open PRs**: If a PR already exists for a story, the work is done — just needs review/merge. No retrigger needed.
- **Watcher reuses existing work**: If work branches exist from a previous run, watcher triggers verify-merge directly instead of re-running claude.yml from scratch.
- **Pipeline Doctor**: Instead of creating generic "pipeline-stuck" issues, failures escalate to the pipeline doctor which diagnoses root causes and creates targeted fix PRs.
- **Single merge gate**: `auto-merge.yml` consolidates all merge logic. No workflow needs its own merge step — they just push code and let auto-merge evaluate readiness.
