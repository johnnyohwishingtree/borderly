---
name: pipeline
description: Autonomous spec-driven pipeline — find skipped spec tests, implement them, merge
argument-hint: "[--test <path>]"
---

# /pipeline — Spec-Driven Pipeline

Finds `test.skip` spec tests, reads their JSDoc to understand intent, implements the code to make them pass, unskips them, verifies, and merges.

Skipped tests ARE the work queue. `test.skip` = "this should be true but isn't yet."

**Scheduled task prompt:**
```
Read CLAUDE.md for project context.
Read .claude/skills/pipeline/SKILL.md and follow every step.
```

## Prerequisites

- `gh` CLI authenticated with repo access
- On `master` branch with clean working tree
- `pnpm install` completed

## Step 1: Sync

```bash
REPO="johnnyohwishingtree/borderly"
git checkout master && git pull origin master
```

If any stale PRs exist from a previous failed run, merge or close them:
```bash
gh pr list --repo $REPO --state open --json number,title --jq '.[]'
```

## Step 2: Find skipped spec tests

```bash
grep -rl "test\.skip\|it\.skip\|describe\.skip" __tests__/ 2>/dev/null | grep "\.spec\." | head -10
```

If no skipped tests found → skip to **Step 7**.

If `--test <path>` was provided, focus on that specific test.

Otherwise, pick ONE skipped test file. Prioritize by:
1. Spec tests (`*.spec.test.ts` files) — product specs (highest priority)
2. Any `.skip` tests in `__tests__/structure/` — constraint gaps

## Step 3: Understand intent

Read the skipped test file. The JSDoc header explains:
- **What** the test expects (the spec or constraint)
- **Why** it matters (external context references)
- **Confirm/Invalidate** criteria (for spec tests)

Then read the folder CLAUDE.md for the affected source directories — the `See:` links point to constraints and types.


## Step 4: Implement

```bash
git fetch origin master && git checkout -b fix/$(basename <test-file> .test.ts) origin/master
```

1. Read the skipped test to understand what it asserts
2. Read the source code it references
3. Implement the changes to make the assertions true
4. Change `test.skip` → `test` (unskip)
5. Graduate: if cross-cutting rule (applies to ALL files of a type) → move to `__tests__/structure/` with `Constraint:` JSDoc; if matching `.test.ts` exists → merge and delete `.spec.test.ts`; otherwise rename `.spec.test.ts` → `.test.ts`

When fixing code, follow `the fix-strategy rules: fix one file at a time, run typecheck after each, never use any`.

## Step 5: Verify

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Up to 6 attempts. ALL tests must pass — the unskipped test AND everything else.

If still failing after 6 → re-skip the test, push WIP branch, create draft PR. Next cycle will retry or a human will intervene.

## Step 6: Push, PR, merge

```bash
git add <specific files>
git commit -m "<descriptive message>"
git push -u origin fix/$(basename <test-file> .test.ts)

gh pr create --repo $REPO --base master \
  --title "fix: <what the spec test required>" \
  --body "Resolved skipped spec test: <test file path>.

Changes: <brief description>"
PR_NUM=$(gh pr list --repo $REPO --head fix/$(basename <test-file> .test.ts) --json number --jq '.[0].number')
gh pr merge $PR_NUM --repo $REPO --squash --delete-branch
git checkout master && git pull origin master
```

After merging, go back to **Step 2** to find the next skipped test.

## Step 7: No skipped tests — discover new work

All spec tests are active and passing. Run audits to discover new specs:

Check each in order — run the first one that produces output:
1. `/code-audit` — scans code against constraints, writes `test.skip` for violations
2. `/ux-review` — evaluates user journeys, writes `test.skip` for UX gaps
3. `/context-audit` — checks drift, schema staleness, spec lifecycle
4. `/test-audit` — scores test quality, writes `test.skip` for rewrites

After an audit writes new skipped tests, go back to **Step 2**.

If all audits produce nothing → the system is healthy. Stop.

## Guardrails

- Never push to master directly — always go through a PR
- If 6 verify attempts fail, re-skip the test and push WIP
- One skipped test at a time — don't try to resolve multiple in one branch
- Read the test JSDoc before implementing — understand intent, not just assertions
