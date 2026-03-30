---
name: pipeline
description: Autonomous story pipeline — implement, verify, merge, learn, plan
argument-hint: "[--issue N]"
---

# /pipeline — Autonomous Story Pipeline

Implements pending stories, verifies quality, merges, updates the knowledge graph, and plans new work when the queue is empty.

**Scheduled task prompt:**
```
Read CLAUDE.md for project context.
Read .claude/skills/pipeline/SKILL.md and follow every step.
```

## Prerequisites

- `gh` CLI authenticated with repo access
- On `master` branch with clean working tree
- `pnpm install` completed

## Step 1: Merge open PRs

```bash
REPO="johnnyohwishingtree/borderly"  # CUSTOMIZE: your org/repo
gh pr list --repo $REPO --state open --json number,title,headRefName --jq '.[]'
```

For each open PR: review the diff, merge if clean, fix if not.

```bash
git checkout master && git pull origin master
```

## Step 2: Find next story

```bash
gh issue list --repo $REPO --label "story" --label "pending" --state open --json number,title --jq '.[0]'
```

If no pending stories → skip to **Step 9**.

Follow `the story-implementation rules: only pick `pending` stories, never `in-progress`` for story picking rules (only `pending`, never `in-progress`).

## Step 3: Pre-flight analysis

Before implementing, assess the knowledge impact of the story:

1. **Identify affected files** — read the story's Tasks and Context sections to list files that will be created or modified.

2. **Check knowledge impact** — for each affected file, run:
   ```bash
   npx tsx scripts/knowledge-graph.ts impact <file>
   ```
   Review which policies, models, and beliefs are connected to the files being changed.

3. **Check belief dependencies** — read `src/config/beliefs.ts` and check if any belief with status `Hypothesis` or `Working assumption` is referenced by the affected files. If a low-confidence belief drives a design decision the story touches, note it in the PR body.

4. **Check temporal staleness** — if the story touches a country schema or form engine logic, check that the relevant schema's `metadata.lastVerified` is within its `metadata.maintenanceFrequency` window. If stale, verify the portal before implementing.

If risks are found (low-confidence beliefs, stale schemas, policy conflicts), comment on the issue before proceeding:
```
Pre-flight: This story touches [file] which depends on belief [X] (status: hypothesis).
Proceeding, but flagging for awareness.
```

## Step 4: Implement

```bash
NUMBER=<issue number>
gh issue edit $NUMBER --repo $REPO --remove-label "pending" --add-label "in-progress"
git fetch origin master && git checkout -b story/issue-$NUMBER origin/master
```

Follow `the story-implementation rules: only pick `pending` stories, never `in-progress``.

When fixing code, follow `the fix-strategy rules: fix one file at a time, run typecheck after each, never use `any``.
When fixing bugs, follow `the bug-fix rules: write failing test first, verify it fails without the fix, then fix`.

## Step 5: Verify

Follow `the verification rules: run `pnpm lint`, `pnpm typecheck`, `pnpm test` in order; up to 6 attempts`.

If you changed screen UI, also follow `the E2E testability rules in `__tests__/structure/component-testids.test.ts``.

## Step 6: Learn

**Mandatory.** Follow `the learning rules: capture anti-patterns, constraints, testing patterns; if 5+ files changed, must update knowledge`.

Check all 6 categories: anti-patterns, constraints, architecture, testing patterns, directory conventions, stale knowledge.

Additionally, check if any beliefs in `src/config/beliefs.ts` need updating based on what was learned during implementation. If a belief was confirmed or contradicted by what you built, update its status and evidence.

Self-check: if 5+ files changed and zero `.knowledge/` files updated, stop and reconsider.

## Step 7: Self-review

Follow `the self-review rules: review diff before committing, fix `any` types, unused imports, empty catches`.

## Step 8: Push, PR, merge

```bash
git add <specific files>
git commit -m "<descriptive message>

Closes #$NUMBER"
git push -u origin story/issue-$NUMBER

TITLE=$(gh issue view $NUMBER --repo $REPO --json title --jq .title)
gh pr create --repo $REPO --head story/issue-$NUMBER --base master --title "$TITLE" \
  --body "Closes #$NUMBER — implemented by pipeline."
PR_NUM=$(gh pr list --repo $REPO --head story/issue-$NUMBER --json number --jq '.[0].number')
gh pr merge $PR_NUM --repo $REPO --squash
```

Close story and auto-close epic if all stories done:
```bash
gh issue edit $NUMBER --repo $REPO --remove-label "in-progress" --add-label "completed"
gh issue close $NUMBER --repo $REPO

EPIC_LABEL=$(gh issue view $NUMBER --repo $REPO --json labels --jq '[.labels[].name | select(startswith("epic:"))] | .[0]')
if [ -n "$EPIC_LABEL" ] && [ "$EPIC_LABEL" != "null" ]; then
  OPEN=$(gh issue list --repo $REPO --state open --json labels --jq "[.[] | select(.labels | map(.name) | any(. == \"$EPIC_LABEL\"))] | length")
  if [ "$OPEN" -eq 0 ]; then
    EPIC_NUM=$(gh issue list --repo $REPO --label "epic,$EPIC_LABEL" --state open --json number --jq '.[0].number')
    [ -n "$EPIC_NUM" ] && [ "$EPIC_NUM" != "null" ] && gh issue close "$EPIC_NUM" --repo $REPO --comment "All stories completed."
  fi
fi
```

## Step 9: Optimize (when queue is empty)

Read and follow `.claude/skills/optimize/SKILL.md`.

## Step 10: Plan next epic (when queue is empty and optimization is done)

Follow `the epic-planning priority order: 1. Bugs, 2. UX/UI, 3. Features, 4. Architecture, 5. Test quality, 6. Test coverage` for priority order.

Check each category in order — pick the first one that has work:
1. Bug fixes (GitHub issues labeled `bug`)
2. UX/UI issues (from `/ux-review`)
3. Feature gaps (GitHub issues labeled `feature`)
4. Architecture debt (from `/code-audit`)
5. Test quality improvements (from `/test-audit` — rewrite, not add)
6. Test coverage (untested business logic ONLY — read existing tests for patterns)

Create an epic with stories using `/epic-planner`.

## Guardrails

- Only pick up `pending` stories — never `in-progress`
- Never push to master directly — always go through a PR
- If 6 verify attempts fail, push WIP and stop
