# Policy: Epic Planning

## Scope
Pipeline Step 9, `/epic-planner` skill

## Rules
- REQUIRE: check the priority order below before planning a new epic
- REQUIRE: only plan test coverage epics if all higher priorities are clear
- REQUIRE: check existing open stories/epics first — don't duplicate
- DENY: creating test-coverage epics when UX issues or feature gaps exist
- DENY: creating more than 2 test stories in a single epic
- DENY: planning "write tests for every file" epics — test coverage is not a goal, catching bugs is

## Priority Order

When the story queue is empty, plan the next epic in this order. Pick the first category that has work to do:

1. **UX/UI issues** — findings from `/ux-review` or `/visual-audit` that are in `gaps.md`. Users feel these directly.
2. **Feature gaps** — missing functionality from the product roadmap or user requests. Check GitHub issues labeled `feature`.
3. **Bug fixes** — known bugs in `gaps.md` under Code fixes. Users hit these.
4. **Architecture debt** — findings from `/code-audit` (dependency violations, drift, dead code). Prevents future bugs.
5. **Test quality** — findings from `/test-audit` (Tier 3-4 tests to delete/rewrite). Reduces false confidence.
6. **Test coverage** — untested business logic ONLY. Not "write tests for every component."

## What Counts as Test Coverage Worth Adding

- Untested business logic in services (form generation, auto-fill, submission)
- Untested error handling paths (what happens when Keychain fails, network drops)
- Untested edge cases in schema validation (boundary values, missing fields)

## What Does NOT Count

- "It renders" tests for every component
- Tests for pure UI layout (NativeWind classes, spacing)
- Tests for generated/derived values guaranteed by TypeScript types
- Tests that duplicate structural test coverage

## Anti-patterns
- Pipeline creates 10-story test epic because Step 9 defaults to test coverage
- Test epic tests UI components that have no business logic
- Pipeline ignores UX findings in gaps.md and creates test stories instead
- Every epic is "improve test coverage for X" — no features or UX improvements

## Enforcement
- `/code-audit` flags when test stories outnumber feature/UX stories in recent history
