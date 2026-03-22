# __tests__/ — Unit & Integration Tests

## Structure

Test files mirror the `src/` directory structure:

```
__tests__/
├── services/        → Tests for src/services/
├── components/      → Tests for src/components/
├── screens/         → Tests for src/screens/
├── stores/          → Tests for src/stores/
├── hooks/           → Tests for src/hooks/
├── utils/           → Tests for src/utils/
├── schemas/         → Schema validation tests
├── integration/     → Cross-module integration tests
├── performance/     → Performance benchmarks
├── security/        → Security-focused tests
├── structure/       → Structural convention enforcement tests
├── fixtures/        → Shared test data
└── lint/            → Lint rule tests
```

## Rules

### No snapshot files

Never use `toMatchSnapshot()` — it creates `.snap` files that fail in CI. Use `toMatchInlineSnapshot()` or assert on specific properties. See `.claude/rules/no-snapshot-files.md`.

### Mock native modules in jest.setup.js

All native modules (camera, keychain, MMKV, etc.) are mocked in `jest.setup.js`. When adding a new native dependency:
1. Add the Jest mock in `jest.setup.js`
2. Add the web mock in `e2e/mocks/` (separate concern)

### Test naming

- File: `<ModuleName>.test.ts` or `<ComponentName>.test.tsx`
- Describe block: matches the module/component name
- Test names: describe behavior, not implementation

### What to test

| Layer | Test focus |
|-------|-----------|
| Services | Input/output, edge cases, error handling |
| Components | Rendering, user interaction, prop variations |
| Stores | State transitions, action side effects |
| Schemas | Field completeness, validation rules |
| Integration | Multi-module workflows (e.g., credential → auto-fill) |

### Bug fix TDD workflow

When a bug is found (via Maestro, E2E, or manual testing):
1. Write a failing unit test that reproduces the bug
2. Verify it fails without the fix
3. Fix the code
4. Verify the test passes
5. Only then re-run the E2E/Maestro test

See `.claude/rules/bug-fix-workflow.md`.

### Running tests

```bash
pnpm test              # Run all unit tests
pnpm test --coverage   # With coverage report
pnpm test <pattern>    # Run specific test files
```
