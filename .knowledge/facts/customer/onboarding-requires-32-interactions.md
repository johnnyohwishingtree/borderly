# Fact: Onboarding Requires ~20 Interactions Before Value

From app launch to first auto-fill of a government portal form, the user completes approximately 20 interactions across 3 onboarding screens + trip creation + form filling + portal navigation.

Breakdown:
- Welcome (1) → Passport (2) → Preview (3) → Confirm (4)
- Trip list (5) → Create trip with 12 fields (17) → Trip detail (18)
- Leg form (19) → Smart Delta (20) → Fill 2 fields (22) → Save (23)
- Submit in App (24) → Portal loads (25) → Tap pill (26) → Auto-fill

Previously 32 interactions across 9 onboarding screens (March 2026). Reduced by removing tutorial (3 screens), companions, biometric, and notification permission from onboarding.

E2E test runtime: 135s (down from 155s). Measured from `e2e/mobile/full-e2e.test.ts`.
