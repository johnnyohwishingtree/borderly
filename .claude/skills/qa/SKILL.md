---
name: qa
description: Walk through the application like a real user and document every bug found
argument-hint: "[specific flow to test, e.g. 'onboarding', 'trip creation']"
---

# /qa — Quality Assurance Walkthrough

Walk through the app's functionality like a real user. Document every bug, UX issue, and inconsistency found. This skill reads code and screenshots to simulate user journeys.

## Prerequisites

- Project builds cleanly (`pnpm typecheck` and `pnpm test` pass)
- Screen testIDs available at `src/screens/*/testIDs.ts`
- `gh` CLI authenticated (for creating bug issues)

## Usage
```
/qa                    # Full app walkthrough
/qa onboarding         # Test only the onboarding flow
/qa trip creation      # Test only trip creation
```

## Steps

### Step 1: Load App Context

1. Read `CLAUDE.md` for architecture and feature list
2. Read `src/screens/*/testIDs.ts` for per-screen element declarations
3. Read `e2e/screenshots/` for visual reference of current screen state
4. Read `e2e/mobile/full-e2e.test.ts` for the deterministic test flow

### Step 2: Define Test Plan

Read `.knowledge/models/user-journeys.md` for the core user flows and what to verify for each.

If user specified a flow, focus on that. Otherwise test all journeys listed in the model.

### Step 3: Walk Through Each Flow

For each flow, read the screen source files and verify:

**Functional correctness:**
- Do all buttons navigate to the correct screen?
- Do form submissions save data to the correct store?
- Do conditional renders show the right content for each state?
- Do error handlers display meaningful messages?

**State management:**
- Is data preserved when navigating away and back?
- Do stores update correctly on CRUD operations?
- Is sensitive data only accessed via Keychain (not MMKV)?

**Edge cases:**
- Empty states (no trips, no family members, no QR codes)
- Maximum data (8 family members, many trips)
- Invalid input (expired passport, missing required fields)
- Offline behavior

**Accessibility:**
- All interactive elements have `accessibilityRole` and `accessibilityLabel`
- Error messages use `accessibilityLiveRegion="polite"`
- Touch targets are 44x44px minimum

### Step 4: Document Bugs

For each bug found, record:
- **Severity**: Critical / Major / Minor
- **Location**: Screen name and file path
- **Steps to reproduce**: What triggers the bug
- **Expected**: What should happen
- **Actual**: What happens instead
- **Root cause** (if identifiable from code)

### Step 5: Fix Critical Bugs

Follow `.knowledge/policies/workflow/bug-fix.md`.

### Step 6: Create Issues for Non-Critical Bugs

```bash
gh issue create \
  --title "Bug: <description>" \
  --label "bug" \
  --body "<severity, steps to reproduce, expected vs actual>"
```

### Step 7: Summary

Report:
- Total bugs found (by severity)
- Bugs fixed in this session
- Issues created for deferred bugs
- Flows that passed without issues

## Guardrails

- Fix critical bugs immediately, create issues for non-critical
- Follow bug-fix policy for all fixes
