# Test Template

Test files follow this structure. Uses Jest + React Native Testing Library.

**Matching rubric:** `.claude/rubrics/test-quality.md`

## Structure

```typescript
import { functionUnderTest } from '../../src/<module>';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Factory for test data — keeps individual tests focused on the scenario. */
function makeTestData(overrides?: Partial<RelevantType>): RelevantType {
  return { field: 'default', ...overrides };
}

// ---------------------------------------------------------------------------
// <functionUnderTest>
// ---------------------------------------------------------------------------
describe('<functionUnderTest>', () => {
  it('<happy path — expected behavior>', () => {
    const result = functionUnderTest(validInput);
    expect(result.field).toBe(expectedValue);
  });

  it('<error path — what happens with bad input>', () => {
    const result = functionUnderTest(invalidInput);
    expect(result.pass).toBe(false);
  });

  it('<edge case — boundary value, empty input>', () => {
    const result = functionUnderTest(edgeCaseInput);
    expect(result).toEqual(expectedEdgeCaseResult);
  });
});
```

## Rules

- File naming mirrors source: `src/services/foo.ts` -> `__tests__/services/foo.test.ts`
- One `describe` per exported function
- Happy path first, then error path, then edge cases
- Use factory functions for repeated test data
- No snapshot files — use inline assertions (see `rules/no-snapshot-files.md`)
- Test names describe behavior, not implementation
- Assert specific values, not just existence
- For components, use RNTL queries: `getByRole` > `getByLabelText` > `getByTestId`
- For hooks, use `renderHook` from `@testing-library/react-hooks`
