# Bug Fix Workflow: TDD for ALL Bug Fixes

Every bug fix follows the same TDD workflow. Discovery tools (CI logs, user reports, `/qa`) reveal bugs; **tests** fix them.

## When any bug is discovered:

1. **Note the symptom.** What failed, what was expected, where did it happen.
2. **Read the relevant source code** to understand the root cause.
3. **Write a failing test** that reproduces the exact bug. The test must:
   - Fail BEFORE the fix (proves it catches the bug)
   - Target the specific function/module that's broken
   - Run in under 1 second
4. **Fix the code** so the test passes.
5. **Run the test suite** to verify no regressions.
6. **Only then** re-run the discovery tool (Maestro, CI, etc.) to confirm end-to-end.

## Where to write the test:

| Bug location | Test tool | Test file |
|-------------|-----------|-----------|
| App code (`src/`) | Jest | `__tests__/<matching-path>.test.ts` |
| Components (`src/components/`) | Jest + RNTL | `__tests__/components/<matching-path>.test.tsx` |
| Country schemas (`src/schemas/`) | Jest | `__tests__/schemas/<ISO>.test.ts` |
| E2E rendering issues | Playwright | `e2e/tests/<relevant>.spec.ts` |

## Why this order matters:

- Tests give instant feedback (< 1s vs minutes for CI)
- Tests pinpoint the exact failure (CI logs just show a symptom)
- Tests prevent regressions permanently
- Iterating on fixes without tests wastes time and risks repeating bugs

## Do NOT:

- Fix a bug without writing a test first
- Re-run CI repeatedly to check if a code fix worked
- Skip writing the test because "CI will cover it"
- Write a test that only passes — verify it fails without the fix too
