---
name: qa
description: Walk through the application like a real user and document every bug found
argument-hint: "[specific flow to test, e.g. 'onboarding', 'trip creation']"
---

# /qa — Quality Assurance Walkthrough

Walk through the app's functionality like a real user. Document every bug, UX issue, and inconsistency found. This skill reads code and screenshots to simulate user journeys.

## Usage
```
/qa                    # Full app walkthrough
/qa onboarding         # Test only the onboarding flow
/qa trip creation      # Test only trip creation
```

## Steps

### Step 1: Load App Context

1. Read `CLAUDE.md` for architecture and feature list
2. Read `maestro/generator/screenRegistry.ts` for per-screen metadata (fields, alerts, buttons)
3. Read `maestro/generator/componentCatalog.ts` for component interaction patterns
4. Read `e2e/screenshots/flow-graph.json` for navigation edges

### Step 2: Define Test Plan

List every user-facing flow to test. If user specified a flow, focus on that. Otherwise test all:

| Flow | Key screens | What to verify |
|------|------------|----------------|
| Onboarding | Welcome, PassportScan, ConfirmProfile, BiometricSetup | Data persists, navigation correct, skip paths work |
| Trip creation | CreateTrip, TripDetail, LegForm | Form validation, auto-fill, country selection |
| Form completion | LegForm, DynamicForm | Smart delta, auto-fill accuracy, field types correct |
| Portal submission | SubmissionGuide, PortalSubmission | Steps render, copyable fields work, QR capture |
| Family management | FamilyManagement, AddFamilyMember | Add/edit/delete, profile switching, data isolation |
| QR wallet | QRWallet, AddQR, QRDetail | Import, display, search, full-screen view |
| Profile | Profile, EditProfile | View, edit, save, passport validity display |
| Settings | Settings, PrivacyPolicy, Backup/Restore | All toggles work, backup/restore flow |

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

Follow `.knowledge/policies/workflow/bug-fix.md` — write failing test first, then fix.

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
