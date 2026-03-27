# Pattern: When to Write a Test

## Policies to follow
- `.knowledge/policies/testing/test-quality.md` — Tier 1-2 tests only
- `.knowledge/policies/testing/test-conventions.md` — mechanical rules
- `.knowledge/policies/workflow/bug-fix.md` — TDD for bugs

## When to write a test

### Always write a test for:
- Bug fixes (TDD — failing test first, per workflow/bug-fix.md)
- Business logic in services (form generation, auto-fill, validation, submission)
- Error handling paths (what happens when storage fails, network drops, input is invalid)
- Data transformation (date parsing, PII stripping, schema mapping)
- State management logic in hooks (computed values, side effects)
- Structural enforcement (new policies need structural tests)

### Consider writing a test for:
- Component interactions (button press → navigation, form submit → store update)
- Edge cases in existing tested code (boundary values, empty input, max items)
- Integration between modules (hook calls service, service reads store)

### Do NOT write a test for:
- Pure UI layout (NativeWind classes, spacing, colors) — visual-audit catches these
- "It renders without crashing" with no interaction testing — zero signal
- Values guaranteed by TypeScript types (return type shape, enum membership)
- Generated/derived values that can't be wrong if the source is correct
- One-liner utility functions with obvious behavior
- Tests where you mock everything the function calls — you're testing the mock

## Test patterns for common scenarios

### Service with I/O
```typescript
// Mock only the I/O boundary, test real logic
jest.mock('../../src/services/storage/keychainService');
// Test the service function with real inputs, verify real outputs
```

### Hook with store dependency
```typescript
// Use module-level constant mock (prevents infinite re-render)
const mockStore = { trips: [], createTrip: jest.fn() };
jest.mock('../../src/stores/useTripStore', () => ({ useTripStore: () => mockStore }));
```

### Date handling
```typescript
// Always construct dates with new Date(year, month-1, day) — NOT new Date('YYYY-MM-DD')
// The string form parses as UTC, local methods shift the day in non-UTC timezones
```

## Checklist
- [ ] Test asserts behavior, not existence (`toBe(42)` not `toBeDefined()`)
- [ ] At least one error/edge case per describe block
- [ ] Mocks are minimal — real logic tested where possible
- [ ] Test names describe user-visible behavior
- [ ] Test runs in under 1 second
- [ ] Test is Tier 1 or Tier 2 per test-quality policy
