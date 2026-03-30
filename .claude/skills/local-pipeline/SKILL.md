---
name: local-pipeline
description: Autonomous belief-driven pipeline in isolated worktree
argument-hint: ""
---

# /local-pipeline — Autonomous Pipeline (Worktree)

Same as `/pipeline` but runs in an isolated git worktree. For Claude Desktop or CLI scheduled tasks so it doesn't disturb the user's working directory.

**Scheduled task prompt:**
```
Read CLAUDE.md for project context.
Read .claude/skills/local-pipeline/SKILL.md and follow every step.
```

## Step 1: Set up worktree

```bash
REPO="johnnyohwishingtree/borderly"
WORKTREE_DIR="/tmp/borderly-pipeline-$(date +%s)"

git fetch origin master
git worktree add "$WORKTREE_DIR" origin/master --detach
cd "$WORKTREE_DIR"
pnpm install --frozen-lockfile
```

All subsequent steps run inside `$WORKTREE_DIR`.

## Step 2: Find skipped belief tests

```bash
grep -rl "test\.skip\|it\.skip" __tests__/ 2>/dev/null | grep "\.beliefs\."
```

If no skipped tests → skip to **Step 6**.

Pick ONE skipped test file.

## Step 3: Implement

Read the skipped test's JSDoc. Read folder CLAUDE.md for affected directories.

```bash
git checkout -b fix/$(basename <test-file> .test.ts)
```

1. Implement the changes to make the assertions true
2. Change `test.skip` → `test`

## Step 4: Verify

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Up to 6 attempts. If still failing → re-skip, push WIP, skip to cleanup.

## Step 5: Push, PR, merge

```bash
git add <specific files>
git commit -m "<descriptive message>"
git push -u origin fix/$(basename <test-file> .test.ts)

gh pr create --repo $REPO --base master \
  --title "fix: <what the belief test required>" \
  --body "Resolved skipped belief test: <test file path>"
PR_NUM=$(gh pr list --repo $REPO --head fix/$(basename <test-file> .test.ts) --json number --jq '.[0].number')
gh pr merge $PR_NUM --repo $REPO --squash --delete-branch
```

Go back to **Step 2** if more skipped tests remain.

## Step 6: No skipped tests — run audits

Run audits to discover new beliefs:
1. `/code-audit` — writes `test.skip` for constraint violations
2. `/ux-review` — writes `test.skip` for UX gaps
3. `/context-audit` — checks drift, staleness, belief lifecycle
4. `/test-audit` — writes `test.skip` for junk test rewrites

After an audit writes new skipped tests, go back to **Step 2**.

If all audits produce nothing → system is healthy.

## Step 7: Cleanup worktree

Always run this — even if steps above failed:

```bash
cd /
rm -rf "$WORKTREE_DIR"
git worktree prune
```

## Guardrails

- Always clean up worktree, even if steps fail
- One skipped test at a time
- Read the test JSDoc before implementing
