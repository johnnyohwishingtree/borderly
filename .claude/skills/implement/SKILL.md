---
name: implement
description: Resolve skipped belief tests — read the spec, implement the code, unskip, verify
argument-hint: "[test file or --all]"
---

# /implement — Resolve Skipped Belief Tests

Finds skipped tests in `__tests__/beliefs/`, reads the JSDoc to understand intent, implements the code, unskips the tests, and verifies everything passes.

This is the interactive version of what `/pipeline` does autonomously.

## Usage
```
/implement                                          # resolve next skipped test
/implement __tests__/beliefs/trip-creation.test.ts  # resolve a specific test
/implement --all                                    # resolve all skipped tests
```

## Step 1: Find skipped tests

```bash
grep -rl "test\.skip\|it\.skip" __tests__/ 2>/dev/null | grep "\.beliefs\."
```

If a specific test was provided, use that. Otherwise pick the first one found.

If no skipped tests → nothing to do.

## Step 2: Read the spec

Read the skipped test file. The JSDoc header explains what to build:
- **Belief** — what should be true
- **Confirm/Invalidate** — how to evaluate the result
- The test body — what to assert

Read the folder CLAUDE.md for affected directories. Follow `See:` links to constraints and types.

## Step 3: Implement

Make the skipped test's assertions true:
1. Read the source code the test references
2. Implement the changes
3. Change `test.skip` → `test`

## Step 4: Verify

```bash
pnpm lint && pnpm typecheck && pnpm test
```

ALL tests must pass — the unskipped test AND everything else.

## Guardrails

- Read the test JSDoc before implementing
- One test file at a time unless `--all` specified
- If a test can't be made to pass without breaking others, re-skip it and explain why
