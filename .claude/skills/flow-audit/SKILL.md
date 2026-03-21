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
2. **Missing feedback** — action completes but user sees no confirmation
3. **Broken round-trips** — navigate away, perform action, return — original screen doesn't show the change
4. **Inconsistent state across screens** — profile shows 2 family members but trip form shows 1 traveler
5. **Dead-end flows** — user completes an action but has no clear next step

## Steps

### Step 1: Capture Flow Sequences

```bash
E2E_PROJECT=screenshot-capture npx playwright test captureFlowSequences --project=screenshot-capture --workers=1
```

### Step 2: Update Flow Graph

```bash
npx tsx e2e/scripts/generate-flow-graph.ts
```

### Step 3: Analyze State Transitions

For each flow sequence:
1. **Read the flow screenshots** from `e2e/screenshots/flows/`
2. **Read the screen source code** — what state is displayed and where it comes from
3. **Read the hook/store code** — trace the data path from action to UI update
4. **Check for state disconnects** — does the store get updated? Does the screen re-read it?

#### Critical Flows

| Flow | Action | Expected State Change |
|------|--------|----------------------|
| Add companion | Scan + confirm | Companion appears in list, button text changes |
| Create trip | Fill + save | Trip card appears in list |
| Fill leg form | Enter fields + save | Form status changes, progress updates |
| Edit profile | Change field + save | Updated value on profile screen |
| Delete family member | Remove + confirm | Member removed, count updates |

### Step 4: Cross-Screen Consistency

Verify the same data appears consistently across all screens that display it.

### Step 5: Rate Findings

For each issue:
- **Severity:** Critical / Major / Minor
- **Root cause:** Which file/function is broken
- **Affected files:** With specific guidance

### Step 6: Create Epic with Stories

Stories **must** have these labels: `story`, `pending`, `epic:ux-audit`

### Step 7: Stitch Mockups (Optional)

When Stitch is enabled (`use_stitch: true` in workflow):
1. Create or reuse a Stitch project called "Borderly UX Audit"
2. For each story, generate a mockup of the **fixed** UI state
3. Include the Stitch screenshot URL in the story under `## Mockup`

Stitch tools: `mcp__stitch__create_project`, `mcp__stitch__generate_screen_from_text`

## CI Integration

The `ux-audit.yml` workflow runs this skill daily at midnight PST:
1. Captures fresh screenshots + flow sequences
2. Updates flow graph
3. Runs Claude with this skill
4. Creates epic + stories if issues found
5. Triggers the first story for the pipeline to implement
