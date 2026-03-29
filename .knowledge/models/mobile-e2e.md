# Model: Mobile E2E Testing

The E2E test system for Borderly. Uses `@mobilenext/mobilecli` — the same tool chain Claude uses via mobile-mcp for interactive debugging.

## Architecture

```
Jest test (e2e/mobile/) → MobileDriver → mobilecli CLI → iOS Simulator
                                ↕
Claude debugging:     mobile-mcp → mobilecli CLI → iOS Simulator
```

Same tool for both development (AI-driven) and CI (deterministic). No translation layer.

## MobileDriver (e2e/mobile/driver.ts)

Thin wrapper around `mobilecli` binary with smart helpers:

- `tapById(testID, opts?)` — finds by testID → taps. If not found, scrolls down then back up searching both directions. `opts.maxSwipes` controls search depth (default 5).
- `fillById(testID, text)` — taps field, types, dismisses keyboard with Enter.
- `selectById(testID, search)` — taps trigger, types search, presses Enter to select single match.
- `assertVisible(text)` — polls element list until text found (3s default timeout).
- `swipe(direction)` — single gesture scroll.
- `tapElement(el)` — viewport-aware: if element center is off-screen, swipes first then re-finds.
- `sleep(ms)` — public wait helper (used in tests for WebView loading, auto-fill execution).

## Test Structure

```typescript
// e2e/mobile/full-e2e.test.ts
const device = await MobileDriver.connect();
await device.launch('com.borderly.app', { clearState: true });
await device.tapById('take-tutorial-button');
await device.fillById('trip-name-field', 'Malaysia Trip 2026');
await device.selectById('country-select-0', 'Malaysia');
```

Run: `pnpm e2e:mobile`

## How Tests Stay in Sync with Code

1. **CI runs the deterministic test** — no AI needed
2. **When test fails** (testID renamed, flow changed): AI agent uses mobile-mcp to see the new UI and updates the test
3. **Structural tests** catch testID drift early
4. **testIDs.ts files** per screen organize IDs — same source for test and components

## Component Testability Requirements

Components must be accessible to the test framework (mobilecli uses the accessibility tree):
- All interactive elements need `testID`
- Buttons in modals need `accessibilityRole="button"` and `accessibilityLabel`
- SearchableSelect: `autoCorrect={false}`, `onSubmitEditing` for Enter-to-select
- If a component is hard to test, adjust the code to make it testable

## Key Files

- `e2e/mobile/driver.ts` — MobileDriver class wrapping mobilecli
- `e2e/mobile/full-e2e.test.ts` — full user journey test
- `e2e/mobile/jest.config.js` — Jest config for mobile E2E
- `src/screens/*/testIDs.ts` — per-screen testID declarations
- `e2e/screenshots/` — auto-captured screenshots from each test run (committed to git)
