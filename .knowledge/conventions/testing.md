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
- Unit tests mock all native modules — they CANNOT catch missing deps
- When adding new screens: add Playwright test in `e2e/tests/`, add mock in `e2e/mocks/` if native module used
- No snapshot files — use `toMatchInlineSnapshot()` or explicit assertions
- Tests mirror source: `src/foo.ts` → `__tests__/foo.test.ts`
- A11y tests go in `__tests__/components/<domain>/<Component>.a11y.test.tsx`

## Mocking native modules
- Mock in `jest.setup.js` (hides real import failures — Metro bundle check is safety net)
- Mock in `e2e/mocks/` for Playwright (+ add alias in `webpack.config.js`)

## Known gaps
