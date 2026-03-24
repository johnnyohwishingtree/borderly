---
name: pipeline
description: Autonomous story pipeline — implement, verify, merge, plan
argument-hint: "[--issue N]"
---

# /pipeline — Autonomous Story Pipeline

The Borderly autonomous development loop. Merges open PRs, implements pending stories, verifies quality, and plans new work when the queue is empty.

This file is the single source of truth for the pipeline. Claude Code scheduled tasks reference it directly:
```
Read .claude/skills/pipeline/SKILL.md and follow every step.
```

## Usage
```
/pipeline              # Run one full cycle
/pipeline --issue N    # Implement a specific issue
```

## Full Cycle

### Step 0: Load project context

Read `CLAUDE.md` for project context, architecture, run commands, and implementation status.

### Step 1: Merge open PRs

Ensure master is current before starting new work.

```bash
gh pr list --state open --json number,title,headRefName --jq '.[]'
```

For each open PR:
1. Read the diff: `gh pr diff $NUMBER`
2. If changes look clean: approve and squash merge
3. If issues found: checkout the branch, fix them, run `pnpm lint && pnpm typecheck && pnpm test`, push, then merge

After merging all PRs:
```bash
git checkout master && git pull origin master
```

### Step 2: Find next story

```bash
# If --issue N was specified, use that issue number
# Otherwise find the next pending story (lowest number first)
gh issue list --label "story" --label "pending" --state open --json number,title --jq 'sort_by(.number) | .[0]'
```

If no pending stories, skip to **Step 6** (plan next epic).

### Step 3: Implement

```bash
NUMBER=<issue number>
gh issue edit $NUMBER --remove-label "pending" --add-label "in-progress"
git fetch origin master && git checkout -b story/issue-$NUMBER origin/master
```

Read the issue body and implement it. The story body tells you which skill to use (e.g., `/plan-feature`, `/test-suite`, `/visual-implement`).

**Always:**
- Run `pnpm typecheck` after every file change
- Run `pnpm test` before committing
- Run `pnpm lint` to catch style issues
- Never use `any` types — fix the root cause
- Never use `git add -A` — add specific files
- Follow the rules in `.claude/rules/` (they're auto-loaded but reference them if unsure)

### Step 4: Verify

This is the quality gate. All checks must pass before merging.

```bash
pnpm lint && pnpm typecheck && pnpm test
```

If the story touched screens or components, also run E2E:
```bash
pnpm e2e
```

And verify the Metro bundle builds:
```bash
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/bundle.js
```

**You have up to 6 attempts.** If checks fail, read the errors, fix them, and re-run. Do not proceed until all pass.

### Step 4b: Self-update check

After implementing, check if your changes affect the pipeline itself:
- **Did you add/remove/rename any `.claude/` files?** Update `.claude/index.md` to reflect the change.
- **Did you add new screens?** Add a Playwright E2E test in `e2e/tests/`.
- **Did you change navigation structure?** Run `/update-architecture`.
- **Did you add native dependencies?** Add web mocks in `e2e/mocks/` and aliases in `webpack.config.js`.

### Step 4c: If verification fails after 6 attempts — discard

If after 6 attempts the checks still fail:

1. Push the branch and create a WIP PR (so the work is visible), but do **NOT** merge:
   ```bash
   git add <specific files>
   git commit -m "WIP: #$NUMBER — failed verification after 6 attempts"
   git push -u origin story/issue-$NUMBER
   TITLE=$(gh issue view $NUMBER --json title --jq .title)
   gh pr create \
     --head story/issue-$NUMBER --base master \
     --title "WIP: $TITLE" \
     --body "Failed verification after 6 attempts. Needs human review. Ref: #$NUMBER"
   ```
2. Reset the issue so a future run can retry:
   ```bash
   gh issue edit $NUMBER --remove-label "in-progress" --add-label "pending"
   gh issue comment $NUMBER \
     --body "Pipeline failed to meet quality threshold after 6 attempts. WIP PR created for visibility. Resetting to pending."
   ```
3. **Stop.** Do not proceed to Step 5 or Step 6.

### Step 5: Push, PR, merge, close (only if Step 4 passed)

```bash
git add <specific files> # never git add -A
git commit -m "<descriptive message>

Closes #$NUMBER"
git push -u origin story/issue-$NUMBER
```

Create the PR and merge:
```bash
TITLE=$(gh issue view $NUMBER --json title --jq .title)
gh pr create \
  --head story/issue-$NUMBER --base master \
  --title "$TITLE" \
  --body "Closes #$NUMBER — implemented autonomously by pipeline."

PR_NUMBER=$(gh pr list --head story/issue-$NUMBER --json number --jq '.[0].number')
gh pr merge $PR_NUMBER --squash
```

### Step 5b: Close story and advance epic

Close the story:
```bash
gh issue edit $NUMBER --remove-label "in-progress" --add-label "completed"
gh issue close $NUMBER
```

Check if there are more stories in the same epic:
```bash
EPIC_LABEL=$(gh issue view $NUMBER --json labels --jq '[.labels[].name | select(startswith("epic:"))] | .[0]')
if [ -n "$EPIC_LABEL" ]; then
  NEXT=$(gh issue list --label "$EPIC_LABEL" --label "pending" --state open --json number --jq 'sort_by(.number) | .[0].number')
  if [ -z "$NEXT" ]; then
    # All stories in epic complete — close the epic
    EPIC_NUM=$(gh issue list --label "epic" --label "$EPIC_LABEL" --state open --json number --jq '.[0].number')
    if [ -n "$EPIC_NUM" ]; then
      gh issue close $EPIC_NUM
    fi
  fi
fi
```

### Step 6: Plan next epic (when queue is empty)

Only runs when there are no pending stories left.

```bash
# Check there's truly nothing queued
PENDING=$(gh issue list --label "story" --label "pending" --state open --json number --jq 'length')
if [ "$PENDING" -gt 0 ]; then exit 0; fi
```

Analyze the project to identify the highest-impact improvement:
1. Read the codebase structure and `CLAUDE.md` implementation status
2. Check recently closed issues to avoid duplicates:
   ```bash
   gh issue list --state closed --limit 10 --json number,title
   ```
3. Look for: features mentioned in CLAUDE.md but not implemented, test coverage gaps, UX improvements, accessibility issues

Read `.claude/index.md` to see available templates, then read the specific ones you need:
- `.claude/templates/epic.md` — structure for epic bodies
- `.claude/templates/story.md` — structure for story bodies (populate ALL sections to minimize token waste during implementation)

Create an epic and stories following the templates:
```bash
# Create label
gh label create "epic:<slug>" --color "0E8A16" --description "Epic: <title>" 2>/dev/null || true

# Create epic (body follows .claude/templates/epic.md structure)
gh issue create \
  --title "Epic: <goal>" --label "epic" --label "epic:<slug>" \
  --body "<follow epic template: goal, context, story checklist, success criteria, out of scope>"

# Create stories (body follows .claude/templates/story.md structure)
# IMPORTANT: populate ALL template sections to minimize token waste during implementation:
#   - Context: list the minimum files/line-ranges needed
#   - Patterns & Templates: which patterns apply
#   - Key Types: inline the relevant type definitions
gh issue create \
  --title "Story: <task>" --label "story" --label "pending" --label "epic:<slug>" \
  --body "<follow story template — every section>"

# Update epic body with actual issue numbers
gh issue edit <epic_number> --body "..."
```

Story sizing rules:
- Each story produces a shippable, testable increment
- Combine tightly coupled small steps into one story
- Split steps that touch different layers (storage vs screens vs components)
- If a story has no acceptance criteria beyond "files exist," merge it with another

The next pipeline run will pick up the first new story.

## Token Optimization

- Don't read files you've already read in this session
- Use `pnpm typecheck` incrementally after each file
- Keep implementation focused — one story, one branch, one PR
- Read `.claude/index.md` first to understand the system map before diving into individual files
