---
name: ux-review
description: Evaluate user journeys using screen registry and journey definitions — finds dead ends, missing states, and flow friction
argument-hint: "[flow or area to review, e.g. 'onboarding', 'trip creation', 'family management']"
---

# UX Review — User Flow & Journey Analysis

Analyzes user experience by reading the screen registry and journey definitions. Finds structural UX issues (dead ends, missing error handling, excessive tap counts, unreachable screens) and creates stories for fixes.

**Data sources (all code — no simulator needed):**
- `src/screens/*/testIDs.ts` — per-screen element declarations (testID, type, zone)
- `e2e/mobile/full-e2e.test.ts` — deterministic E2E test covering core journeys
- `e2e/screenshots/` — auto-captured screenshots from each test run
- `e2e/mobile/full-e2e.test.ts` — deterministic E2E test covering core user journeys

## Prerequisites
- E2E test passes (`pnpm e2e:mobile`)
- testIDs.ts files up to date

## Steps

### Step 1: Load data

Read these sources:

1. **`src/screens/*/testIDs.ts`** — for every screen, extract:
   - Interactive elements (testID, type: button/field/container, zone: header/scroll/footer)

2. **`e2e/mobile/full-e2e.test.ts`** — the deterministic test flow:
   - Step sequence (which screens in what order)
   - Assertions (what's verified at each step)

3. **`e2e/screenshots/`** — visual record of each screen from the latest test run.

4. **`e2e/mobile/full-e2e.test.ts`** — the E2E test defines expected journeys with verification criteria.

### Step 2: Structural analysis

Run these checks against the registry and journey data:

**Dead ends**
- Screens with no `navigatesTo` and no `actionButtons` — user is stuck
- Screens not reachable from any journey definition — orphaned screens

**Missing error handling**
- Screens with destructive actions (delete, remove, clear) but no confirmation `alert`
- Screens with form submission but no error `alert` or error state
- Required fields without `exampleValue` — auto-fill can't help the user

**Missing states**
- Screens that handle lists but have no empty state guidance in `notes`
- Screens with no `waitFor` — loading state may be missing

**Excessive tap counts**
- Count steps in each journey definition. Flag journeys with 10+ steps to complete a core task
- Compare against the E2E test flow — are actual journeys longer than expected?

**Screen complexity (test complexity = user complexity)**

If a screen is hard to E2E test, it's hard for a user to use. Use the E2E test (`e2e/mobile/full-e2e.test.ts`) and screenshots (`e2e/screenshots/`) as signals:

- **Field count**: Flag screens with 6+ interactive fields visible at once. Consider splitting into multi-step wizard or collapsible sections.
- **Scroll requirement**: Flag screens that require scrolling to reach the primary action. The CTA should be visible without scrolling.
- **Coordinate taps in E2E test**: If the test uses raw `device.tap(x, y)` instead of `tapById`, the UI element isn't accessible — it's either buried in a WebView, obscured by overlays, or has poor affordance.
- **Sleep/waits in E2E test**: Excessive `device.sleep()` calls indicate screens with unpredictable load times or animations that block interaction.
- **Try/catch blocks in E2E test**: These indicate screens that may or may not appear — conditional or flaky UI flow.

**Steps-to-value**
- Count screens from app launch to the first moment of user value (e.g., first auto-filled form)
- Flag onboarding flows with 5+ screens before reaching the main app
- Question each onboarding screen: is this essential NOW, or can it be deferred to settings/first use?
  - Tutorials: could the welcome screen convey enough?
  - Companion setup: ask when creating a family trip, not during onboarding
  - Biometric: default to on, let users disable in settings
  - Notification permissions: defer to first relevant moment (e.g., trip deadline approaching)

**Feature bloat**
- Flag features visible in the UI that add cognitive load but aren't part of core journeys
- Look for duplicate entry points (two buttons that do the same thing)
- Question: would removing this feature make the core flow simpler without losing value?

**Unreachable features**
- Screens not visited by any E2E test journey — the feature exists but nothing exercises it
- Action buttons that no journey taps — the button exists but nothing exercises it

**Smart component gaps**
- Fields with componentType `Input` that should be `SearchableSelect`, `DatePickerField`, or `AccommodationAutocomplete` based on their testID/label
- Read `src/types/schema.ts` for smart component type mappings

### Step 3: Journey-level analysis

For each journey defined in `e2e/mobile/full-e2e.test.ts`:

1. Check if the journey is covered in `e2e/mobile/full-e2e.test.ts`
2. Count the actual steps vs expected steps
3. Check if all **Verify** criteria from the model can be validated by the E2E test
4. Flag journeys in the model that have no E2E test coverage

### Step 4: Rate findings

- **Critical**: Dead end, unreachable core feature, missing error handling on destructive action, 15+ steps to reach core value
- **Major**: 10+ taps for common task, missing empty state, orphaned screen, screen with 6+ fields requiring scroll, onboarding screen that could be deferred
- **Minor**: Duplicate entry points, suboptimal component type, E2E test uses coordinate taps for app-owned UI

### Step 5: Capture knowledge

For each finding, ask: "what truth did I discover about the system?"

1. **Validate beliefs** — check `src/config/beliefs.ts` for relevant beliefs
   - If a finding challenges an existing belief, update the belief's certainty or add counter-evidence
   - If a finding confirms a belief, note it

2. **Identify gaps** — where beliefs and current system state diverge
   - A gap IS a story. "We believe X (belief), but the system currently does Y."

### Step 6: Create stories from gaps

Each story should reference the belief and current system state that define the gap.

```bash
REPO="johnnyohwishingtree/borderly"
DATE=$(date +%Y-%m-%d)

gh issue create --repo $REPO \
  --title "Story: <close the gap between belief and current state>" \
  --label "story,pending" \
  --body "$(cat <<'EOF'
## Gap
- **Belief:** <what we think should be true>
- **Current state:** <what the system actually does>

## Acceptance Criteria
- [ ] <specific measurable criteria>

## Files to Modify
- <file paths>
EOF
)"
```

Prioritize:
1. **Critical gaps** — facts that directly block users from reaching value
2. **Major gaps** — facts that significantly degrade the experience
3. **Minor gaps** — polish items, small divergences from beliefs

### Step 7: Update knowledge graph

Follow `.knowledge/policies/workflow/learning.md`.

- Beliefs already validated/updated in Step 5
- Check if findings invalidate or strengthen existing beliefs in `src/config/beliefs.ts`
- If new patterns emerge across multiple findings, consider creating a new policy

### Step 8: Verify and commit

Follow `.knowledge/policies/workflow/verification.md` if any files were changed.

```bash
git add <changed files>
git diff --cached --quiet || git commit -m "chore: ux-review findings ($DATE)" && git push origin master
```

## Guardrails
- Don't implement fixes — only identify and create stories
- Don't evaluate visual design (spacing, colors) — that's `/visual-audit`
- Don't evaluate code quality — that's `/code-audit`
- Don't flag issues that already have an open GitHub issue
