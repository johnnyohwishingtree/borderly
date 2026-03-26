---
name: ux-review
description: Evaluate user journeys, information architecture, and flow efficiency across the app
argument-hint: "[flow or area to review, e.g. 'onboarding', 'trip creation', 'family management']"
---

# UX Review — User Flow & Journey Analysis

Analyze the app's user experience at the **flow level** — navigation paths, tap counts, feature discoverability, information architecture, and onboarding completeness. This skill is read-only — it identifies problems but does NOT implement fixes. Use `/ux-implement` to apply fixes.

**How this differs from `/visual-audit`:**
- `/visual-audit` evaluates individual screens (spacing, contrast, touch targets)
- `/ux-review` evaluates how screens connect — the journeys users take to accomplish goals

## Prerequisites

- Familiarity with the app's navigation structure (read `CLAUDE.md` and `src/app/navigation/`)
- Screen screenshots at `src/screens/**/__screenshots__/` and component screenshots at `src/components/**/__screenshots__/` help but are optional — this skill primarily reads code.

## Steps

### Step 1: Identify Flows to Review

If the user specifies a flow (e.g., "review onboarding"), focus on that. Otherwise, review all core user journeys:

1. **First-time setup** — Welcome through to first trip creation
2. **Trip creation** — Creating a trip, adding destinations, filling forms
3. **Form completion** — Auto-fill experience, smart delta, submission guide
4. **Portal submission** — Guide walkthrough, copy/paste, QR capture
5. **Family management** — Adding/managing travel companions
6. **Profile management** — Editing profile, updating passport data
7. **Settings & help** — Finding help, reporting bugs, managing preferences

### Step 2: Load Screen Registry, Flow Graph & Manifests

1. **Read `maestro/generator/screenRegistry.ts`** — the primary screen metadata source. It contains per-screen:
   - `waitFor` — text that identifies this screen
   - `fields` — ordered list of interactive fields with testIDs, component types, required/optional status
   - `alerts` — every Alert.alert() with titles, buttons, triggers, and outcomes
   - `actionButtons` — buttons with testIDs and descriptions
   - `navigatesTo` — navigation targets
   - `notes` — important context for test authors

2. **Read `maestro/generator/componentCatalog.ts`** — interaction patterns for each UI component type:
   - `subTestIDs` — derived testIDs (e.g., SearchableSelect generates `-trigger`, `-search`, `-option-{CODE}`)
   - `interactionSequence` — step-by-step interaction for Maestro
   - `dslHelper` — recommended DSL function
   - `maestroNotes` — gotchas and platform-specific issues

3. **Read `e2e/screenshots/flow-graph.json`** — navigation graph:
   - `stacks` — which screens belong to which navigation stacks
   - `tabs` — bottom tab structure
   - `edges` — every `navigate()`, `goBack()`, and tab switch with source file + line

   If the flow graph doesn't exist, generate it: `npx tsx e2e/scripts/generate-flow-graph.ts`

4. **Read per-screen manifests** at `src/screens/<domain>/<ScreenName>/__screenshots__/manifest.json` for screenshot metadata.

5. **Read screen source files** only when you need deeper context beyond what the registry provides.

### Step 3: Analyze User Journeys

For each flow, evaluate against these criteria:

**Task Efficiency**
- How many taps/screens to complete the core task?
- Are there unnecessary intermediate screens?
- Can common actions be reached in 1-2 taps from the main screen?
- Are there dead ends that force users to backtrack?

**Feature Discoverability**
- Can a new user find all key features without a tutorial?
- Are important features buried behind multiple navigation layers?
- Do CTAs clearly communicate what they do?
- Is the information hierarchy correct — primary actions most visible?

**Onboarding Completeness**
- Does onboarding collect all data needed for the core use case?
- Are there "setup cliffs" — features that require additional setup the user wasn't prompted for?
- Does the app explain its value proposition before asking for data?
- Is the time-to-first-value minimized?

**Information Architecture**
- Are related features grouped logically?
- Does the tab/navigation structure match user mental models?
- Are screen titles and labels clear and consistent?
- Is there content or functionality in unexpected places?

**Error Prevention & Recovery**
- Can users easily undo or go back from any screen?
- Are destructive actions (delete trip, remove family member) confirmed?
- Do error states provide clear recovery paths?
- Is data preserved when navigating away and back?

**Multi-User / Family Flows**
- How easy is it to switch between profiles?
- Can family members be added during natural workflow moments?
- Is it clear whose data is being viewed/edited?
- Are group actions (submit forms for whole family) supported?

**Progressive Disclosure**
- Does the app show the right amount of information at each step?
- Are advanced features hidden until needed?
- Is the learning curve appropriate for the target user?

**Smart Component Usage**
- Are all hotel/accommodation name fields using `AccommodationAutocomplete` (not plain `Input`)? This provides Google Places lodging suggestions.
- Are all address fields using `AddressAutocomplete` (not individual `Input` fields for line1/city/postal)? This provides Google Places address suggestions with structured parsing.
- See `.knowledge/models/form-engine.md` (## Smart components) for the full list of required smart component mappings.
- If a plain `Input` is used where a smart component exists, flag it as a **Major** finding.

**Scalability of UI Patterns**
- Do selection controls (country pickers, category lists) scale as the data set grows? Pill button grids break past 6-8 items — prefer searchable dropdowns.
- Do list screens handle 0, 1, 10, and 50+ items without layout degradation?
- Are form fields responsive — do they still look correct on narrow and wide viewports?

### Step 4: Map Tap Counts

For key tasks, document the exact navigation path and tap count:

```
Task: Add a family member
Path: Main App → Profile Tab (1) → Family Management (2) → Add Member (3) → Fill Form (4+)
Taps: 4+ from main screen
Optimal: Should be accessible during onboarding (0 extra taps)
```

### Step 5: Rate & Report

Rate each finding with severity:
- **Critical**: Core task is unreasonably difficult or feature is undiscoverable
- **Major**: Significant friction in a common workflow
- **Minor**: Polish issue, nice improvement

Output a structured report with:
- Flow name
- Issue description
- Current path (with tap count)
- Suggested improvement
- Severity
- Affected screens/files
- Whether this requires new screens, navigation changes, or just reordering

### Step 6: Prioritized Recommendations

Group findings into actionable themes:
1. **Quick wins** — Reordering, renaming, or adding shortcuts (no new screens)
2. **Flow restructuring** — Adding screens to existing flows, changing navigation order
3. **New features** — New screens or navigation paths needed
4. **Architecture changes** — Store/service changes to support better flows

## What NOT to Evaluate

- Individual screen visual polish (that's `/visual-audit`)
- Code quality or architecture (that's `/refactor-design`)
- Test coverage (that's `/test-suite`)
- Performance (separate concern)

## Running This Skill

1. **Full review**: `/ux-review` — reviews all core user journeys
2. **Specific flow**: `/ux-review onboarding` — reviews only the onboarding flow
3. **After visual audit**: Run `/ux-review` to complement per-screen findings with flow-level analysis
4. **Before epic planning**: `/ux-review` → `/epic-planner` to create issues from findings

After the review, use `/ux-implement` to apply the flow changes.
