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
- `.knowledge/models/user-journeys.md` — expected user journeys with verification criteria

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

4. **`.knowledge/models/user-journeys.md`** — expected journeys with verification criteria.

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
- Compare against `.knowledge/models/user-journeys.md` — are actual journeys longer than expected?

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
- Read `.knowledge/models/form-engine.md` for smart component mappings

### Step 3: Journey-level analysis

For each journey in `.knowledge/models/user-journeys.md`:

1. Check if the journey is covered in `e2e/mobile/full-e2e.test.ts`
2. Count the actual steps vs expected steps
3. Check if all **Verify** criteria from the model can be validated by the E2E test
4. Flag journeys in the model that have no E2E test coverage

### Step 4: Rate findings

- **Critical**: Dead end, unreachable core feature, missing error handling on destructive action, 15+ steps to reach core value
- **Major**: 10+ taps for common task, missing empty state, orphaned screen, screen with 6+ fields requiring scroll, onboarding screen that could be deferred
- **Minor**: Duplicate entry points, suboptimal component type, E2E test uses coordinate taps for app-owned UI

### Step 5: Write findings to gaps.md

Add to `.knowledge/gaps.md`. Each entry includes severity and what to change.

### Step 6: Create stories

Group findings by theme. For each group with 2+ items, create a story:

```bash
REPO="johnnyohwishingtree/borderly"
DATE=$(date +%Y-%m-%d)

gh issue create --repo $REPO \
  --title "Story: Fix <theme> UX issues from $DATE ux-review" \
  --label "story,pending" \
  --body "<follow .knowledge/templates/story.md>

After completing fixes, remove resolved entries from .knowledge/gaps.md."
```

Prioritize:
1. **Critical fixes** — dead ends, missing error handling
2. **Flow improvements** — reduce tap counts, add missing states
3. **Composition cleanup** — deduplicate journey steps

### Step 7: Classify findings and update knowledge

Follow `.knowledge/policies/workflow/learning.md`.

For each finding, classify it:
- **UX bug to fix** → already handled in Steps 5-6 (gaps.md + stories)
- **New customer truth discovered** (e.g., "users abandon the form at the accommodation step") → create or update a fact in `.knowledge/facts/customer/`
- **UX belief invalidated** (e.g., "smart delta confused users — they wanted to see all fields") → update the relevant belief in `.knowledge/beliefs/`

If new UX patterns were discovered, update `models/user-journeys.md`.

### Step 8: Verify and commit

Follow `.knowledge/policies/workflow/verification.md` if any files were changed.

```bash
git add .knowledge/gaps.md
git diff --cached --quiet || git commit -m "chore: ux-review findings ($DATE)" && git push origin master
```

## Guardrails
- Don't implement fixes — only identify and create stories
- Don't evaluate visual design (spacing, colors) — that's `/visual-audit`
- Don't evaluate code quality — that's `/code-audit`
- Don't flag issues already in `gaps.md`
