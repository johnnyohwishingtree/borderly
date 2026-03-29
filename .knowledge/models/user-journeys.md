# Model: User Journeys

Core user flows through the app. Used by `/qa`, `/ux-review`, and `/visual-audit` to define what to test.

## Journeys

### First-time setup
Welcome → Tutorial → PassportScan → ConfirmProfile → AddCompanions → BiometricSetup
**Verify:** data persists, navigation correct, skip paths work

### Trip creation
TripList → CreateTrip (name, dates, country, flight details, accommodation, address) → TripDetail → LegForm
**Verify:** form validation, auto-fill, country selection, flight number/airline/arrival airport fields, accommodation with address sub-fields

### Form completion
LegForm (per destination) → Smart Delta → DynamicForm fields → Save
**Verify:** smart delta button expands all sections, auto-fill populates profile fields, remaining fields (email, phone) require manual entry, save persists progress

### Portal submission
LegForm → SubmitInApp → PortalSubmission (WebView) → AutoFill pill → Close → TripList
**Verify:** page detection (form vs auth vs captcha), step indicator loads, auto-fill pill triggers JS injection, fields populated in WebView, portal close returns to trip list, copyable fields as fallback when auto-fill unavailable, QR capture

### Family management
Profile → FamilyManagement → AddFamilyMember
**Verify:** add/edit/delete, profile switching, data isolation between travelers

### QR wallet
QRWallet → AddQR → QRDetail
**Verify:** import, display, search, full-screen view

### Profile management
Profile → EditProfile
**Verify:** view, edit, save, passport validity display

### Settings & help
Settings → PrivacyPolicy, Backup/Restore, Help, Feedback, BugReport
**Verify:** all toggles work, backup/restore flow, troubleshooting

## Key Files
- `e2e/mobile/full-e2e.test.ts` — deterministic E2E test covering core journeys
- `e2e/mobile/driver.ts` — MobileDriver wrapping mobilecli
- `e2e/screenshots/` — auto-captured screenshots from each test run
- `src/screens/*/testIDs.ts` — per-screen element declarations

## Invariants
- Every journey must be completable without leaving the app
- Every journey must handle empty state (no trips, no family members, no QR codes)
- Sensitive data only accessed via Keychain during journeys (not MMKV)
