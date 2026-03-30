---
name: plan-feature
description: Turn a feature request into failing belief tests that the pipeline can implement
argument-hint: "[feature description]"
---

# /plan-feature — Write Belief Tests for a Feature

Takes a feature request and produces failing tests in `__tests__/beliefs/` that encode what the feature should do. The pipeline then picks up the failing tests and implements the feature.

This skill does NOT implement the feature — it writes the spec as tests.

## Prerequisites

- Project builds cleanly (`pnpm typecheck` and `pnpm test` pass)
- Feature description provided by user

## Usage
```
/plan-feature simplify trip creation to name + country
/plan-feature add QR code sharing between family members
/plan-feature support Vietnam portal
```

## Step 1: Understand the feature

Read CLAUDE.md for project context. Read the folder CLAUDE.md files for the areas the feature will touch. Read `src/config/beliefs.ts` for relevant beliefs.

If the feature involves a country, read `.context/external/countries/` and `.context/patterns/add-country.md`.

## Step 2: Break into testable beliefs

Each belief test should assert ONE thing about the expected end state. A feature with 3 aspects = 3 belief tests.

Ask: "When this feature is done, what will be true about the code/UI/data that isn't true now?"

Each answer becomes a failing test.

## Step 3: Write skipped belief tests

Create test files in `__tests__/beliefs/` using `test.skip`:

```typescript
// __tests__/beliefs/<feature-name>.test.ts
/**
 * Belief: <what should be true after the feature is built>
 *
 * Status: hypothesis
 * Confirm: <what validates this was the right approach>
 * Invalidate: <what would prove this was wrong>
 *
 * Feature: <original feature request>
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test.skip('<specific assertion about expected state>', () => {
  // Assert something about file structure, code content, or data shape
  // This is SKIPPED now — the pipeline will unskip it, implement the code,
  // and verify it passes before committing.
});
```

Use `test.skip` so the test commits cleanly (commit gate requires all tests to pass). The pipeline finds `.skip` tests and resolves them.

### What makes a good belief test

- **Asserts end state, not process** — "CreateTripScreen has 3 fields" not "remove 9 fields"
- **Reads source files** — grep for patterns, count elements, check imports
- **Is specific enough to guide implementation** — the agent should know WHAT to change
- **Is loose enough to allow judgment** — don't dictate HOW, dictate WHAT

### Examples

| Feature | Belief test |
|---|---|
| "Simplify trip creation" | Assert LegCard doesn't have flight/accommodation fields |
| "Add Vietnam portal" | Assert VNM.json exists in src/schemas/ with required metadata |
| "QR code sharing" | Assert a share button exists in QRDetail screen |

## Step 4: Verify skipped tests would fail if unskipped

Temporarily unskip and run to confirm they fail on the current code:

```bash
# Temporarily change test.skip → test, run, then revert
pnpm test -- __tests__/beliefs/<feature-name> 2>&1
```

If any test PASSES, the feature (or part of it) already exists — remove that test.

Then revert back to `test.skip` before committing.

## Step 5: Commit the skipped tests

```bash
git add __tests__/beliefs/<feature-name>.test.ts
git commit -m "test: add skipped belief tests for <feature>"
git push origin master
```

The pipeline will find the `.skip` tests on its next cycle, unskip them, implement the code, and merge.

## Guardrails

- Do NOT implement the feature — only write the skipped tests
- Use `test.skip`, not `test` — commit gate requires all tests to pass
- Each test file should have a JSDoc header explaining the belief
- Keep tests focused — one concern per test, one feature per file
