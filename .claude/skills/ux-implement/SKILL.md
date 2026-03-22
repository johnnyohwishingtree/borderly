---
name: ux-implement
description: Implement flow-level UX changes from a ux-review report
argument-hint: "[specific finding or 'all' to implement everything from the review]"
---

# UX Implement — Apply Flow-Level UX Changes

Takes findings from a `/ux-review` report and implements the flow changes in code. This may involve creating new screens, restructuring navigation, modifying stores, and updating onboarding flows.

**How this differs from `/visual-implement`:**
- `/visual-implement` applies per-screen styling fixes (Tailwind classes, spacing, colors)
- `/ux-implement` restructures user flows — new screens, navigation changes, store modifications

## Prerequisites

- A completed `/ux-review` report (from the current session or provided by the user)
- Understanding of the current navigation structure

## Steps

### Step 1: Review Findings & Plan

1. If the user provides a specific finding, focus on that. Otherwise, use the full `/ux-review` report.
2. **Classify each finding** by implementation scope:

| Scope | Examples | Approach |
|-------|----------|----------|
| **Shortcut** | Add button to existing screen, reorder nav items | Edit existing screen files |
| **Screen addition** | New "Add Companions" screen in onboarding | Create screen + update navigator + add E2E test |
| **Flow restructure** | Move family setup into onboarding stack | Modify navigator, update store logic, migrate state |
| **Store change** | Track onboarding sub-steps, new state fields | Modify Zustand store + update consumers |

3. **Order by dependency** — store changes before screens, screens before navigation wiring.
4. Present the plan to the user and confirm before implementing.

### Step 2: Implement Changes

Follow the project's standard patterns for each type of change:

#### New Screens

1. Create the screen in `src/screens/<domain>/<ScreenName>.tsx`
2. Add the route to `src/app/navigation/types.ts`
3. Wire into the appropriate navigator (`RootNavigator.tsx`, `MainTabNavigator.tsx`, or a stack)
4. Use NativeWind `className` for styling
5. Use existing `src/components/ui/` components
6. Extract business logic into hooks in `src/hooks/` if > 3 useState calls
7. Add a Playwright E2E test in `e2e/tests/`

#### Navigation Changes

1. Read the current navigator structure before modifying
2. Update `types.ts` with new route params
3. Modify the navigator — add/reorder screens
4. Update any `navigation.navigate()` calls in affected screens
5. Verify deep links and back navigation still work

#### Store Changes

1. Read the current store before modifying
2. Add new state fields and actions
3. Update any hooks or screens that consume the store
4. Add/update tests in `__tests__/stores/`

#### Onboarding Flow Changes

The onboarding stack is in `src/app/navigation/RootNavigator.tsx`:
```
Welcome → Tutorial → PassportScan → ConfirmProfile → BiometricSetup
```

To add a screen to onboarding:
1. Create the screen in `src/screens/onboarding/`
2. Add to `OnboardingStackParamList` in `types.ts`
3. Add a lazy import and `<OnboardingStack.Screen>` entry in `RootNavigator.tsx`
4. Update the screen that navigates TO and FROM the new screen
5. Export from `src/screens/onboarding/index.ts`

### Step 3: Follow Bug-Fix TDD for Behavioral Changes

If a finding involves broken behavior (not just flow restructuring), follow the TDD workflow:

1. Write a failing test that reproduces the issue
2. Fix the code so the test passes
3. Run the test suite to verify no regressions

Pure flow additions (new screens, navigation wiring) don't need pre-existing failing tests, but DO need new tests added.

### Step 4: Verify

Run all checks after implementation:

```bash
pnpm typecheck    # Must pass
pnpm test         # Must pass
pnpm lint         # No new errors
```

If screens were added or modified:
```bash
pnpm e2e          # E2E tests must pass
```

### Step 5: Re-Capture Screenshots (if screens/components changed)

If new screens were added or existing screens were significantly modified:

```bash
# Screen screenshots (serial)
E2E_PROJECT=screenshot-capture npx playwright test captureScreenshots --project=screenshot-capture --workers=1

# Component screenshots (parallel) — only if components were modified
E2E_PROJECT=screenshot-capture npx playwright test captureComponents --project=screenshot-capture
```

Per-screen and per-component manifests at `__screenshots__/manifest.json` are auto-updated by the capture tests. Component screenshots are also captured automatically in CI on every PR.

### Step 6: Update Architecture Docs

If navigation structure changed, run `/update-architecture` or manually update:
- `CLAUDE.md` project structure section (if new directories/screens added)
- `docs/mvp-proposal.md` (if user-facing flows changed)
- Navigation type definitions

### Step 7: Summary

Present what was implemented:
- New screens created (with file paths)
- Navigation changes made
- Store modifications
- Tests added
- Before/after flow comparison (tap counts, screen count)

## Project-Specific Rules

- **Screens** go in `src/screens/<domain>/` and are exported from domain barrel files
- **Hooks** go in `src/hooks/` and are exported from `src/hooks/index.ts`
- **Components** use props only — no direct store imports (see `.claude/rules/store-boundaries.md`)
- **Styling** uses NativeWind `className` everywhere — no inline styles
- **Icons** from `lucide-react-native` only — not vector-icons
- **UI primitives** from `src/components/ui/` — check before creating new ones
- **Navigation** uses React Navigation v7 with typed routes
- **State** in Zustand stores — one store per domain
- **Sensitive data** (passport) stays in OS Keychain — never in MMKV or WatermelonDB directly

## What NOT to Do

- **Don't change visual styling** unless it's part of a flow change — that's `/visual-implement`
- **Don't refactor architecture** — that's `/refactor-design`
- **Don't skip E2E tests** for new screens
- **Don't break existing navigation** — verify back button and deep links still work
- **Don't add features beyond the finding** — implement exactly what the review identified

## Running This Skill

1. **After a UX review**: `/ux-implement` — applies findings from the review
2. **Specific finding**: `/ux-implement` then say "implement the family onboarding flow"
3. **With a report**: Paste UX review findings, then `/ux-implement`
4. **Plan first**: `/ux-review` → `/epic-planner` → implement stories individually
