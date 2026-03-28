# Belief: Deterministic E2E Tests Require Screen Layout Metadata

## Status
Working assumption

## Statement
E2E tests that interact with UI elements (tap, fill, scroll) cannot be reliable without knowing the screen's layout — which elements are visible without scrolling, which are in fixed headers/footers, and which require scrolling. Without this metadata, the test generator guesses scroll behavior, causing flakiness.

## Evidence
- Blind `scrollUntilVisible` caused flaky failures on Tutorial and Welcome screens (iOS 26)
- `tapButton` without zone metadata required manual `{ scroll: false }` overrides
- `submit-in-app-button` in a fixed footer was unfindable by `scrollUntilVisible` because it's outside the ScrollView
- After adding zone metadata (scroll/header/footer) to testIDs.ts, the emitter became deterministic
- The `fitsOnScreen` flag eliminates all scrolling on single-page screens

## What would confirm
- Full E2E test passing consistently across 10+ consecutive runs with zero flakiness
- UX review skills successfully reasoning about screen layout from registry data alone

## What would invalidate
- A screen where zone metadata is insufficient (e.g., dynamic content that changes layout based on data)
- Maestro adding native support for "tap even if off-screen" that makes scroll management unnecessary

## Referenced by
- `models/maestro-generator.md` — ScreenLayout entity
- `policies/testing/e2e-testability.md` — zone-based scroll rules
- `src/types/testMeta.ts` — TestMeta type with zone field
