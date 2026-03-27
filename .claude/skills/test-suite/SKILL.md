---
name: test-suite
description: Find and fix gaps in the test suite
argument-hint: "[target area, e.g. 'services/forms', 'components/trips']"
---

# /test-suite — Audit and Fix Test Coverage

Find untested code, write missing tests, and fix any bugs the new tests reveal.

## Policies
<!-- Machine-readable. Graph engine parses this section. -->
- `policies/testing/test-quality.md`
- `policies/testing/test-conventions.md`
- `policies/workflow/bug-fix.md`
- `policies/workflow/verification.md`

## Skills
None

## Usage
```
/test-suite                        # Audit entire test suite
/test-suite services/forms         # Focus on form engine tests
/test-suite components/trips       # Focus on trip component tests
```

## Steps

### Step 1: Establish Baseline

```bash
pnpm test --coverage --coverageDirectory=coverage
```

Read the coverage summary to identify low-coverage files. Target: >80% line coverage.

### Step 2: Identify Gaps

Cross-reference source files against test files:

| Source path | Expected test path |
|------------|-------------------|
| `src/services/<domain>/<file>.ts` | `__tests__/services/<domain>/<file>.test.ts` |
| `src/components/<domain>/<Component>.tsx` | `__tests__/components/<domain>/<Component>.test.tsx` |
| `src/hooks/<hook>.ts` | `__tests__/hooks/<hook>.test.ts` |
| `src/stores/<store>.ts` | `__tests__/stores/<store>.test.ts` |
| `src/utils/<util>.ts` | `__tests__/utils/<util>.test.ts` |
| `src/screens/<domain>/<Screen>.tsx` | `__tests__/screens/<domain>/<Screen>.test.tsx` |

Check for:
- Source files with no corresponding test file
- Functions/methods not covered by existing tests
- Edge cases: empty inputs, error paths, boundary values
- Missing a11y tests for UI components (`*.a11y.test.tsx`)

### Step 3: Write Missing Tests

Follow these conventions:
- Use Jest + React Native Testing Library
- Use RNTL accessibility queries in priority order: `getByRole` > `getByLabelText` > `getByTestId`
- Use `toMatchInlineSnapshot()` not `toMatchSnapshot()` (per `.knowledge/policies/testing/test-conventions.md`)
- Mock native modules in `jest.setup.js` — don't add new mocks unless necessary
- Tests must run in under 1 second each
- Use `renderHook` from `@testing-library/react-hooks` for hook tests

**For each new test file:**
1. Write the tests following `.knowledge/policies/testing/test-quality.md` (Tier 1-2 tests only)
2. Run `pnpm typecheck` to verify imports
3. Run the specific test: `pnpm test -- <test-file-path>`
4. Fix any bugs the test reveals — follow `.knowledge/policies/workflow/bug-fix.md`

### Step 4: Verify

Follow `.knowledge/policies/workflow/verification.md`.

Re-run coverage to confirm improvement:
```bash
pnpm test --coverage --coverageDirectory=coverage
```

### Step 5: Summary

Report what was added:
- New test files created (with paths)
- Coverage before/after
- Bugs found and fixed by new tests
- Remaining gaps (if any) with rationale for skipping
