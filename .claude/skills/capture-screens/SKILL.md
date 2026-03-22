---
name: capture-screens
description: Capture screenshots of every app screen and component, generating manifests for visual auditing
---

# Capture Screens — Screenshot Documentation

Captures screenshots of every screen and component in the app via Playwright and generates manifests documenting the current visual state. This is the source of truth for what the app looks like.

## Automatic vs Manual Capture

**Component screenshots** are captured automatically in CI on every PR (`e2e-smoke.yml`). You usually don't need to capture them manually.

**Screen screenshots** require manual capture — they need navigation state injection and must run serially. Run this skill when screen UI changes or new screens are added.

## What It Does

1. Runs Playwright screenshot capture tests against React Native Web
2. Saves screenshots to colocated `__screenshots__/` folders next to each source file
3. Generates per-screen and per-component `manifest.json` inside each `__screenshots__/` folder

## Screenshot Locations

**Screens** are colocated with their screen source files:
```
src/screens/<domain>/<ScreenName>/__screenshots__/<variant>.png
```

**Components** are colocated with their component source files:
```
src/components/<domain>/<Component>/__screenshots__/<variant>.png
```

To find all screenshots:
- Screens: `find src/screens -path "*/__screenshots__/*.png"`
- Components: `find src/components -path "*/__screenshots__/*.png"`

## Usage

### Capture screen screenshots (serial — shares navigation state)
```bash
E2E_PROJECT=screenshot-capture npx playwright test captureScreenshots --project=screenshot-capture --workers=1
```

### Capture component screenshots (parallel — stateless harness)
```bash
E2E_PROJECT=screenshot-capture npx playwright test captureComponents --project=screenshot-capture
```

### Capture both
```bash
E2E_PROJECT=screenshot-capture npx playwright test captureScreenshots --project=screenshot-capture --workers=1
E2E_PROJECT=screenshot-capture npx playwright test captureComponents --project=screenshot-capture
```

Screen captures must use `--workers=1` (navigation state conflicts). Component captures run in parallel (each is a stateless URL).

## Flow Graph Generation

After capturing screenshots, generate the navigation flow graph:

```bash
npx tsx e2e/scripts/generate-flow-graph.ts
```

This produces `e2e/screenshots/flow-graph.json` — a machine-readable map of stacks, tabs, edges (navigate/goBack/tab switch), and screen file paths.

## Output

**Screen screenshots** — currently **37 screens** across 7 domains:

| Domain | Screens | Count |
|--------|---------|-------|
| onboarding | Welcome, Tutorial, PassportScan (method/empty/filled), ConfirmProfile, AddCompanions, BiometricSetup | 8 |
| trips | TripList (empty/with-trip), CreateTrip, TripDetail, LegForm, SubmissionGuide (JPN/MYS/SGP/VNM/CAN), PortalSubmission (JPN/MYS/SGP/VNM/CAN) | 15 |
| wallet | QRWallet, AddQR, QRDetail | 3 |
| profile | Profile, EditProfile, FamilyManagement, AddFamilyMember | 4 |
| settings | Settings, PrivacyPolicy | 2 |
| support | Help, Feedback, BugReport | 3 |
| help | FAQ, Troubleshooting | 2 |

**Component screenshots** — **31 components / 87 variants** across 6 domains (ui, trips, guide, forms, profile, submission). Registered in `e2e/component-registry.tsx`.

**Flow graph** at `e2e/screenshots/flow-graph.json`.

## Playwright Limitations

Screenshots render via React Native Web in Chromium. Limitations:
- Portal screens show iframe-blocked content (government portals block `X-Frame-Options`)
- Some native-only components render as web approximations

## When to Re-Run

- **Screens**: After UI changes to screens, new screens added, or navigation changes
- **Components**: After modifying component styling or adding new components to the registry. Also captured automatically in CI on every PR.

Screenshots are part of the source tree — update them in the same PR as the code change.

## Integration with Other Skills

- **`/visual-audit`** — Reads screen + component screenshots for analysis
- **`/visual-implement`** — Updates UI based on audit findings, then re-captures to verify
- **`/ux-review`** — Reads flow graph to analyze navigation paths, tap counts, and flow efficiency
- **`/ux-implement`** — Uses flow graph to understand current structure before restructuring
