# Testing Conventions

## Framework
- Jest + React Native Testing Library for unit tests
- Playwright + React Native Web for E2E smoke tests
- Maestro for native E2E flows
- Metro bundler check for missing modules

## Three-layer strategy

| Layer | Tool | What it catches |
|-------|------|-----------------|
| Unit tests | Jest + RNTL | Logic bugs, component behavior |
| Bundle check | Metro bundler | Missing modules, import errors |
| E2E smoke tests | Playwright + RN Web | Runtime crashes, screens not rendering |

## Rules
- **Zero known failures** — never merge code with a failing or OOMing test. Fix or delete the test before merging. A "known failure" that ships becomes every future pipeline run's problem.
- **If you wrote it, it must pass** — run the specific test file you created before committing. If it crashes, OOMs, or fails, that's your bug to fix, not an "environment issue."
- Unit tests mock all native modules — they CANNOT catch missing deps
- When adding new screens: add Playwright test in `e2e/tests/`, add mock in `e2e/mocks/` if native module used
- No snapshot files — use `toMatchInlineSnapshot()` or explicit assertions
- Tests mirror source: `src/foo.ts` → `__tests__/foo.test.ts`
- A11y tests go in `__tests__/components/<domain>/<Component>.a11y.test.tsx`

## Mocking native modules
- Mock in `jest.setup.js` (hides real import failures — Metro bundle check is safety net)
- Mock in `e2e/mocks/` for Playwright (+ add alias in `webpack.config.js`)

## Test memory management
ts-jest compilation is memory-hungry. Heavy import chains cause OOM in Jest workers.

- **Import directly, not from barrels** — `from '@/hooks/useMyHook'` not `from '@/hooks'`. Barrel imports pull in every module's dependency tree.
- **Mock heavy dependencies at module level** — if a hook imports 3 stores, mock the stores: `jest.mock('../../src/stores/useTripStore')`. This prevents ts-jest from compiling the entire store + its service chain.
- **One hook per test file** — don't combine multiple hook tests. Each file runs in its own Jest worker with its own memory budget.
- **Avoid `jest.useFakeTimers()` with `renderHook`** — fake timers + async hooks + act() often cause hangs or memory leaks. Use real timers with short delays instead.
- **Store mocks must return stable references** — if a mock returns `{ preferences: { ... } }` inline, each render gets a new object, triggering `useEffect`/`useCallback` deps → infinite loop → OOM. Declare mock data as module-level constants outside the mock factory.

## Anti-patterns
- **`toMatchSnapshot()`** — creates `.snap` files that fail in CI; use `toMatchInlineSnapshot()` or explicit assertions
- **Testing implementation details** (`getByTestId` first) — prefer a11y queries: `getByRole` > `getByLabelText` > `getByTestId`
- **Tests that depend on execution order** — each test must be independently runnable
- **Mocking everything** — only mock what you must (native modules, network); test real logic
- **Giant integration tests** — keep unit tests under 1 second; slow tests belong in E2E
- **Asserting `toBeDefined()`** — assert specific values (`toBe(100)`, `toContain('error')`)
- **Re-running Maestro/CI to verify a fix** — write a unit test first, get instant feedback
- **Importing from barrel in tests** (`from '@/hooks'`) — pulls in every hook's dependency tree, causes OOM. Import the specific file.
- **Spawning background Jest processes to retry** — if a test OOMs, fix the import chain or mocks, don't throw more memory at it
- **`jest.useFakeTimers()` with renderHook** — causes hangs and memory leaks; use real timers

