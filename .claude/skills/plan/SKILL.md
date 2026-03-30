---
name: plan
description: Turn a request into skipped belief tests for the pipeline to implement
argument-hint: "[what you want]"
---

# /plan — Write Belief Tests

Takes any request — feature, refactor, fix, improvement — and produces `test.skip` tests in `__tests__/beliefs/` that encode what should be true. The pipeline (or `/implement`) then resolves them.

This skill does NOT implement — it writes the spec as skipped tests.

## Prerequisites

- Project builds cleanly (`pnpm test` passes)
- Request provided by user

## Usage
```
/plan simplify trip creation to name + country
/plan add QR code sharing between family members
/plan support Vietnam portal
/plan refactor form engine to use async validation
```

## Step 1: Understand the request

Read CLAUDE.md. Read the folder CLAUDE.md files for the areas the request will touch. Read `src/config/beliefs.ts` for relevant beliefs. If the request involves a country, read `.context/external/countries/` and `.context/patterns/add-country.md`.

## Step 2: Break into testable beliefs

Each belief test asserts ONE thing about the expected end state. Ask: "When this is done, what will be true about the code that isn't true now?" Each answer becomes a skipped test.

## Step 3: Write skipped tests

```typescript
// __tests__/beliefs/<descriptive-name>.test.ts
/**
 * Belief: <what should be true when done>
 *
 * Status: hypothesis
 * Confirm: <what validates this approach>
 * Invalidate: <what would prove this wrong>
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test.skip('<specific assertion>', () => {
  // Assert end state — the pipeline reads this to know WHAT to build
});
```

### Good belief tests
- Assert end state, not process ("has 3 fields" not "remove 9 fields")
- Read source files (grep, count, check imports)
- Specific enough to guide implementation
- Loose enough to allow judgment on HOW

## Step 4: Verify they would fail if unskipped

Temporarily unskip and run to confirm they fail:
```bash
pnpm test -- __tests__/beliefs/<name> 2>&1
```
If any pass, the work is already done — remove that test. Revert to `test.skip` before committing.

## Step 5: Commit

```bash
git add __tests__/beliefs/<name>.test.ts
git commit -m "test: add skipped belief tests for <request>"
```

Tell the user: "Skipped tests committed. Run `/implement` to resolve them now, or the pipeline will pick them up on the next hourly cycle."

## Guardrails

- Do NOT implement — only write skipped tests
- Use `test.skip`, not `test`
- One concern per test, one request per file
