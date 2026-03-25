# Pattern: Add a New Screen

## Files to create/modify (in order)

### 1. `src/screens/<domain>/<ScreenName>/<ScreenName>.tsx`
- Thin render layer — extract business logic to hooks
- Add testIDs on interactive elements
- Follow NativeWind styling (see `.knowledge/conventions/styling.md`)
- Add a11y props (see `.knowledge/conventions/accessibility/component-props.md`)

### 2. Register in navigator
- Add to appropriate navigator in `src/app/navigation/`
- Add type to navigation types

### 3. `e2e/tests/<screen>.spec.ts` — Playwright E2E test
Verify screen renders. If screen uses new native module, add mock in `e2e/mocks/` and alias in `webpack.config.js`.

### 4. `__tests__/screens/<domain>/<ScreenName>.test.tsx` — Unit tests

### 5. A11y test — `__tests__/components/<domain>/<ScreenName>.a11y.test.tsx`

