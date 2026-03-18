# Pipeline Edge Cases & Safety Mechanisms (Detailed)

This file contains the full root-cause analysis and solutions for every pipeline bug we've encountered. The summary table lives in `pipeline-architecture.md`. Come here when you need to debug a stuck pipeline.

Each bug should have a corresponding regression test in `.github/scripts/__tests__/lib/`.

---

## Concurrency & Race Conditions

### Bot Comment Isolation
- **Problem**: claude[bot] posts status comments that trigger `issue_comment`
- **Solution**: Concurrency group includes `${{ github.event.comment.user.login }}`
  - Human run: `claude-247-johnnyohwishingtree`
  - Bot run: `claude-247-claude[bot]`
- **Also**: `github.event.comment.user.type != 'Bot'` filter skips bot-triggered runs

### Cancellation by Status Comments
- **Problem**: `claude-code-action` posts "Claude Code is working..." status comments via the GH_PAT (same user as the triggerer). This triggers a new workflow run in the same concurrency group with `cancel-in-progress: true`, which cancels the real `@claude` run. The replacement run then skips because the status comment doesn't contain `@claude`. Net result: real work cancelled, nothing runs.
- **Solution**: `cancel-in-progress: ${{ contains(github.event.comment.body, '@claude') }}`. Only comments containing `@claude` can cancel a previous run. Status comments still trigger the workflow (unavoidable) but queue harmlessly with `cancel-in-progress: false`, then skip at the job `if` condition.

### Fix Attempt Isolation
- **Problem**: verify-and-fix attempt 2 could cancel attempt 1's fix job
- **Solution**: Concurrency group includes attempt number
  - `verify-fix-tmp/claude-123-attempt-1`
  - `verify-fix-tmp/claude-123-attempt-2`
- `cancel-in-progress: false` prevents any cancellation

### Watcher Race Condition
- **Problem**: Pipeline watcher retriggers `@claude` on in-progress stories while `claude.yml` or `verify-and-fix.yml` is still running, creating duplicate competing runs.
- **Solution**: Watcher collects issue numbers from all active/queued `claude.yml` and `verify-and-fix.yml` runs by parsing `displayTitle` (e.g., "Verify #277 -> ..."). Skips retrigger if any workflow is already in flight for that story.
- **Bug fixed**: Originally tried to read `verify-and-fix.yml` inputs via `gh api .inputs.issue_number`, but `.inputs` is `null` for `workflow_dispatch` runs via the API. Switched to parsing `displayTitle` like we do for `claude.yml`.

### Review-Fix Race Condition (PR #380)
- **Problem**: When a bot reviewer posted a COMMENTED review, two things happened concurrently: (1) review-relay dispatched review-fix.yml to address the feedback, and (2) review-guardian waited 90s then checked for `@claude.*review round` comments to decide whether to defer approval. But review-relay no longer posts `@claude` comments (it dispatches review-fix.yml directly), so the regex never matched. review-guardian auto-approved, auto-merge saw all conditions met, and merged the PR while review-fix was still running -- review feedback was never addressed.
- **Solution**: Two fixes: (1) review-guardian now checks `is_workflow_active("review-fix.yml")` before auto-approving, and also checks for review-relay's actual comment format ("Dispatched review-fix workflow"). (2) evaluate-merge-gate.sh adds a 6th condition: `no_active_fix` -- the merge gate will not merge while any review-fix.yml run is in_progress or queued for the PR.

### Race Condition: PR Merged While Pipeline Runs
- **Problem**: If a PR is manually merged while claude.yml or verify-and-fix is still running, subsequent steps try to checkout deleted branches
- **Impact**: Harmless failure -- the work was already merged
- **Mitigation**: verify-and-fix's merge job checks if the target branch exists before checkout

---

## Branch & Push Issues

### Branch Naming (Three Branches)
- **Problem**: `claude-code-action@v1` creates its own `claude/issue-N-TIMESTAMP` branch and pushes to it via its built-in push script, ignoring our system prompt push command
- **Solution**: We create two branches upfront: `claude/issue-N` (clean PR branch) and `tmp/claude-<run_id>` (work branch for verify-and-fix). The action also creates `claude/issue-N-TIMESTAMP` and Claude pushes milestones there. This is fine -- work is safe on the remote. The end-of-run step copies everything to `tmp/` for verify-and-fix. Three branches total:
  1. `claude/issue-N` -- clean PR branch, only receives verified code via verify-and-fix
  2. `tmp/claude-<run_id>` -- work branch for verify-and-fix (populated at end-of-run)
  3. `claude/issue-N-TIMESTAMP` -- action's internal branch (mid-run pushes land here)

### Same tmp_branch and target_branch
- **Problem**: verify-and-fix can be triggered with source branch == target branch (e.g., manual retrigger or when claude-code-action pushes directly to the target). The merge step merges a branch into itself (no-op), then the delete step deletes the target branch, and `gh pr create` fails because GitHub's ref is gone.
- **Solution**: Three guards: (1) merge step skips `git merge` when branches are the same, (2) delete step skips when branches are the same -- never delete the target branch, (3) PR creation retries with a fresh branch name (`pr/issue-N`) if GitHub returns "Head sha can't be blank" or "No commits between" errors (handles stale ref cache after force-pushes).

### Post-Action Push Race
- **Problem**: `claude-code-action@v1` uses an internal `git-push.sh` script that pushes to the PR/tmp branch mid-run. Our post-action push steps then fail with non-fast-forward rejection.
- **Solution**: All post-action push steps fetch the remote, compare HEAD to remote HEAD. If equal, skip (nothing new). If ahead, rebase before pushing. If behind, pull --rebase first.

### Mid-Run Push Falsely Triggers "No Changes" Give-Up
- **Problem**: The fix prompt tells Claude to "push after each milestone." When Claude pushes mid-run, local HEAD == remote HEAD by the time the post-step runs. The old check (`local == remote -> no changes`) falsely triggered the give-up path, aborting the fix loop even though Claude successfully fixed and pushed.
- **Solution**: A `pre_fix` step saves HEAD before Claude runs. The "no changes" check now only triggers give-up if **both** local and remote HEAD equal the pre-fix HEAD (nothing changed at all). If `local == remote != pre_fix`, Claude already pushed -- skip the push but continue to trigger the next verify attempt.

### Tmp Branch Diverged from Master
- **Problem**: Tmp branches created before pipeline fixes land on master don't have those fixes (e.g., `.eslintignore`, lint config). Checks fail for reasons unrelated to the actual code.
- **Solution**: Both verify and fix jobs merge master into the tmp branch before running checks. If the merge conflicts, verify fails fast and the fix job Claude resolves the conflicts.

### Duplicate PR Prevention
- **Problem**: `claude-code-action@v1` creates timestamped branches (`claude/issue-N-YYYYMMDD-HHMM`), while `claude.yml` pre-creates `claude/issue-N`. Both can end up with PRs, creating duplicates for the same issue.
- **Solution**: verify-and-fix's "Create PR" step now checks for existing open PRs that reference the same issue (`Closes #N in:body`), not just PRs from the same branch.

### Auto-Merge Branch Behind Master
- **Problem**: When multiple PRs merge in quick succession, remaining PRs fall behind master (`mergeStateStatus: "BEHIND"`). `gh pr merge --squash` fails silently because the branch isn't up-to-date. Auto-merge evaluates all conditions as met but can't actually merge. The watcher detects the stuck PR and dispatches auto-merge, but auto-merge hits the same `BEHIND` failure. Neither watcher, doctor, nor auto-merge updates the branch -- so PRs sit open indefinitely.
- **Solution**: Added a `BEHIND` check in auto-merge.yml before attempting `gh pr merge`. When the branch is behind master, auto-merge uses the GitHub merges API (`POST repos/{owner}/{repo}/merges`) to merge master into the PR branch. This triggers CI to re-run on the updated branch, which triggers `workflow_run`, which re-evaluates auto-merge -- completing the cycle. The merge attempt is deferred until the branch is up-to-date.

### Merge Conflict Resolution Polluting PRs
- **Problem**: Work branches accumulate unrelated commits from master merges. When Claude resolves merge conflicts, it may keep both sides instead of taking master's version for non-story files, polluting the PR with unintended changes.
- **Solution**: Fix prompt instructs Claude to use `git checkout origin/master -- <file>` for non-story files during conflict resolution.

### Automated Merge Conflict Resolution (resolve-conflicts.yml)
- **Trigger**: On push to master (checks all open PRs) or manual dispatch for a specific PR
- **Logic**: Infrastructure files (`.github/`, `docs/pipeline*`, `CLAUDE.md`) and lock files take master's version. PR-modified files take the branch's version. If conflicts can't be auto-resolved, a comment is posted listing the files needing manual attention.
- **Purpose**: Prevents PRs from going stale when master moves ahead. Previously, merge conflicts accumulated silently and were only discovered during verify-and-fix.

---

## Review & Approval Issues

### Auto-Approve Doesn't Trigger Auto-Merge (PR #382)
- **Problem**: After review-fix resolved feedback and pushed, CI re-ran, `ensure-review` detected the approval was missing and called `gh pr review --approve`. But the approval used `GITHUB_TOKEN`, and GitHub suppresses `pull_request_review` events for actions performed by the same workflow's token (anti-recursion). Since `auto-merge.yml` relies on `pull_request_review` events to re-evaluate, the PR sat approved but unmerged indefinitely.
- **Solution**: All three auto-approve paths in review-guardian (`request-approval`, `auto-approve-after-claude`, `ensure-review`) now dispatch `auto-merge.yml` via `workflow_dispatch` immediately after approving. This ensures auto-merge re-evaluates regardless of whether GitHub fires the `pull_request_review` event.

### Review Relay Loop Prevention
- 3 relay rounds max per PR
- Count by comment body content (not author, since GH_PAT posts as PAT owner)

### Review Body Shell Injection
- **Problem**: `${{ github.event.review.body }}` interpolated in shell `run:` blocks caused review text to be executed as shell commands
- **Solution**: Pass review body via `env:` block, reference as `$REVIEW_BODY`

### Duplicate verify-and-fix from Review Relay
- **Problem**: verify-and-fix creates PR --> Gemini reviews --> review-relay posts `@claude` --> claude.yml runs again on same branch --> dispatches redundant verify-and-fix
- **Solution**: claude.yml detects issue vs PR context. PR-context runs push directly to the PR branch and skip verify-and-fix entirely. Only issue-context runs go through verify-and-fix.

### Gemini Inline Priority Badges Bypass Auto-Approve
- **Problem**: Gemini posts inline review comments with priority badges like `![high]` and `![critical]` but submits the overall review as `COMMENTED` (not `CHANGES_REQUESTED`). The review-guardian only checked the review summary body for keywords like `critical` and `high-priority`, so it missed badge-formatted priorities in inline comments and auto-approved PRs that still had unresolved high/critical feedback.
- **Solution**: All three auto-approve paths in `review-guardian.yml` (`request-approval`, `ensure-review`, `auto-approve-after-claude`) now fetch inline PR review comments via `gh api repos/.../pulls/N/comments` and match against `![high]` and `![critical]` badge patterns (regex: `!\[(critical|high)\]`) in addition to the existing keyword patterns. If any such badges are found in unresolved review threads, auto-approve is skipped and a comment is posted explaining why. If all threads containing these badges have been resolved (meaning the feedback was addressed by review-fix), the badge check is bypassed and auto-approval proceeds. `review-relay.yml` remains the single owner of triggering Claude to fix the flagged issues.

### Duplicate `@claude` Triggers from Reviews
- **Problem**: When Gemini posts a review with critical issues, both `review-guardian.yml` and `review-relay.yml` post separate `@claude` comments. With `cancel-in-progress: true`, earlier runs get killed by later ones, and Claude may end up with confused context from multiple overlapping instructions.
- **Solution**: `review-guardian.yml` no longer posts `@claude` when it finds critical issues -- it just skips auto-approve. `review-relay.yml` is the single owner of triggering Claude to fix review feedback, since it includes the actual inline comments with file paths and line numbers.

### Review Relay Tool Restriction
- **Problem**: `claude-code-action@v1` restricts tools when triggered from a PR comment -- only Read, Glob, Grep, git status/diff/log, and a comment MCP tool are allowed. `Edit`, `Write`, `MultiEdit`, `git push`, `pnpm` are all stripped regardless of what `settings.allowedTools` specifies. This means `@claude` comments on PRs (from review-relay) can't make code changes -- Claude can only respond with comments.
- **Solution**: review-relay no longer posts `@claude` PR comments. Instead it dispatches `review-fix.yml` via `workflow_dispatch`, which runs Claude with full tool permissions on the PR branch. The `prompt` input carries the review feedback.
- **Key insight**: `claude-code-action@v1` has two modes: (1) issue/`workflow_dispatch` = full tools, (2) PR comment = restricted read-only tools. Always use `workflow_dispatch` when code changes are needed.

### Review Fix Verification Gate
- **Problem**: `review-fix.yml` ran Claude to fix review feedback, then pushed directly to the PR branch without checking if the fixes passed typecheck/tests. This caused PRs to ship with broken code.
- **Solution**: Added a verification step between Claude's run and the push. Runs `pnpm typecheck`, `pnpm test`, and Playwright E2E tests -- if any fail, changes are NOT pushed and a failure comment is posted on the PR. The job exits 1 so it shows red, not green. Claude's prompt explicitly says "do NOT push" -- the workflow handles pushing only after all checks pass.
- **Why E2E**: Review-fix originally only verified typecheck + unit tests. A Playwright API misuse (`page.off('dialog')` without a function ref) passed both checks but crashed at E2E runtime (PR #386). E2E tests were added to the verification gate to catch this class of errors.

### Review-Fix Missing Firefox Browser
- **Problem**: review-fix.yml verify step installs only chromium (`npx playwright install --with-deps chromium`) but the Playwright config includes a `firefox-smoke` project for cross-browser testing. All 4 firefox tests fail with `browserType.launch: Executable doesn't exist at .../firefox-1509/firefox/firefox`, causing the entire verify gate to fail — even though the code changes are correct.
- **Solution**: Install both browsers: `npx playwright install --with-deps chromium firefox`, matching what e2e-smoke.yml's cross-browser job installs.

### Review Threads Not Resolved After Fix (Auto-Merge Deadlock)
- **Problem**: When `review-fix.yml` addressed review feedback and pushed fixes, it failed to resolve the corresponding review threads. This created a deadlock because `auto-merge.yml` requires all threads to be resolved (Condition 4), preventing PRs from merging. This happened because the thread resolution logic from `claude.yml` (PR context path) was missing in `review-fix.yml`.
- **Solution**: A "Resolve review threads" step was added to `review-fix.yml`. It uses the GitHub GraphQL API's `resolveReviewThread` mutation to resolve all unresolved threads after verification passes. Crucially, threads are resolved *before* the push. This ensures that when the push triggers `auto-merge.yml` via `pull_request: synchronize`, the threads are already resolved and the merge gate can pass in a single evaluation.

### Stuck PR: Unresolved Threads After Review-Fix
- **Problem**: `review-fix.yml` addresses review feedback and pushes, but if it ran with an older workflow version that lacked the "resolve review threads" step, threads remain unresolved. The review-guardian sees `![high]`/`![critical]` badge comments with unresolved threads and blocks approval. The watcher previously skipped PRs that exist ("waiting for review/merge") without checking if the approval flow was stuck. Neither the watcher nor pipeline-doctor detected this deadlock.
- **Solution (3 layers)**:
  1. **Watcher**: Detects PRs where CI passes, no approval exists, and review threads are unresolved for >15min. Resolves threads and closes/reopens the PR to retrigger approval. If this fails twice, escalates to the pipeline doctor.
  2. **Pipeline Doctor**: Evidence collection now includes "PR Merge Readiness" section showing approval count, unresolved thread count, CI status, and review-fix run history. Known bug pattern #9 documents this deadlock. The doctor's prompt includes specific instructions for resolving threads via GraphQL.
  3. **review-fix.yml**: Already has a "Resolve review threads" step (added in PR #345), preventing this from recurring on new runs.

### Review-Guardian Bypassing Claude's "Request Changes" Verdict
- **Problem**: Claude sometimes posts code reviews as issue comments (not formal PR reviews). When Claude's review contains "Request Changes" or flags critical issues, the `ensure-review` job in review-guardian doesn't detect this. It only checks inline PR review comments for `![critical]`/`![high]` badges, so it auto-approves the PR despite Claude's verdict. This allowed PR #349 to merge with known critical bugs.
- **Solution**: Added a check in `ensure-review`'s auto-approve step that finds the **latest** bot review comment (Claude, Gemini, Copilot) and checks for "Request Changes", "critical bug/issue/problem", or "do not merge" patterns. If found, auto-approve is blocked -- unless a fix was already requested AND new commits were pushed after the review (meaning the issues were addressed). This prevents both the bypass (merging with critical bugs) and the deadlock (permanently blocking approval after fixes land).

### Premature Auto-Approve Before Gemini Inline Comments (PR #388)
- **Problem**: `ensure-review` (triggered by CI passing) counted bot issue comments (Gemini's auto-summary) as "reviews" and immediately auto-approved. But Gemini posts its summary comment BEFORE finishing code analysis. The actual review with `![high]`/`![critical]` inline badges arrives ~2 minutes later via `pull_request_review: submitted`. By then, the PR was already approved and merged.
- **Timeline**: CI passes (23:04) → ensure-review sees bot comment, approves (23:04:23) → auto-merge merges (23:04:33) → Gemini posts `![high]` inline comment (23:06:07, too late).
- **Root cause**: `ensure-review` treated ANY bot comment as evidence of a completed code review. It bypassed the `pull_request_review` event hook where inline comments are guaranteed to exist.
- **Solution**:
  - `ensure-review` no longer auto-approves — it only counts **formal PR reviews** (from `.reviews[]`), not bot issue comments.
  - Approval flows exclusively through event-driven hooks:
    - `request-approval` (triggered by `pull_request_review: submitted` — inline comments guaranteed present)
    - `auto-approve-after-claude` (triggered by Claude's comment)
  - When `ensure-review` finds no formal review, it requests a Claude fallback review instead of waiting with arbitrary sleeps.
  - When a formal review exists but no approval, it dispatches `auto-merge` for re-evaluation instead of approving directly.

### Auto-Merge Retrigger When Event Window Missed
- **Problem**: When a PR has all merge conditions met (CI passes, approved, no unresolved threads) but auto-merge missed the event window, the PR sits open indefinitely. The original fix (PR #350) used close/reopen, but `auto-merge.yml` doesn't listen for `reopened` events -- only `workflow_run`, `pull_request_review`, and `synchronize`.
- **Solution**: Added `workflow_dispatch` trigger to `auto-merge.yml` with a `pr_number` input. The watcher dispatches `auto-merge.yml` to re-evaluate and merge. This keeps the watcher as the orchestrator (detect + dispatch) and auto-merge as the single merge gate (evaluate + merge).

---

## Fix Job Issues

### Give-Up Comment
- **Problem**: Give-up text containing `@claude` triggered a new ghost run
- **Solution**: Give-up comment uses neutral language, no agent mentions

### Auto-Merge Gate
- **Problem**: Auto-merge on PR creation skipped bot review feedback and merged before reviews
- **Solution**: `auto-merge.yml` is the single gate controlling all merges to master. It evaluates on every CI completion, review submission, and PR sync. Merges only when all six conditions are met: tests pass, E2E passes (all 3 jobs), PR approved, no unresolved threads, no active review-fix runs, branch up to date. No other workflow merges PRs.

### Fix Job Permission Denials
- **Problem**: verify-and-fix fix job's `allowedTools` had an explicit whitelist of Bash subcommands (`Bash(cat:*)`, `Bash(grep:*)`, etc.). Any Bash command not in the list caused a permission denial. Claude would attempt common commands like `ls`, `echo`, `sed`, `find`, etc., get denied, and retry -- burning through turns doing nothing. One run had **56 permission denials in 48 turns**, taking 11 minutes and $2 for a one-line typecheck fix.
- **Solution**: `allowedTools` is now passed via `claude_args: --allowedTools` (not `settings` JSON) across all workflows. The SDK's `--allowedTools` flag both exposes AND auto-approves tools, bypassing the sandbox permission prompt. Putting `allowedTools` in `settings` JSON only lists available tools but still requires sandbox approval -- which fails silently in CI with no human to approve. Also added `permissions.allow` with `Edit(*)`, `Write(*)`, `MultiEdit(*)` to pre-approve file writes (belt-and-suspenders). Also reduced `maxTurns` to 15 for fix jobs, added `show_full_output: true` for debugging, simplified fix prompt, and added a post-step that fails the job if >5 permission denials occur (so it shows red and aborts the retry loop instead of silently wasting turns).

### Fix Attempts Repeating Same Failed Fix
- **Problem**: Each verify-and-fix fix attempt starts with fresh Claude context. Claude has no idea what previous attempts tried, so it often repeats the same failed approach across all 6 attempts.
- **Solution**: A `.claude-fix-log.md` file on the tmp branch persists across attempts. Each fix attempt reads it first, then appends what it tried and whether it worked. The merge job deletes it before merging so it never reaches the PR.

### Stale Test Assertions (Fix Job Context Gap)
- **Problem**: Code is intentionally changed (e.g., fixing a wrong URL), but existing tests still assert the old value. The fix job sees "expected A, got B" but has no context about whether the code change or the test is correct. Result: Claude produces zero file changes across all 6 attempts, and the pipeline doctor also can't resolve it.
- **Solution**: verify-and-fix fix job now includes commit context -- `git log --oneline` and `git diff --stat` of the work branch vs master. This tells Claude what was intentionally changed and why, so it can decide whether to update tests or revert code. Pipeline doctor also now checks out the work branch, reproduces failures, and includes commit history + actual Expected/Received values in its evidence.

### Lint Scope in verify-and-fix
- **Problem**: `pnpm lint` has thousands of pre-existing errors in generated/third-party files. verify-and-fix's lint step always failed, causing infinite fix loops where Claude fixed its own errors but lint still exited non-zero.
- **Solution**: verify-and-fix only lints files changed vs master (`git diff --name-only origin/master...HEAD`), using `eslint --quiet` (errors only, no warnings). This catches new lint errors without failing on pre-existing ones.
- **Note**: `test.yml` (normal CI) doesn't run lint at all -- only typecheck, bundle, and test.

### Native Dependency Linkage
- **Problem**: Claude adds `react-native-*` packages on Ubuntu CI but can't run `pod install` to link them in iOS
- **Solution**: verify-and-fix checks that every native package in `package.json` appears in `ios/Podfile.lock`. If missing, the fix job is told to use lazy/optional imports instead of failing on the missing linkage.

---

## Timeout & Recovery

### Timeout Work Rescue (claude.yml)
- **Problem**: Claude's job times out (60min limit). All subsequent steps (push, verify-and-fix trigger) are skipped. Uncommitted work is lost.
- **Solution**: Two layers of protection:
  1. **Mid-run pushes**: Claude pushes milestones to `claude/issue-N-TIMESTAMP` (action's internal branch) during the run. Most work is already on the remote before timeout.
  2. **Rescue step**: `if: cancelled()` commits any remaining uncommitted changes and pushes to `tmp/claude-<run_id>`. Comments on the issue with a link and resume instructions. Work ends up on both the internal branch and tmp branch.

### Timeout Work Rescue (verify-and-fix fix job)
- **Problem**: Fix job times out (60min limit). Claude was mid-fix, work is lost, and the fix loop stops.
- **Solution**: Three layers:
  1. **Milestone pushes**: Claude pushes to the tmp branch after each significant fix during the run.
  2. **Rescue step**: `if: cancelled()` commits uncommitted work, pushes to tmp branch.
  3. **Auto-continue**: Rescue step triggers the next verify-and-fix attempt so the fix loop doesn't stall.

---

## Failure Detection & Escalation

### Consecutive Failure Detection
- orchestrate.yml checks for >=3 unmerged PRs --> pauses pipeline, creates bug issue
- watcher.yml checks for >=5 successful claude.yml runs on a story --> triggers pipeline doctor
  (infra failures like push rejections don't count toward retry budget)
- verify-and-fix give-up (6 failed fix attempts) --> triggers pipeline doctor with failed run IDs

### Concurrency Limiting
- watcher.yml tracks active Claude runs (max 3)
- Won't trigger new stories if at capacity
- Tracks "busy epics" to avoid parallel work on same epic

### Pipeline Doctor (pipeline-doctor.yml)
- **Purpose**: Automated diagnosis and fixing of pipeline failures
- **Triggers**: verify-and-fix give-up (after 6 failed attempts), watcher (story stuck at max retries), manual (pass issue number)
- **Evidence collection**: Gathers issue details, related branches/PRs, **work branch commit log and diffs** (to understand intent), **reproduced test failures** with Expected/Received values, failed run logs (`gh run view --log-failed`), current workflow YAML files, known bug patterns, and previous diagnoses -- all with GitHub links for traceability
- **Actions**: If stale test assertions -> checks out work branch and updates tests. If pipeline bug -> creates fix PR. If code bug -> fixes code on the story branch and retriggers verify-and-fix. If unknown -> creates diagnostic issue with label `pipeline-diagnosis`.
- **Repeat run awareness**: Collects logs from previous doctor runs for the same issue. Prompt explicitly tells Claude to try a different approach if previous runs didn't fix the problem.
- **Deduplication**: Watcher checks if doctor already ran (not just if active) before retriggering. Concurrency group prevents parallel runs for same issue.

### Stale Resource Cleanup
- verify-and-fix give-up: cleans tmp/ branches (keeps current)
- watcher: closes orphan PRs (no linked story, stale)
