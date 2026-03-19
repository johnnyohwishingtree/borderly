---
name: capture-screens
description: Capture screenshots of every app screen and generate a manifest for visual auditing
---

# Capture Screens — Screenshot Documentation

Captures screenshots of every screen in the app via Playwright and generates a manifest documenting the current visual state. This is the source of truth for what the app looks like.

## What It Does

1. Runs the Playwright screenshot capture test against React Native Web
2. Saves numbered screenshots to `e2e/screenshots/`
3. Generates `e2e/screenshots/manifest.json` with metadata for each screen
4. The manifest describes each screen's purpose, domain, and current state

## Usage

```bash
E2E_PROJECT=screenshot-capture npx playwright test captureScreenshots --project=screenshot-capture --workers=1
```

Must use `--workers=1` — parallel runs cause webpack-dev-server race conditions.

## Output

**Screenshots** saved to `e2e/screenshots/` (gitignored):

| # | File | Screen | Domain |
|---|------|--------|--------|
| 01 | `01-welcome-screen.png` | WelcomeScreen | onboarding |
| 02 | `02-tutorial-screen.png` | TutorialScreen | onboarding |
| 03 | `03-passport-scan-method.png` | PassportScanScreen | onboarding |
| 04 | `04-passport-manual-form-empty.png` | PassportScanScreen | onboarding |
| 05 | `05-passport-manual-form-filled.png` | PassportScanScreen | onboarding |
| 06 | `06-confirm-profile.png` | ConfirmProfileScreen | onboarding |
| 07 | `07-biometric-setup.png` | BiometricSetupScreen | onboarding |
| 08 | `08-trip-list-empty.png` | TripListScreen | trips |
| 09 | `09-create-trip.png` | CreateTripScreen | trips |
| 10 | `10-trip-list-with-trip.png` | TripListScreen | trips |
| 11 | `11-trip-detail.png` | TripDetailScreen | trips |
| 12 | `12-leg-form.png` | LegFormScreen | trips |
| 13 | `13-wallet-empty.png` | QRWalletScreen | wallet |
| 14 | `14-add-qr.png` | AddQRScreen | wallet |
| 15 | `15-profile.png` | ProfileScreen | profile |
| 16 | `16-edit-profile.png` | EditProfileScreen | profile |
| 17 | `17-family-management.png` | FamilyManagementScreen | profile |
| 18 | `18-settings.png` | SettingsScreen | settings |
| 19 | `19-help.png` | HelpScreen | settings |
| 20 | `20-feedback.png` | FeedbackScreen | settings |
| 21 | `21-bug-report.png` | BugReportScreen | settings |
| 22 | `22-privacy-policy.png` | PrivacyPolicyScreen | settings |

**Manifest** at `e2e/screenshots/manifest.json`:
```json
{
  "capturedAt": "2026-03-18T...",
  "screenshotDir": "e2e/screenshots/",
  "totalScreens": 22,
  "screens": [
    {
      "id": "01-welcome-screen",
      "file": "01-welcome-screen.png",
      "screen": "WelcomeScreen",
      "domain": "onboarding",
      "description": "First screen shown to new users...",
      "state": "Fresh install, no profile"
    }
  ]
}
```

## Screens NOT Captured (and why)

These screens require native functionality or complex state that can't be simulated on web:

- **PortalSubmissionScreen** — Requires WebView with government portal (native only)
- **SubmissionGuideScreen** — Requires completed form data with submission steps
- **QRDetailScreen** — Requires a saved QR code with image data
- **AddFamilyMemberScreen** — Shares PassportScanScreen with `familyMode` flag
- **FAQScreen** / **TroubleshootingScreen** — Sub-screens of HelpScreen

## When to Re-Run

Re-capture screenshots whenever:
- UI components are modified (styling, layout, copy)
- New screens are added
- Navigation flow changes
- After a visual audit implements fixes (before/after comparison)

## Integration with Other Skills

- **`/visual-audit`** — Reads screenshots from `e2e/screenshots/` and manifest for analysis
- **`/visual-implement`** — Updates UI based on audit findings, then re-captures to verify
