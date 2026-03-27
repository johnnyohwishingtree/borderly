---
name: test-audit
description: Score existing tests for quality, find junk tests, recommend deletions and rewrites
argument-hint: "[--scope path/] [--dry-run] [--tier 3-4]"
---

# /test-audit — Test Quality Audit

Scores existing tests against `.knowledge/policies/testing/test-quality.md`, identifies low-value and negative-value tests, and either fixes or deletes them. Unlike `/test-suite` (which adds missing tests), this skill evaluates whether existing tests are worth keeping.

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

Apply the quality tiers from `.knowledge/policies/testing/test-quality.md`:

### Tier 4 checks (delete candidates)
- `it()` blocks with zero assertions
- Tests that mock the function under test
- Tests where assertions are so loose they pass with any implementation
- Flaky tests (if known from gaps.md)
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

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Test count may go DOWN — that's fine if quality went up. Track:
- Tests before / after
- Assertions before / after (should go up even if tests go down)
- Tier distribution before / after

## Step 6: Update knowledge

If patterns were found during the audit:
- Add new anti-patterns to `policies/testing/test-quality.md`
- Add new anti-patterns to `policies/testing/test-conventions.md`
- Update `gaps.md` with test files that need human judgment

## What NOT to delete
- Bug regression tests (even if simple — they prevent specific bugs)
- Structural tests in `__tests__/structure/` (they enforce policies)
- Tests for security-critical code (PII, keychain, encryption)
- Tests the user explicitly asked for
