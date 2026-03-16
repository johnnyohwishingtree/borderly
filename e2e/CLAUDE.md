# e2e/ — Playwright E2E Smoke Tests

## Purpose

E2E tests render the full app in Chromium via React Native Web and verify screens appear correctly. They catch runtime crashes and missing modules that unit tests miss.

These are **smoke tests**, not full feature coverage. They verify:
- Screens render without crashing
- Navigation works between screens
- Key UI elements are visible

## Structure

```
e2e/
├── mocks/              → Web mocks for native modules
├── tests/              → Playwright test files
└── portal-validation/  → Government portal validation tests
```

## Rules

### Every new screen needs an E2E test

When adding a screen to the app, add a Playwright test in `e2e/tests/` that verifies it renders.

### Every native module needs a web mock

Native modules crash at runtime in the browser — webpack won't catch this at build time. When adding a native dependency:

1. Create a mock in `e2e/mocks/<module-name>.js`
2. Add an alias in `webpack.config.js` pointing to the mock
3. Run `pnpm e2e` to verify

### Mock patterns

Mocks should export the same interface as the real module with no-op implementations:

```js
// e2e/mocks/camera.js
module.exports = {
  Camera: () => null,
  requestCameraPermission: () => Promise.resolve('granted'),
};
```

### Running E2E tests

```bash
pnpm e2e               # Run all E2E tests
npx playwright test     # Alternative
```

The E2E suite builds with webpack first, then runs Playwright against the bundle.
