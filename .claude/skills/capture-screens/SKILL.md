---
name: capture-screens
description: Capture screenshots of every app screen and component, generating manifests for visual auditing
---

# Capture Screens — Screenshot Documentation

Captures screenshots of every screen and component in the app via Playwright and generates manifests documenting the current visual state. This is the source of truth for what the app looks like.

## Prerequisites

- Playwright installed and configured
- React Native Web build available (`pnpm web` can serve the app)
- `e2e/` directory with screenshot capture tests present

## Automatic vs Manual Capture

**Component screenshots** can be captured in parallel and are quick to regenerate. You usually only need to recapture them when component styling changes.

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

**Screen screenshots** — Read `maestro/generator/screenRegistry.ts` for the current screen inventory. Screen domains are discovered by listing directories under `src/screens/`.

**Component screenshots** — Read `e2e/component-registry.tsx` for the component registry and current variant counts.

**Flow graph** at `e2e/screenshots/flow-graph.json`.

## Playwright Limitations

Screenshots render via React Native Web in Chromium. Limitations:
- Portal screens show iframe-blocked content (government portals block `X-Frame-Options`)
- Some native-only components render as web approximations

## When to Re-Run

- **Screens**: After UI changes to screens, new screens added, or navigation changes
- **Components**: After modifying component styling or adding new components to the registry

Screenshots are part of the source tree — update them in the same PR as the code change.

## Guardrails

- Screen captures must use `--workers=1`
- Don't capture during active development — wait for a stable state
