---
name: pipeline
description: Autonomous belief-driven pipeline — find failing tests, make them pass, merge
argument-hint: "[--test <path>]"
---

# /pipeline — Belief-Driven Pipeline

Finds failing tests, reads their JSDoc to understand intent, implements the fix, verifies, and merges. Failing tests ARE the work queue — no stories or issues needed.

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
REPO="johnnyohwishingtree/borderly"
gh pr list --repo $REPO --state open --json number,title,headRefName --jq '.[]'
```

For each open PR: review the diff, merge if clean, fix if not.

```bash
git checkout master && git pull origin master
```

## Step 2: Find failing tests

```bash
pnpm test 2>&1 | grep "FAIL" | head -10
```

If all tests pass → skip to **Step 7**.

If `--test <path>` was provided, focus on that specific test.

Otherwise, prioritize by directory:
1. `__tests__/beliefs/` — product beliefs to validate (highest priority)
2. `__tests__/structure/` — constraint violations to fix
3. `__tests__/` — general test failures (bugs)

Pick ONE failing test suite to work on.

## Step 3: Understand intent

Read the failing test file. The JSDoc header at the top explains:
- **What** the test expects (the belief or constraint)
- **Why** it matters (external context references)
- **When to confirm vs invalidate** (for belief tests)

Then read the folder CLAUDE.md for the affected source directories — the `See:` links point to constraints and types.

If the test references `src/config/beliefs.ts`, read the relevant belief entry for confirm/invalidate criteria.

## Step 4: Implement

```bash
git fetch origin master && git checkout -b fix/$(basename <test-file> .test.ts) origin/master
```

Make the failing tests pass. Read the source code the test references, understand the current state, implement the change.

When fixing code, follow `the fix-strategy rules: fix one file at a time, run typecheck after each, never use any`.

## Step 5: Verify

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Up to 6 attempts. ALL tests must pass, not just the one you fixed.

If still failing after 6 → push WIP branch, create draft PR, skip to Step 1 (next cycle will retry or a human will intervene).

## Step 6: Push, PR, merge

```bash
git add <specific files>
git commit -m "<descriptive message>"
git push -u origin fix/$(basename <test-file> .test.ts)

gh pr create --repo $REPO --base master \
  --title "fix: <what the belief/constraint test required>" \
  --body "Made failing test pass: <test file path>.

Changes: <brief description>"
PR_NUM=$(gh pr list --repo $REPO --head fix/$(basename <test-file> .test.ts) --json number --jq '.[0].number')
gh pr merge $PR_NUM --repo $REPO --squash --delete-branch
git checkout master && git pull origin master
```

After merging, go back to **Step 2** to find the next failing test.

## Step 7: No failing tests — discover new work

All tests pass. Run audits to discover new beliefs and constraints:

Check each in order — run the first one that produces output:
1. `/code-audit` — scans code against structural test constraints, writes failing tests for violations
2. `/ux-review` — evaluates user journeys, writes failing tests for UX gaps
3. `/context-audit` — checks drift, schema staleness, belief lifecycle
4. `/test-audit` — scores test quality, writes failing tests for rewrites

After an audit writes new failing tests, go back to **Step 2**.

If all audits produce nothing → the system is healthy. Stop.

## Guardrails

- Never push to master directly — always go through a PR
- If 6 verify attempts fail, push WIP and stop
- One failing test suite at a time — don't try to fix everything in one branch
- Read the test JSDoc before implementing — understand intent, not just assertions
