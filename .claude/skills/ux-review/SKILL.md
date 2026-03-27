---
name: ux-review
description: Evaluate user journeys using screen registry and journey definitions — finds dead ends, missing states, and flow friction
argument-hint: "[flow or area to review, e.g. 'onboarding', 'trip creation', 'family management']"
---

# UX Review — User Flow & Journey Analysis

Analyzes user experience by reading the screen registry and journey definitions. Finds structural UX issues (dead ends, missing error handling, excessive tap counts, unreachable screens) and creates stories for fixes.

**Data sources (all code — no simulator needed):**
- `maestro/generator/screenRegistry.ts` — per-screen metadata (fields, buttons, alerts, navigation)
- `maestro/generator/journeys/*.ts` — actual flow sequences with composable steps
- `.knowledge/models/user-journeys.md` — expected user journeys with verification criteria

## Prerequisites
- Journey definitions up to date (`pnpm maestro:generate` runs cleanly)
- Screen registry matches current source code

## Steps

### Step 1: Load data

Read these three sources:

1. **`maestro/generator/screenRegistry.ts`** — for every screen, extract:
   - `fields` — interactive elements (testID, componentType, required/optional)
   - `actionButtons` — buttons (testID, label, description)
   - `alerts` — Alert.alert() calls (trigger, title, buttons, happyPathButton)
   - `navigatesTo` — where this screen can go next
   - `notes` — context about the screen

2. **`maestro/generator/journeys/*.ts`** — for every journey, extract:
   - Step sequence (which screens in what order)
   - Step count (= approximate tap count)
   - Shared steps (reused across journeys via function composition)

3. **`.knowledge/models/user-journeys.md`** — expected journeys with verification criteria.

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

**Unreachable features**
- Screens in the registry not visited by any journey — the feature exists but no flow tests it
- Action buttons that no journey taps — the button exists but nothing exercises it

**Smart component gaps**
- Fields with componentType `Input` that should be `SearchableSelect`, `DatePickerField`, or `AccommodationAutocomplete` based on their testID/label
- Read `.knowledge/models/form-engine.md` for smart component mappings

**Flow composition quality**
- Journey files that duplicate steps instead of reusing shared functions
- Steps that could be extracted into reusable functions (same screen + actions in 2+ journeys)

### Step 3: Journey-level analysis

For each journey in `.knowledge/models/user-journeys.md`:

1. Find the matching journey definition in `maestro/generator/journeys/*.ts`
2. Count the actual steps vs expected steps
3. Check if all **Verify** criteria from the model can be validated by the journey
4. Flag journeys in the model that have no matching journey definition

### Step 4: Rate findings

- **Critical**: Dead end, unreachable core feature, missing error handling on destructive action
- **Major**: 10+ taps for common task, missing empty state, orphaned screen
- **Minor**: Duplicate journey steps, missing exampleValue, suboptimal component type

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

### Step 7: Update knowledge

Follow `.knowledge/policies/workflow/learning.md`.

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
