# Policy: Test Quality

## Scope
__tests__/, src/**/*.test.ts, src/**/*.test.tsx

## Rules
- REQUIRE: every test asserts behavior, not existence — `expect(result).toBe(42)` not `expect(result).toBeDefined()`
- REQUIRE: at least one error/edge case per describe block — happy path only is not a test
- REQUIRE: mocks are minimal — if you can test with real logic, do it; mock only I/O and platform boundaries
- REQUIRE: test names describe user-visible behavior ("saves trip with two legs") not implementation ("calls updateTripLeg twice")
- REQUIRE: bug-fix tests must fail without the fix (verified before committing)
- DENY: tests with zero assertions (empty `it()` blocks or only `expect(fn).not.toThrow()`)
- DENY: tests where mocks outnumber real function calls — the test is testing the mock, not the code
- DENY: "it renders" / "it renders without crashing" as the only test for a component — test user interactions
- DENY: testing private/internal implementation details (internal state shape, private method calls)
- DENY: duplicate coverage — two tests asserting the same code path with the same inputs
- DENY: asserting `toHaveBeenCalled()` without verifying the call arguments or the resulting state change

## Quality Tiers

### Tier 1: High Value (keep, improve)
- Tests business logic with real inputs/outputs
- Tests error handling and edge cases
- Bug regression tests (fail without the fix)
- Integration tests that verify module boundaries

### Tier 2: Medium Value (keep if fast, improve assertions)
- Component render + interaction tests
- Hook tests with real store/service integration
- Schema validation tests

### Tier 3: Low Value (candidates for deletion or rewrite)
- "It renders" with no interaction testing
- Tests where every dependency is mocked (testing the mock wiring)
- Tests that only assert `toBeDefined()` or `toBeTruthy()`
- Tests that duplicate structural test coverage

### Tier 4: Negative Value (delete)
- Tests that break on every refactor but never catch bugs
- Tests with hardcoded implementation details (checking exact number of renders, internal state shape)
- Tests that pass with any implementation (assertions too loose)
- Flaky tests that pass/fail randomly

## Anti-patterns
- Writing 10 "it renders with prop X" variants instead of one parameterized test
- Mocking the function under test (mock returns expected value, test asserts mock's return)
- Over-mocking: `jest.mock('../services/storage')` when you could use a real in-memory store
- Asserting on mock call count as primary assertion instead of output/state
- Copy-pasting test blocks with one changed variable instead of using `it.each`
- Writing tests to increase coverage numbers rather than to catch bugs
- Testing generated/derived values that are guaranteed by TypeScript types

## Enforcement
Enforced by `/test-audit` skill when run on schedule

## References
- Related: rubrics/test-quality.md (evaluation criteria with weights)
- Related: policies/testing/test-conventions.md (mechanical rules)
