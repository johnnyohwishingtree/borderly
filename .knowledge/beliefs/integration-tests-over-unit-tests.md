# Belief: Integration Tests Catch More Bugs Than Unit Tests for This App

## Status
Working assumption

## Statement
For a form auto-fill app, the bugs that matter happen at composition boundaries — profile data + schema + mapping logic producing wrong field values. Integration tests that run the real form engine with real schemas and real profile data catch these. Unit tests with mocked dependencies don't.

## Evidence
- All 3 real bugs in project history were composition issues (boolean defaults, timezone parsing, keychain config) — not isolated function logic errors
- The form engine pipeline (profile → fieldMapper → autoFillLogic → filledForm) is where value correctness lives
- 69 files with 3+ mocks are testing wiring, not behavior

## What would confirm
- Integration tests catching a bug that unit tests missed
- Reducing unit test count while maintaining or improving bug detection rate

## What would invalidate
- A bug in an isolated utility function that an integration test wouldn't reach
- Integration tests becoming too slow to run on every commit (>30 seconds total)

## Referenced by
- `decisions/006-testing-strategy.md`
- `src/services/forms/formEngine/formEngine.ts`
