---
name: flow-audit
description: Automated UX flow audit — captures flow sequences, detects state transition bugs, and creates epics with visual mockups
argument-hint: "[optional: specific flow to audit, e.g. 'companion', 'trip creation']"
---

# Flow Audit — Automated UX State Transition Analysis

Detects bugs where the **UI doesn't reflect the underlying state change** after a user action. This is the class of bug where individual screens render fine but the *flow between them* is broken (e.g., adding a companion but the screen still says "just me").

**How this differs from other skills:**
- `/visual-audit` evaluates individual screen aesthetics (spacing, contrast, hierarchy)
- `/ux-review` evaluates navigation paths and tap counts (information architecture)
- `/flow-audit` evaluates **state transitions** — did the UI update correctly after an action?

## What It Detects

1. **Stale UI after state change** — button text, lists, counts, badges not reflecting new state
2. **Missing feedback** — action completes but user sees no confirmation (no toast, no list update, no navigation)
3. **Broken round-trips** — navigate away, perform action, return — original screen doesn't show the change
4. **Inconsistent state across screens** — profile shows 2 family members but trip form shows 1 traveler
5. **Dead-end flows** — user completes an action but has no clear next step

## Steps

### Step 1: Capture Flow Sequences

Run the flow screenshot capture to get before/after pairs:

```bash
E2E_PROJECT=screenshot-capture npx playwright test captureFlowSequences --project=screenshot-capture --workers=1
```

This captures timestamped screenshot sequences for each critical flow:
- Onboarding: welcome → scan → preview → confirm → companions → biometric → main
- Add companion: companions-before → scan → preview → confirm → companions-after
- Create trip: trip-list-before → create → fill → trip-list-after
- Fill form: leg-form-before → fill-fields → leg-form-after

Output: `e2e/screenshots/flows/` directory with sequence folders.

### Step 2: Update Flow Graph

```bash
npx tsx e2e/scripts/generate-flow-graph.ts
```

### Step 3: Analyze State Transitions

For each flow sequence, examine the before/after screenshots and source code:

1. **Read the flow screenshots** — use the Read tool on the PNG files in `e2e/screenshots/flows/`
2. **Read the screen source code** — check what state is displayed and where it comes from
3. **Read the hook/store code** — trace the data path from action to UI update
4. **Check for state disconnects** — does the store get updated? Does the screen re-read it?

#### Critical Flows to Check

| Flow | Action | Expected State Change | Where to Verify |
|------|--------|----------------------|-----------------|
| Add companion | Scan + confirm companion passport | Companion appears in list, button text changes | `AddCompanionsScreen.tsx`, `useProfileStore` |
| Create trip | Fill trip form + save | Trip card appears in list | `TripListScreen.tsx`, `useTripStore` |
| Fill leg form | Enter form fields + save | Form status changes, progress updates | `TripDetailScreen.tsx`, `useFormStore` |
| Edit profile | Change field + save | Updated value shown on profile screen | `ProfileScreen.tsx`, `useProfileStore` |
| Delete family member | Remove member + confirm | Member removed from list, count updates | `FamilyManagementScreen.tsx` |
| Scan boarding pass | Scan + confirm | Trip/leg auto-created or updated | `TripListScreen.tsx` |

### Step 4: Cross-Screen Consistency Check

Verify the same data appears consistently across screens:
- Family member count: AddCompanions, Profile, FamilyManagement, TripDetail traveler tabs
- Trip count: TripList badge, Profile summary
- Form completion: LegForm progress, TripDetail status badge, TripList card status
- Passport data: PassportPreview, ConfirmProfile, Profile screen, EditProfile

### Step 5: Programmatic Validation

Read the flow-graph edges and verify:
- Every `navigate()` target exists as a screen
- Every screen that modifies store state has a return path that re-reads it
- Hooks that call store write methods have the store's state in their dependency arrays

### Step 6: Rate Findings

For each issue found:

```
## Finding: [Short description]
**Severity:** Critical | Major | Minor
**Flow:** [Which user flow is affected]
**Root cause:** [What's broken — UI, store, hook, navigation?]
**Before screenshot:** [flow sequence image showing the bug]
**Expected behavior:** [What the user should see]
**Affected files:**
- `src/screens/...` — [what needs to change]
- `src/hooks/...` — [what needs to change]
**Suggested fix:** [Concrete code change description]
```

### Step 7: Create Epic with Stories

If findings exist, create a GitHub epic:

1. **Epic title:** "UX Flow Audit: [date] — [N] issues found"
2. **Each story** should:
   - Reference the specific finding with before screenshot
   - Describe the expected UI behavior in detail
   - List the exact files to modify
   - Include acceptance criteria that can be verified with a Playwright test
   - Use skill `/plan-feature` for implementation
3. **Story ordering:** Critical severity first, then by flow (fix related issues together)

When Stitch MCP is available, generate a mockup for each story showing the fixed UI state. Include the Stitch screen URL in the story body.

Without Stitch, describe the expected UI in enough detail that an agent can implement it:
- What text should the button show?
- What list items should appear?
- What state indicators (badges, counts, colors) should change?

### Step 8: Verify Fixes (Post-Implementation)

After stories are implemented, re-run the flow sequences to verify:
```bash
E2E_PROJECT=screenshot-capture npx playwright test captureFlowSequences --project=screenshot-capture --workers=1
```

Compare new screenshots against the original findings.

## Running This Skill

- **Full audit**: `/flow-audit` — checks all critical flows
- **Specific flow**: `/flow-audit companion` — checks only the companion flow
- **CI integration**: Called by `ux-audit.yml` workflow on a daily cron
- **After implementing fixes**: Re-run to verify state transitions are correct

## Integration with Pipeline

The `ux-audit.yml` workflow runs this skill daily at midnight:
1. Captures fresh screenshots + flow sequences
2. Updates flow graph
3. Runs Claude with this skill's prompt
4. Creates epic + stories if issues found
5. Pipeline picks up stories and implements fixes overnight
