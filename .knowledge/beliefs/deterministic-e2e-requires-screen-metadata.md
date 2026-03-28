# Belief: Deterministic E2E Tests Require Screen Layout Metadata

## Status
Working assumption

## Statement
E2E tests that interact with UI elements (tap, fill, scroll) cannot be reliable without knowing the screen's layout — which elements are visible without scrolling, which are in fixed headers/footers, and which require scrolling. This metadata must be **auto-inferred from source code**, not manually maintained. A structural test enforces that the generated registry matches the source.

## Evidence
- Blind `scrollUntilVisible` caused flaky failures on Tutorial and Welcome screens (iOS 26)
- `tapButton` without zone metadata required manual `{ scroll: false }` overrides
- `submit-in-app-button` in a fixed footer was unfindable by `scrollUntilVisible` because it's outside the ScrollView
- After adding zone metadata (scroll/header/footer) to testIDs.ts, the emitter became deterministic
- The `fitsOnScreen` flag eliminates all scrolling on single-page screens
- Manual layout maps drift from source — auto-inference prevents this

## What would confirm
- Full E2E test passing consistently across 10+ consecutive runs with zero flakiness
- Generator correctly detecting scrollable/fitsOnScreen for all 35 screens without manual overrides
- UX review skills successfully reasoning about screen layout from registry data alone

## What would invalidate
- A screen where auto-inference is insufficient and manual layout overrides are needed for correctness
- Maestro adding native support for "tap even if off-screen" that makes scroll management unnecessary

## Referenced by
- `models/maestro-generator.md` — ScreenLayout entity (auto-inferred)
- `policies/testing/e2e-testability.md` — zone-based scroll rules
- `principles/source-of-truth-prevents-drift.md` — source → registry → emitter chain
- `src/types/testMeta.ts` — TestMeta type with zone field
