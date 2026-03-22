---
name: capture-screens
description: Capture screenshots of every app screen and generate a manifest for visual auditing
---

# Capture Screens — Screenshot Documentation

Captures screenshots of every screen in the app via Playwright and generates a manifest documenting the current visual state. This is the source of truth for what the app looks like.

## What It Does

1. Runs the Playwright screenshot capture test against React Native Web
2. Saves screenshots to colocated `__screenshots__/` folders next to each screen's source code
3. Generates a per-screen `manifest.json` inside each `__screenshots__/` folder
4. Each manifest describes the screen's variants, descriptions, and captured states

## Screenshot Location

Screenshots are colocated with their screen source files:

```
src/screens/<domain>/<ScreenName>/__screenshots__/<variant>.png
```

Examples:
- `src/screens/trips/TripListScreen/__screenshots__/empty.png`
- `src/screens/trips/TripListScreen/__screenshots__/with-trip.png`
- `src/screens/onboarding/PassportScanScreen/__screenshots__/method-selection.png`

The variant name describes the screen state (e.g., `default`, `empty`, `with-trip`, `manual-entry-filled`).

To find all screenshots: `find src/screens -path "*/__screenshots__/*.png"`

## Usage

```bash
E2E_PROJECT=screenshot-capture npx playwright test captureScreenshots --project=screenshot-capture --workers=1
```

Must use `--workers=1` — parallel runs cause webpack-dev-server race conditions.

## Flow Graph Generation

After capturing screenshots, generate the navigation flow graph:

```bash
npx tsx e2e/scripts/generate-flow-graph.ts
```

This statically analyzes `src/app/navigation/types.ts` and all screen files (found in `src/screens/<domain>/<ScreenName>/<ScreenName>.tsx`) to produce `e2e/screenshots/flow-graph.json` — a machine-readable map of:
- **Stacks**: Which screens belong to which navigation stacks
- **Tabs**: Bottom tab structure
- **Edges**: Every `navigate()`, `goBack()`, and tab switch with source file + line number
- **Screen files**: Screen name to source file mapping

The flow graph is consumed by `/ux-review` to reason about navigation paths and tap counts without re-reading all screen source files.

## Output

**Screenshots** saved to colocated `__screenshots__/` folders — currently **37 screens** across 7 domains:

| Domain | Screens | Count |
|--------|---------|-------|
| onboarding | Welcome, Tutorial, PassportScan (method/empty/filled), ConfirmProfile, AddCompanions, BiometricSetup | 8 |
| trips | TripList (empty/with-trip), CreateTrip, TripDetail, LegForm, SubmissionGuide (JPN/MYS/SGP/VNM/CAN), PortalSubmission (JPN/MYS/SGP/VNM/CAN) | 15 |
| wallet | QRWallet, AddQR, QRDetail | 3 |
| profile | Profile, EditProfile, FamilyManagement, AddFamilyMember | 4 |
| settings | Settings, PrivacyPolicy | 2 |
| support | Help, Feedback, BugReport | 3 |
| help | FAQ, Troubleshooting | 2 |

**Per-screen manifests** at `src/screens/<domain>/<ScreenName>/__screenshots__/manifest.json` — each describes that screen's variants with description and state metadata.

**Flow graph** at `e2e/screenshots/flow-graph.json` — static analysis of navigation structure (stacks, tabs, edges, screen files).

## Playwright Limitations

Screenshots render via React Native Web in Chromium. Limitations:
- Portal screens show iframe-blocked content (government portals block `X-Frame-Options`)
- Some native-only components render as web approximations

## When to Re-Run

Re-capture screenshots whenever:
- UI components are modified (styling, layout, copy)
- New screens are added
- Navigation flow changes
- After a visual audit implements fixes (before/after comparison)

Screenshots are part of the source tree — update them in the same PR as the code change.

## Integration with Other Skills

- **`/visual-audit`** — Reads screenshots from `src/screens/**/__screenshots__/` and manifest for analysis
- **`/visual-implement`** — Updates UI based on audit findings, then re-captures to verify
- **`/ux-review`** — Reads flow graph to analyze navigation paths, tap counts, and flow efficiency
- **`/ux-implement`** — Uses flow graph to understand current structure before restructuring
