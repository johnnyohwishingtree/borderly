# Policy: Bug Fix Workflow

## Scope
All skills that discover or fix bugs.

## Rules
- REQUIRE: note the symptom — what failed, what was expected, where
- REQUIRE: read the relevant source code to understand root cause
- REQUIRE: write a failing test BEFORE fixing the code
- REQUIRE: the test must fail before the fix and pass after
- REQUIRE: the test must target the specific function/module that's broken
- REQUIRE: the test must run in under 1 second
- REQUIRE: run the full test suite after fixing to verify no regressions
- DENY: fixing a bug without writing a test first
- DENY: re-running CI repeatedly to check if a fix worked
- DENY: writing a test that only passes (must verify it fails without the fix)

## Where to Write the Test

| Bug location | Test tool | Test file |
|---|---|---|
| App code (`src/`) | Jest | `__tests__/<matching-path>.test.ts` |
| Components (`src/components/`) | Jest + RNTL | `__tests__/components/<matching-path>.test.tsx` |
| Country schemas (`src/schemas/`) | Jest | `__tests__/schemas/<ISO>.test.ts` |
| E2E rendering issues | Playwright | `e2e/tests/<relevant>.spec.ts` |

## Why this order matters
- Tests give instant feedback (< 1s vs minutes for CI)
- Tests pinpoint the exact failure (CI logs just show a symptom)
- Tests prevent regressions permanently
- Iterating on fixes without tests wastes time and risks repeating bugs

## Anti-patterns
- Fixing first, writing test after (test may not actually reproduce the bug)
- Writing a test that passes with any implementation (too loose)
- Skipping the test because "CI will cover it" — CI takes minutes, unit tests take seconds
- Testing the symptom instead of the root cause

## Enforcement
- Skills reference this policy when bugs are discovered

## Context
- `.context/external/countries/errors-have-consequences.md`
