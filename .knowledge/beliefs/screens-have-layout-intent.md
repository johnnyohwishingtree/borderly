# Belief: Screens Have Layout Intent That Must Be Enforced

## Status
Working assumption

## Statement
Some screens are designed to fit on one viewport (Welcome, Tutorial, BiometricSetup). When content grows (e.g., more country flags), these screens silently become scrollable, pushing CTAs off-screen. This breaks UX — the primary action button should always be visible without scrolling. Layout intent should be declared and enforced, like the 500-line file limit.

## Evidence
- Welcome screen was designed as a single-page hero but 14+ country flags pushed "Get Started" below the fold
- Tutorial screen uses minHeight: height to fill viewport — works until content grows
- The Maestro test generator couldn't determine fitsOnScreen because no screen declares its layout intent
- Users on smaller devices (iPhone SE) would see even fewer elements above the fold

## What would confirm
- A structural test that catches screens exceeding their declared layout intent
- A fix to Welcome that keeps the CTA visible regardless of country count (e.g., horizontal scroll for flags, or limit visible flags)

## What would invalidate
- All screens being scrollable is actually fine UX for a mobile app (no viewport constraints needed)

## Referenced by
- `policies/testing/e2e-testability.md` — ScreenLayout metadata
- `models/maestro-generator.md` — fitsOnScreen detection
