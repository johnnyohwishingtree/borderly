---
name: test-audit
description: Score existing tests for quality, find junk tests, recommend deletions and rewrites
argument-hint: "[--scope path/] [--dry-run] [--tier 3-4]"
---

# /test-audit — Test Quality Audit

Scores existing tests against the test quality rules (Tier 1-4 scoring, assert behavior not existence), identifies low-value and negative-value tests, and either fixes or deletes them. Unlike `/test-suite` (which adds missing tests), this skill evaluates whether existing tests are worth keeping.

## Prerequisites

- Project builds cleanly (`pnpm typecheck` passes)
- `pnpm test` runs (results inform the audit)
- Test quality policy available at the test quality rules (Tier 1-4 scoring, assert behavior not existence)

## Usage
```
/test-audit                          # Audit all tests
/test-audit --scope hooks            # Only audit hook tests
/test-audit --tier 3-4               # Only find Tier 3-4 (low/negative value)
/test-audit --dry-run                # Report only, don't change anything
```

## Step 1: Scan test files

Collect all test files matching the scope. For each test file, extract:
- Number of `it()` / `test()` blocks
- Number of assertions per block
- Types of assertions used (toBe, toBeDefined, toHaveBeenCalled, etc.)
- Number of `jest.mock()` calls vs real imports
- Whether the test has edge cases or only happy path
- Whether the test name describes behavior or implementation

## Step 2: Score each test file

Apply the quality tiers from the test quality rules (Tier 1-4 scoring, assert behavior not existence):

### Tier 4 checks (delete candidates)
- `it()` blocks with zero assertions
- Tests that mock the function under test
- Tests where assertions are so loose they pass with any implementation
- Flaky tests (if known from GitHub issues)
- Tests that only assert `toBeDefined()` or `toBeTruthy()` on return values

### Tier 3 checks (rewrite candidates)
- "It renders" / "it renders without crashing" as the ONLY test for a component
- Tests where `jest.mock()` count > real import count
- Tests that duplicate coverage (same code path, same inputs, different test names)
- Tests that assert `toHaveBeenCalled()` without checking arguments
- Tests with hardcoded implementation details (exact render count, internal state shape)

### Tier 2 checks (improve candidates)
- Tests missing error/edge case coverage (only happy path)
- Tests with weak assertions that could be stronger
- Tests using `getByTestId` when `getByRole` or `getByLabelText` would work

### Tier 1 checks (keep as-is)
- Tests with real business logic assertions
- Bug regression tests
- Integration tests verifying module boundaries
- Tests with edge case coverage

## Step 3: Report findings

For each file, output:
```
[TIER] path/to/test.ts — N tests, M assertions
  Issues: <list of specific problems>
  Action: DELETE | REWRITE | IMPROVE | KEEP
```

Summary table:
| Tier | Count | Action |
|------|-------|--------|
| Tier 1 (high value) | N | Keep |
| Tier 2 (medium) | N | Improve assertions |
| Tier 3 (low value) | N | Rewrite or delete |
| Tier 4 (negative) | N | Delete |

## Step 4: Fix (if not --dry-run)

### For Tier 4 (delete):
- Delete the test file
- Remove from any barrel exports
- Run `pnpm test` to confirm nothing depended on it

### For Tier 3 (rewrite):
- Rewrite to test behavior instead of implementation
- Add edge cases and error paths
- Replace loose assertions with specific ones
- Remove unnecessary mocks
- Run `pnpm typecheck && pnpm test` after each rewrite

### For Tier 2 (improve):
- Add missing error path tests
- Strengthen assertions
- Add edge cases
- Run `pnpm test` after each improvement

## Step 5: Verify

Follow `the verification rules: run `pnpm lint`, `pnpm typecheck`, `pnpm test` in order; up to 6 attempts`.

Test count may go DOWN — that's expected if quality went up. Track:
- Tests before / after
- Assertions before / after (should go up even if tests go down)
- Tier distribution before / after

## Step 6: Write failing tests for remaining work

For Tier 3-4 tests that need rewriting, write a belief test that asserts the CORRECT version:

```typescript
// __tests__/<area>/test-quality-<area>.beliefs.test.ts
/**
 * Belief: <area> tests should catch real bugs, not just assert rendering.
 * Status: hypothesis
 * Found by test-audit: <N> Tier 3-4 tests in __tests__/<area>/
 */
test.skip('<area> tests have meaningful assertions', () => {
  // Read the test files, check for toBeDefined()-only tests
  // Assert they have substantive assertions
});
```

Use `test.skip` so the test commits cleanly. The pipeline will find it, unskip it, rewrite the junk tests, and merge.

## Step 7: Capture learnings

If patterns emerge across multiple findings, add to the relevant structural test's Anti-patterns JSDoc section.

For each finding, classify it:
- **Test to fix/delete** → already handled in Steps 4-6
- **New testing truth discovered** (e.g., "renderHook + fake timers causes OOM in this codebase") → add a comment in the relevant test or policy file
- **Testing belief invalidated** (e.g., audit reveals a Tier 1 test pattern we assumed was good actually masks bugs) → write a colocated `*.beliefs.test.ts` with `test.skip` asserting the correct state

If patterns were found during the audit:
- Add new anti-patterns as comments in the relevant test file's JSDoc header

## Step 8: Verify and commit

Follow `the verification rules: run `pnpm lint`, `pnpm typecheck`, `pnpm test` in order; up to 6 attempts`.

```bash
git add <changed files>
git diff --cached --quiet || git commit -m "chore: test-audit findings ($DATE)" && git push origin master
```

## Guardrails
- Don't delete bug regression tests (even if simple)
- Don't delete structural tests in `__tests__/structure/`
- Don't delete tests for security-critical code (PII, keychain, encryption)
- Don't delete tests the user explicitly asked for
- Read existing tests for patterns on what's worth testing
