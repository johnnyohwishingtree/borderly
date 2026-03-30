---
name: local-pipeline
description: Belief-driven pipeline in isolated worktree — for Claude Desktop / CLI
argument-hint: "[--test <path>]"
---

# /local-pipeline — Local Belief-Driven Pipeline

Same as `/pipeline` but runs in an isolated git worktree so it doesn't disturb the user's working directory.

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
REPO="johnnyohwishingtree/borderly"
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

## Step 2: Find failing tests

```bash
pnpm test 2>&1 | grep "FAIL" | head -10
```

If all tests pass → skip to **Step 6**.

Prioritize by directory:
1. `__tests__/beliefs/` — product beliefs to validate
2. `__tests__/structure/` — constraint violations to fix
3. `__tests__/` — general test failures (bugs)

Pick ONE failing test suite.

## Step 3: Understand intent and implement

Read the failing test file's JSDoc header. Read the folder CLAUDE.md for affected directories. Implement the fix.

```bash
git checkout -b fix/$(basename <test-file> .test.ts)
```

When fixing code, follow `the fix-strategy rules: fix one file at a time, run typecheck after each, never use any`.

## Step 4: Verify

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Up to 6 attempts. If still failing → push WIP branch, create draft PR, skip to cleanup.

## Step 5: Push, PR, merge

```bash
git add <specific files>
git commit -m "<descriptive message>"
git push -u origin fix/$(basename <test-file> .test.ts)

gh pr create --repo $REPO --base master \
  --title "fix: <what the test required>" \
  --body "Made failing test pass: <test file path>"
PR_NUM=$(gh pr list --repo $REPO --head fix/$(basename <test-file> .test.ts) --json number --jq '.[0].number')
gh pr merge $PR_NUM --repo $REPO --squash --delete-branch
```

Go back to **Step 2** if more failing tests remain.

## Step 6: No failing tests — run audits

All tests pass. Run audits to discover new work:
1. `/code-audit` — writes failing tests for code violations
2. `/ux-review` — writes failing tests for UX gaps
3. `/context-audit` — checks drift, staleness, belief lifecycle
4. `/test-audit` — writes failing tests for junk test rewrites

After an audit writes new failing tests, go back to **Step 2**.

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
- One failing test suite at a time
- Read the test JSDoc before implementing
