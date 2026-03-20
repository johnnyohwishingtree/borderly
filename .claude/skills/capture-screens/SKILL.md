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

**Screenshots** saved to `e2e/screenshots/` — currently **36 screens** across 5 domains:

| Domain | Screens | Count |
|--------|---------|-------|
| onboarding | Welcome, Tutorial, PassportScan (method/empty/filled), ConfirmProfile, BiometricSetup | 7 |
| trips | TripList (empty/with-trip), CreateTrip, TripDetail, LegForm, SubmissionGuide (JPN/MYS/SGP/VNM/CAN), PortalSubmission (JPN/MYS/SGP/VNM/CAN) | 15 |
| wallet | QRWallet, AddQR, QRDetail | 3 |
| profile | Profile, EditProfile, FamilyManagement, AddFamilyMember | 4 |
| settings | Settings, Help, FAQ, Troubleshooting, Feedback, BugReport, PrivacyPolicy | 7 |

**Manifest** at `e2e/screenshots/manifest.json` — auto-generated with metadata for each screen (id, file, screen name, domain, description, state).

## Playwright vs Native Screenshots

**Playwright screenshots** (this skill) render via React Native Web in Chromium. They capture layout, content, and navigation but have limitations:
- Portal screens show iframe-blocked content (government portals block `X-Frame-Options`)
- Some native-only components render as web approximations

**Native screenshots** are captured post-merge by `screenshot-capture.yml` using an Android emulator + Maestro. These show true native rendering but are slower (~30min) and run only after merges to master.

## Portal Screenshots Note

Portal submission screenshots (MYS, SGP, VNM, CAN) captured via Playwright show loading/blocked states because government portals reject iframe embedding. This is expected — the native app uses real WebViews that bypass this restriction. Native-fidelity portal screenshots come from the post-merge Android emulator workflow.

## When to Re-Run

Re-capture screenshots whenever:
- UI components are modified (styling, layout, copy)
- New screens are added
- Navigation flow changes
- After a visual audit implements fixes (before/after comparison)

## CI Auto-Capture

Screenshots are automatically captured post-merge by `screenshot-capture.yml` when UI files change on master. It boots an Android emulator, runs Maestro capture, and creates a PR if screenshots differ. This replaces the previous in-PR Playwright capture — screenshots are no longer captured during PRs or verify-and-fix runs.

## Integration with Other Skills

- **`/visual-audit`** — Reads screenshots from `e2e/screenshots/` and manifest for analysis
- **`/visual-implement`** — Updates UI based on audit findings, then re-captures to verify
