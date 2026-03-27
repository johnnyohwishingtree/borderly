# Model: User Journeys

Core user flows through the app. Used by `/qa`, `/ux-review`, and `/visual-audit` to define what to test.

## Journeys

### First-time setup
Welcome → Tutorial → PassportScan → ConfirmProfile → AddCompanions → BiometricSetup
**Verify:** data persists, navigation correct, skip paths work

### Trip creation
TripList → CreateTrip → TripDetail → LegForm
**Verify:** form validation, auto-fill, country selection

### Form completion
LegForm (per destination) → DynamicForm fields
**Verify:** smart delta, auto-fill accuracy, field types correct, searchable selects work

### Portal submission
SubmissionGuide → PortalSubmission
**Verify:** steps render, copyable fields work, QR capture

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
- `maestro/generator/screenRegistry.ts` — per-screen metadata (fields, alerts, buttons)
- `maestro/generator/componentCatalog.ts` — component interaction patterns
- `e2e/screenshots/flow-graph.json` — navigation graph (stacks, tabs, edges)

## Invariants
- Every journey must be completable without leaving the app
- Every journey must handle empty state (no trips, no family members, no QR codes)
- Sensitive data only accessed via Keychain during journeys (not MMKV)
