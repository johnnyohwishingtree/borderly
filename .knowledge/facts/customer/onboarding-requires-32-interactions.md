# Fact: Onboarding Requires 32 Interactions Before Value

From app launch to first auto-fill of a government portal form, the user must complete approximately 32 interactions across 9 onboarding screens + trip creation + form filling + portal navigation.

Breakdown:
- Welcome (1) → Tutorial x3 (4) → Passport (5) → Preview (6) → Confirm (7)
- Companions (8) → Biometric (9) → Notifications (10)
- Trip list (11) → Create trip with 12 fields (23) → Trip detail (24)
- Leg form (25) → Smart Delta (26) → Fill 2 fields (28) → Save (29)
- Submit in App (30) → Portal loads (31) → Tap pill (32) → Auto-fill

Measured from E2E test: `e2e/mobile/full-e2e.test.ts` (155s runtime, March 2026).
