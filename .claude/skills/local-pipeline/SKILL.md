---
name: local-pipeline
description: Autonomous pipeline for local environments (Claude Desktop / CLI) — uses worktree to avoid disrupting user's work
argument-hint: "[--issue N]"
---

# /local-pipeline — Local Autonomous Pipeline

Same as `/pipeline` but runs in an isolated git worktree so it doesn't disturb the user's working directory. Designed for Claude Desktop or CLI running on the user's machine.

**Scheduled task prompt (Claude Desktop):**
```
Read CLAUDE.md for project context.
Read .claude/skills/local-pipeline/SKILL.md and follow every step.
```

## Prerequisites

- `gh` CLI authenticated with repo access
- Git worktree support available
- `pnpm` installed globally

## Step 0: Set up worktree

```bash
REPO="johnnyohwishingtree/borderly"  # CUSTOMIZE
WORKTREE_DIR="/tmp/borderly-pipeline-$(date +%s)"

git fetch origin master
git worktree add "$WORKTREE_DIR" origin/master --detach
cd "$WORKTREE_DIR"
pnpm install --frozen-lockfile
```

All subsequent steps run inside `$WORKTREE_DIR`.

## Step 1: Merge open PRs

```bash
gh pr list --repo $REPO --state open --json number,title,headRefName --jq '.[]'
```

For each open PR: review the diff, merge if clean, fix if not.

```bash
git fetch origin master && git reset --hard origin/master
```

## Step 2: Find next story

```bash
gh issue list --repo $REPO --label "story" --label "pending" --state open --json number,title --jq '.[0]'
```

If no pending stories → skip to **Step 9**.

Follow `.knowledge/policies/workflow/story-implementation.md` for story picking rules.

## Step 3: Pre-flight analysis

Before implementing, assess the knowledge impact of the story:

1. **Identify affected files** — read the story's Tasks and Context sections to list files that will be created or modified.

2. **Check knowledge impact** — for each affected file, run:
   ```bash
   npx tsx scripts/knowledge-graph.ts impact <file>
   ```
   Review which policies, models, and beliefs are connected to the files being changed.

3. **Check belief dependencies** — read `.knowledge/beliefs/` and check if any belief with status `Hypothesis` or `Working assumption` is referenced by the affected files. If a low-confidence belief drives a design decision the story touches, note it in the PR body.

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
git checkout -b story/issue-$NUMBER
```

Follow `.knowledge/policies/workflow/story-implementation.md`.

When fixing code, follow `.knowledge/policies/workflow/fix-strategy.md`.
When fixing bugs, follow `.knowledge/policies/workflow/bug-fix.md`.

## Step 5: Verify

Follow `.knowledge/policies/workflow/verification.md`.

If still failing after 6 → push WIP branch, create draft PR, reset to `pending`, skip to cleanup.

## Step 6: Learn

**Mandatory.** Follow `.knowledge/policies/workflow/learning.md`.

Additionally, check if any `.knowledge/beliefs/` files need updating based on what was learned during implementation. If a belief was confirmed or contradicted by what you built, update its status and evidence.

Self-check: if 5+ files changed and zero `.knowledge/` updates, stop and reconsider.

## Step 7: Self-review

Follow `.knowledge/policies/workflow/self-review.md`.

## Step 8: Push, PR, merge

```bash
git add <specific files>
git commit -m "<descriptive message>

Closes #$NUMBER"
git push -u origin story/issue-$NUMBER

TITLE=$(gh issue view $NUMBER --repo $REPO --json title --jq .title)
gh pr create --repo $REPO --head story/issue-$NUMBER --base master --title "$TITLE" \
  --body "Closes #$NUMBER — implemented by local-pipeline."
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

## Step 10: Cleanup worktree

Always run this — even if steps above failed:

```bash
cd /
git -C "$WORKTREE_DIR" worktree list  # verify it's a worktree
rm -rf "$WORKTREE_DIR"
git worktree prune
```

## Step 11: Report

Print summary: what was implemented, branch name, tests added, knowledge updated, worktree cleaned up.

## Guardrails

- Always clean up worktree, even if steps fail
- Only pick up `pending` stories — never `in-progress`
