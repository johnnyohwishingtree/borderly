# Policy: Test Conventions

## Scope
__tests__/, src/**/*.test.ts

## Rules
- REQUIRE: zero known failures — never merge with a failing test
- REQUIRE: if you wrote a test, run it individually before committing
- REQUIRE: tests mirror source: `src/foo.ts` → `__tests__/foo.test.ts`
- REQUIRE: every exported function has tests (happy path + error path)
- DENY: `toMatchSnapshot()` — use `toMatchInlineSnapshot()` or explicit assertions
- DENY: tests that depend on execution order
- DENY: asserting `toBeDefined()` — assert specific values
- DENY: unit tests over 1 second — slow tests belong in E2E
- DENY: spawning background test processes to retry failures

## Test Memory Management
- REQUIRE: import directly, not from barrels (`from '@/hooks/useMyHook'`)
- REQUIRE: mock heavy dependencies at module level
- REQUIRE: store mocks return stable references (module-level constants)
- REQUIRE: `useNavigation`/`useRoute` mocks must return module-level constants — a new object per call causes infinite re-render loops in hooks that list `navigation` in dependency arrays
- DENY: `jest.useFakeTimers()` with `renderHook` — causes hangs/OOM
- DENY: mocked native module tests as proof the feature works (verify at runtime too)

## Exceptions
- E2E tests (Playwright, Maestro) may take longer than 1 second
- Generated test data factories don't need their own tests

## Anti-patterns
- Test passes but native module is null at runtime (mock hides the bug)
- Store mock returns inline `{ preferences: {...} }` → infinite useEffect loop → OOM
- `from '@/hooks'` barrel import in test → pulls all hook dependencies → OOM
- Re-running CI to check if a fix worked instead of writing a unit test
- `useNavigation: () => ({ goBack: mockFn })` creates a new object per render → infinite useEffect loop; use `const mockNav = { goBack: mockFn }; useNavigation: () => mockNav`

## Enforcement
- `.claude/rules/commit-gate.md` — must pass before commit
- `.claude/rules/no-snapshot-files.md` — inline snapshots only

## References
- Related: policies/testing/e2e-testability.md
- Related: policies/testing/drift-detection.md
