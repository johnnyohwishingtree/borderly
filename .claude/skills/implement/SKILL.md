---
name: implement
description: Resolve skipped belief tests — implement the code, unskip, graduate to regular test, verify
argument-hint: "[test file or --all]"
---

# /implement — Resolve Skipped Belief Tests

Finds `*.beliefs.test.ts` files with `test.skip`, reads the JSDoc to understand intent, implements the code, then graduates the test to a regular test file.

## Usage
```
/implement                                                              # resolve next skipped test
/implement __tests__/screens/trips/CreateTripScreen.beliefs.test.ts     # resolve a specific test
/implement --all                                                        # resolve all skipped tests
```

## Step 1: Find skipped belief tests

```bash
grep -rl "test\.skip\|it\.skip" __tests__/ 2>/dev/null | grep "\.beliefs\."
```

If a specific test was provided, use that. Otherwise pick the first one found.

If none found → nothing to do.

## Step 2: Read the spec

Read the `.beliefs.test.ts` file. The JSDoc header explains:
- **Belief** — what should be true
- **Confirm/Invalidate** — how to evaluate the result
- The test body — what to assert

Read the folder CLAUDE.md for affected directories. Follow `See:` links to constraints and types.

## Step 3: Implement

Make the skipped test's assertions true:
1. Read the source code the test references
2. Implement the changes
3. Change `test.skip` → `test`

## Step 4: Graduate the test

The `.beliefs.` naming means "pending work." Once resolved, graduate it:

- If a matching regular test file exists (e.g., `CreateTripScreen.test.ts`), merge the assertions into it and delete the `.beliefs.test.ts` file
- If no matching test exists, rename `.beliefs.test.ts` → `.test.ts`

This keeps the grep clean — only unresolved work shows up as `.beliefs.` files.

## Step 5: Verify

```bash
pnpm lint && pnpm typecheck && pnpm test
```

ALL tests must pass.

## Guardrails

- Read the test JSDoc before implementing
- One test file at a time unless `--all` specified
- If a test can't be made to pass without breaking others, re-skip it and explain why
- Always graduate: no `.beliefs.test.ts` files should remain active (non-skipped)
