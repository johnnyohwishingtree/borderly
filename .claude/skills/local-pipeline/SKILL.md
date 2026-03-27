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

## Step 0: Set up worktree

Create an isolated worktree so the user's working directory is untouched:

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

If no pending stories → skip to **Step 8**.

**Important:** Only pick up stories labeled `pending`. Never pick up `in-progress` stories.

## Step 3: Implement

```bash
NUMBER=<issue number>
gh issue edit $NUMBER --repo $REPO --remove-label "pending" --add-label "in-progress"
git checkout -b story/issue-$NUMBER
```

Read the story body. Implementation order:
1. Read the **Knowledge** section
2. Read the **Tasks** section
3. Read the **Context** section
4. Implement each task following the referenced `.knowledge/` file

## Step 4: Verify (up to 6 attempts)

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

**If you changed screen UI:** Follow `.knowledge/policies/testing/e2e-testability.md`.

If checks fail → fix → rerun. Up to 6 attempts.

If still failing after 6 → push WIP branch, create draft PR, reset to `pending`, skip to cleanup.

**Failure discipline:**
- Don't retry the same fix
- Fix or log pre-existing failures
- Run verification foreground — no background processes
- If you created a test, run it individually first

## Step 5: Learn — update the knowledge graph

**Mandatory.** See `.knowledge/policies/architecture/pipeline-learning.md`. PRs with 5+ files MUST include knowledge updates.

1. **Anti-patterns learned?** → Add to the relevant policy's Anti-patterns section
2. **New constraint?** → Create `.knowledge/policies/<scope>/<name>.md` + structural test
3. **New business entity/architecture?** → Create/update `.knowledge/models/<name>.md`
4. **Testing patterns?** → Add workarounds to `policies/testing/test-conventions.md`
5. **Directory-specific?** → Create folder CLAUDE.md with `See:` links
6. **Stale knowledge?** → Update the file or add to `gaps.md`

Self-check: if 5+ files changed and zero `.knowledge/` updates, stop and reconsider.

## Step 6: Self-review against rubrics

Review diff against `.knowledge/rubrics/`. Fix issues, re-verify.

## Step 7: Push, PR, merge

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

## Step 8: Optimize (when queue is empty)

Read and follow `.claude/skills/optimize/SKILL.md`.

## Step 9: Cleanup worktree

Always run this — even if steps above failed:

```bash
cd /
git -C "$WORKTREE_DIR" worktree list  # verify it's a worktree
rm -rf "$WORKTREE_DIR"
git worktree prune
```

## Step 10: Report

Print summary: what was implemented, branch name, tests added, knowledge updated, worktree cleaned up.
