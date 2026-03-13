# Bug Fix Workflow: Maestro for Discovery, Unit Tests for Fixes

Maestro E2E tests are for **bug discovery**, not bug fixing. They are slow and flaky — never iterate on a fix by re-running Maestro. Instead, follow this TDD workflow:

## When a Maestro test reveals a bug:

1. **Stop the Maestro test.** Note the symptom (what failed, what was expected).
2. **Read the relevant source code** to understand the root cause.
3. **Write a failing unit test** that reproduces the exact bug. The test must:
   - Fail BEFORE the fix (proves it catches the bug)
   - Target the specific function/module that's broken
   - Run in under 1 second
4. **Fix the code** so the unit test passes.
5. **Run `pnpm test`** to verify no regressions.
6. **Only then** resume or re-run the Maestro test to confirm end-to-end.

## Why this order matters:

- Unit tests give instant feedback (< 1s vs minutes for Maestro)
- Unit tests pinpoint the exact failure (Maestro just shows a symptom)
- Unit tests prevent regressions permanently
- Iterating on fixes via Maestro wastes time on slow test cycles

## Do NOT:

- Re-run Maestro repeatedly to check if a code fix worked
- Skip writing the unit test because "the Maestro test will cover it"
- Write a unit test that only passes — verify it fails without the fix too
