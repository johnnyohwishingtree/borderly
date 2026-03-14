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

## Main Flow: Issue → Merge

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. PLANNING                                                         │
│                                                                     │
│   daily-planner.yml (weekends)                                      │
│     │                                                               │
│     ├─ Gate: ≤3 open epics, ≤10 open stories                       │
│     ├─ Claude creates Epic issue + 3-6 Story issues                 │
│     ├─ Labels: epic, epic:<slug>, story, pending                    │
│     └─ Triggers first story with @claude comment                    │
│                                                                     │
│   OR: Human comments @claude on any story issue                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. IMPLEMENTATION (claude.yml)                                      │
│                                                                     │
│   Trigger: @claude comment (human only, bot filter)                 │
│   Concurrency: per-issue + per-user (bot comments isolated)         │
│                                                                     │
│   ┌─ If PR context: checkout PR branch                              │
│   └─ If Issue context: stay on master                               │
│        └─ claude-code-action creates claude/issue-N-TIMESTAMP       │
│                                                                     │
│   Claude works → commits to its branch                              │
│                                                                     │
│   Post-work steps:                                                  │
│     1. Push all work to tmp/claude-<run_id>                         │
│     2. Resolve bot review threads (PR context only)                 │
│     3. Extract issue number from branch name                        │
│     4. Trigger verify-merge.yml                                     │
│     5. Enable auto-merge on PR (PR context only)                    │
│                                                                     │
│   Outputs:                                                          │
│     tmp_branch = tmp/claude-<run_id>                                │
│     target_branch = claude/issue-N-TIMESTAMP (or PR branch)         │
│     issue_number = N                                                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. VERIFY & MERGE (verify-merge.yml)                                │
│                                                                     │
│   Trigger: workflow_dispatch from claude.yml                        │
│   Concurrency: per-tmp-branch + per-attempt (no cancellation)       │
│   Max attempts: 6                                                   │
│                                                                     │
│   ┌─────────────────────────┐                                       │
│   │ VERIFY job              │                                       │
│   │  Checkout tmp branch    │                                       │
│   │  Run: lint, typecheck   │                                       │
│   │  Run: test (if above ok)│                                       │
│   │  Output: pass=true/false│                                       │
│   └───────┬─────────────────┘                                       │
│           │                                                         │
│     ┌─────┴─────┐                                                   │
│     │           │                                                   │
│   pass=true   pass=false                                            │
│     │           │                                                   │
│     ▼           ├── attempt < 6 ──────────┐                         │
│   ┌─────┐      │                          ▼                         │
│   │MERGE│      │                   ┌────────────┐                   │
│   │ job │    attempt=6             │  FIX job   │                   │
│   └──┬──┘      │                   │            │                   │
│      │         ▼                   │ Capture    │                   │
│      │    ┌─────────┐              │ errors     │                   │
│      │    │GIVE-UP  │              │    ↓       │                   │
│      │    │ job     │              │ Claude fix │                   │
│      │    └────┬────┘              │ (agent     │                   │
│      │         │                   │  mode,     │                   │
│      │    Comment on               │  30 turns) │                   │
│      │    issue (no                │    ↓       │                   │
│      │    @claude!)                │ Push to    │                   │
│      │         │                   │ same tmp   │                   │
│      │    Clean up                 │ branch     │                   │
│      │    stale tmp/               │    ↓       │                   │
│      │    branches                 │ Trigger    │                   │
│      │                             │ verify-    │                   │
│      │                             │ merge      │                   │
│      │                             │ attempt+1  │                   │
│      │                             └─────┬──────┘                   │
│      │                                   │                          │
│      │                        ┌──────────┘                          │
│      │                        │ (loops back to VERIFY)              │
│      │                        │                                     │
│      ▼                        │                                     │
│   ┌─────────────────────┐     │                                     │
│   │ Merge tmp → target  │     │                                     │
│   │ Delete tmp branch   │     │                                     │
│   │ Create PR to master │     │                                     │
│   │ (NO auto-merge)     │     │                                     │
│   └──────────┬──────────┘     │                                     │
│              │                                                      │
└──────────────┼──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. CODE REVIEW                                                      │
│                                                                     │
│   PR created on master ← triggers test.yml + e2e-smoke.yml         │
│                                                                     │
│   ┌─ Gemini Code Assist reviews automatically                      │
│   │    └─ Posts inline comments with severity levels                │
│   │                                                                 │
│   ├─ review-guardian.yml (multiple triggers):                       │
│   │    │                                                            │
│   │    ├─ Bot posts COMMENTED review (no critical issues):          │
│   │    │    └─ Auto-approve the PR                                  │
│   │    │                                                            │
│   │    ├─ Bot posts COMMENTED review WITH critical issues:          │
│   │    │    └─ Comment @claude to fix critical findings             │
│   │    │       (does NOT auto-approve)                              │
│   │    │                                                            │
│   │    ├─ Gemini fails ("unable to generate"):                      │
│   │    │    └─ Request fallback review from preferred agent         │
│   │    │                                                            │
│   │    ├─ CI passes but no reviews exist:                           │
│   │    │    └─ Wait 60s → request fallback review                   │
│   │    │                                                            │
│   │    └─ Claude posts review response:                             │
│   │         ├─ No issues flagged → auto-approve                     │
│   │         └─ Issues flagged → request Claude fix                  │
│   │                                                                 │
│   └─ review-relay.yml:                                              │
│        │                                                            │
│        ├─ Trigger: bot submits review (commented/changes_requested) │
│        ├─ Collects inline comments from the reviewer                │
│        ├─ Posts @claude comment with review summary                 │
│        ├─ Safety limit: 3 relay rounds                              │
│        └─ After limit: "human should review"                        │
│                                                                     │
│   Review feedback → @claude comment → claude.yml runs on PR:        │
│     1. Claude fixes the code                                        │
│     2. Resolves review threads                                      │
│     3. Pushes to tmp branch → verify-merge                          │
│     4. Enables auto-merge on PR                                     │
│                                                                     │
│   Auto-merge triggers when:                                         │
│     ✓ All status checks pass (test, e2e, build)                     │
│     ✓ PR is approved                                                │
│     ✓ Conversations resolved (branch ruleset)                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. ORCHESTRATION (orchestrate.yml)                                  │
│                                                                     │
│   Trigger: PR merged to master                                      │
│   Gate: PIPELINE_ENABLED != 'false'                                 │
│                                                                     │
│   1. Extract story number from PR body ("Closes #N")                │
│   2. Close story issue, label "completed"                           │
│   3. Find next pending story in same epic (lowest issue number)     │
│      ├─ No more stories → close the epic                            │
│      └─ Next story found:                                           │
│           4. Safety check: ≥3 consecutive unmerged PRs → pause      │
│           5. Label story "in-progress"                              │
│           6. Comment @{PREFERRED_AGENT} to implement                │
│              └─ This triggers claude.yml → back to step 2           │
└─────────────────────────────────────────────────────────────────────┘

---

## Recovery & Health (watcher.yml — every 20 min)

```
┌─────────────────────────────────────────────────────────────────────┐
│ PIPELINE WATCHER                                                    │
│                                                                     │
│ Gate: PIPELINE_ENABLED != 'false'                                   │
│ Concurrency limit: 3 simultaneous Claude runs                       │
│                                                                     │
│ 1. CHECK OPEN claude/ PRs                                           │
│    ├─ Merge conflicts → @claude to rebase                           │
│    ├─ CI failing + no commits in 15min → @claude to fix             │
│    │   (up to 5 retries per PR)                                     │
│    ├─ Missing CI check + stale → close/reopen to retrigger          │
│    └─ Track which epics are "busy" (have open PR)                   │
│                                                                     │
│ 2. CHECK IN-PROGRESS STORIES (no PR yet)                            │
│    ├─ ≥5 @claude attempts → create "pipeline-stuck" issue           │
│    ├─ Last trigger < 15min ago → skip (grace period)                │
│    ├─ Epic already busy → skip                                      │
│    └─ Otherwise → re-trigger @claude                                │
│                                                                     │
│ 3. CHECK STALLED EPICS                                              │
│    ├─ No in-progress story + pending stories exist                  │
│    │   └─ Trigger next pending story                                │
│    ├─ No open stories at all                                        │
│    │   └─ Close the epic                                            │
│    └─ Epic already busy → skip                                      │
│                                                                     │
│ 4. CLOSE ORPHAN PRs                                                 │
│    ├─ claude/ PRs with no "Closes #N" in body                       │
│    ├─ Older than 15min + no recent activity                         │
│    └─ Close PR + delete branch                                      │
└─────────────────────────────────────────────────────────────────────┘
```

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

### Consecutive Failure Detection
- orchestrate.yml checks for 3+ unmerged PRs → pauses pipeline, creates bug issue
- watcher.yml checks for 5+ @claude attempts on a story → creates "pipeline-stuck" issue

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
                         │
                    "Epic: Add WebView submission"
                    + Story 1, 2, 3, 4
                         │
                    @claude on Story 1
                         │
               ┌─────────▼──────────┐
               │    claude.yml      │
               │  Claude implements │
               │  Push → tmp branch │
               └─────────┬──────────┘
                         │
               ┌─────────▼──────────┐
               │  verify-merge.yml  │ ◄─── attempt 1/6
               │  lint ✓ tc ✓ test ✓│
               └─────────┬──────────┘
                         │ pass
               ┌─────────▼──────────┐
               │  Merge → PR #259   │
               │  (no auto-merge)   │
               └─────────┬──────────┘
                         │
               ┌─────────▼──────────┐
               │  Gemini reviews    │
               │  "2 high issues"   │
               └─────────┬──────────┘
                         │
               ┌─────────▼──────────┐
               │ review-guardian.yml │
               │ Critical found →   │
               │ @claude fix issues │
               └─────────┬──────────┘
                         │
               ┌─────────▼──────────┐
               │    claude.yml      │
               │  (PR context)      │
               │  Fix review issues │
               │  Resolve threads   │
               │  Enable auto-merge │
               └─────────┬──────────┘
                         │
               ┌─────────▼──────────┐
               │  verify-merge.yml  │
               │  All checks pass   │
               │  Push to PR branch │
               └─────────┬──────────┘
                         │
               ┌─────────▼──────────┐
               │  Auto-merge fires  │
               │  (checks ✓,        │
               │   approved ✓,      │
               │   threads ✓)       │
               └─────────┬──────────┘
                         │
               ┌─────────▼──────────┐
               │  orchestrate.yml   │
               │  Close Story 1     │
               │  @claude Story 2   │
               └─────────┬──────────┘
                         │
                    (cycle repeats)
                         │
               ┌─────────▼──────────┐
               │  All stories done  │
               │  Close Epic        │
               └────────────────────┘
```
