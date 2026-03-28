# Decision: Testing Strategy

## Status
Accepted (replaces implicit approach)

## Context
Borderly has 10,222 tests across 416 test suites, but the three real bugs in the project's history (boolean default, timezone parsing, keychain access group) were all found in production or manual testing — not caught by the automated suite. The test count creates false confidence.

The problem is structural: most tests verify that code runs without crashing, not that it produces correct results. 20% of tests (2,080) are parameterized mapping structure validators. 112 files contain "it renders" tests. 69 files have 3+ jest.mock() calls. The suite is wide but shallow.

## Decision
Tests must prioritize catching the bugs that actually happen in this app. The test pyramid for Borderly is inverted compared to a typical web app:

### What matters most (write these first)

**1. Integration tests for the form engine pipeline**
Profile + trip leg + country schema → filled form → verify every field value is correct. This is the core product — if auto-fill produces wrong values, the user submits an incorrect customs declaration. These tests use real data, no mocks.

**2. Boundary/edge case tests for auto-fill**
- What happens when a profile field is missing?
- What happens when autoFillMapping has no match and no _default?
- What happens with multi-leg trips where accommodation changes?
- Date fields near timezone boundaries
- Boolean fields with no explicit default

**3. Schema correctness tests**
- Every autoFillSource path resolves to a real profile/leg field
- Every autoFillMapping has a _default
- Every required field has either autoFillSource or is marked countrySpecific
- Field types match their validation rules

**4. PII boundary tests (structural)**
- Passport data never persists outside Keychain
- PII never appears in logs, analytics, or MMKV
- Family member data is isolated

**5. E2E journey tests**
- Complete user flows: scan passport → create trip → fill form → review
- Journey completion without dead ends or crashes

### What matters less (have some, don't prioritize)

**6. Component interaction tests**
- Testing that a button press calls the right callback
- Testing that a form field updates state correctly
- These have value but are lower priority than integration tests

### What to stop writing

**7. "It renders" tests** — delete or upgrade to interaction tests
**8. Heavy-mock unit tests** — if you need 4+ mocks, write an integration test instead
**9. Structural mapping tests beyond basic validation** — 150 parameterized assertions per country is overkill. One comprehensive validation per country is enough.

### The test question to ask before writing any test
"What bug would this test catch?" If the answer is "none specifically" or "it would only catch a crash," don't write it. Write a test for a scenario that has failed before or could plausibly fail.

## Derives from
- `facts/craft/tests-are-specifications.md`
- `facts/domain/errors-have-consequences.md`
- `facts/customer/users-wont-verify-auto-filled-values-carefully.md`
- `facts/organizational/test-count-inflates-confidence.md`
- `facts/organizational/parameterized-tests-dominate-count.md`
- `facts/organizational/render-tests-catch-no-bugs.md`
- `principles/test-before-fix.md`

## Consequences
- Test count may decrease as Tier 3-4 tests are removed
- Test quality (bugs caught per test) should increase
- New tests require answering "what bug does this catch?" before writing
- Pipeline learning step should note when a bug is found that tests didn't catch
