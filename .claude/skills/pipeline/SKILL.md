---
name: pipeline
description: Autonomous story pipeline — implement, verify, merge, learn, plan
argument-hint: "[--issue N]"
---

# /pipeline — Autonomous Story Pipeline

Implements pending stories, verifies quality, merges, captures learnings, and plans new work when the queue is empty.

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

Before implementing, check constraints and beliefs:

1. **Identify affected files** — read the story's acceptance criteria to list files that will be created or modified.

2. **Check constraints** — for each affected directory, read its folder CLAUDE.md `See:` links. Read the referenced structural test JSDoc to understand the rules.

3. **Check beliefs** — read `src/config/beliefs.ts`. If any belief with status `hypothesis` or `working` is relevant to this story, note it in the PR body.

4. **Check schema staleness** — if the story touches a country schema, check `metadata.lastVerified` is within its maintenance window. If stale, verify the portal before implementing.

If risks are found (low-confidence beliefs, stale schemas), comment on the issue before proceeding.

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

**Mandatory.** After implementing, check what the system learned:

1. **Beliefs** — did implementation confirm or invalidate a belief in `src/config/beliefs.ts`? Update status if so.
2. **Constraints** — did you discover a new rule that should be enforced? Write a structural test in `__tests__/structure/` with a Constraint JSDoc header.
3. **External context** — did you learn something about a government portal, tool, or user behavior? Add to `.context/external/`.
4. **Anti-patterns** — did a wrong approach teach you something? Add to the relevant structural test's JSDoc Anti-patterns section.
5. **Stale context** — did any `.context/` file give wrong guidance? Update it.

Self-check: if 5+ files changed and zero of the above were updated, stop and reconsider.

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

## Step 9: Plan next epic (when queue is empty)

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
