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

If no pending stories → skip to **Step 8**.

Follow `.knowledge/policies/workflow/story-implementation.md` for story picking rules (only `pending`, never `in-progress`).

## Step 3: Implement

```bash
NUMBER=<issue number>
gh issue edit $NUMBER --repo $REPO --remove-label "pending" --add-label "in-progress"
git fetch origin master && git checkout -b story/issue-$NUMBER origin/master
```

Follow `.knowledge/policies/workflow/story-implementation.md`.

When fixing code, follow `.knowledge/policies/workflow/fix-strategy.md`.
When fixing bugs, follow `.knowledge/policies/workflow/bug-fix.md`.

## Step 4: Verify

Follow `.knowledge/policies/workflow/verification.md`.

If you changed screen UI, also follow `.knowledge/policies/testing/e2e-testability.md`.

## Step 5: Learn

**Mandatory.** Follow `.knowledge/policies/workflow/learning.md`.

Check all 6 categories: anti-patterns, constraints, architecture, testing patterns, directory conventions, stale knowledge.

Self-check: if 5+ files changed and zero `.knowledge/` files updated, stop and reconsider.

## Step 6: Self-review

Follow `.knowledge/policies/workflow/self-review.md`.

## Step 7: Push, PR, merge

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

## Step 8: Optimize (when queue is empty)

Read and follow `.claude/skills/optimize/SKILL.md`.

## Step 9: Plan next epic (when queue is empty and optimization is done)

Follow `.knowledge/policies/workflow/epic-planning.md` for priority order.

Check each category in order — pick the first one that has work:
1. Bug fixes in `gaps.md`
2. UX/UI issues in `gaps.md` (from `/ux-review`)
3. Feature gaps (GitHub issues labeled `feature`)
4. Architecture debt (from `/code-audit`)
5. Test quality improvements (from `/test-audit` — rewrite, not add)
6. Test coverage (untested business logic ONLY — follow `.knowledge/patterns/add-test.md`)

Create an epic with stories following `.knowledge/templates/epic.md` and `.knowledge/templates/story.md`.

## Guardrails

- Only pick up `pending` stories — never `in-progress`
- Never push to master directly — always go through a PR
- If 6 verify attempts fail, push WIP and stop
