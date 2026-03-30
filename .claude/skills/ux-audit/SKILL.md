---
name: ux-audit
description: Evaluate UX by reading screenshots, code structure, and human behavior context — finds flow friction, visual issues, and cognitive overload
argument-hint: "[flow or area to review, e.g. 'onboarding', 'trip creation', 'family management']"
---

# /ux-audit — UX Analysis (Structural + Visual)

Evaluates user experience by reading committed screenshots, screen code, journey definitions, and human behavior context. Finds structural issues (dead ends, excessive steps) AND visual issues (spacing, hierarchy, touch targets, cognitive overload). Writes spec tests for everything that needs fixing.

**No simulator required** — works entirely from code and committed screenshots.

**Data sources:**
- `e2e/screenshots/` — committed screenshots from the latest E2E run
- `src/screens/*/testIDs.ts` — per-screen element declarations
- `e2e/mobile/full-e2e.test.ts` — deterministic E2E test covering core journeys
- `.context/external/cognitive/` — human behavior research (touch targets, reading, field counts)
- `.context/external/customer/` — user behavior (borders, families, jargon, verification)

## Prerequisites

- `e2e/screenshots/` has recent screenshots (check git log for last update)
- testIDs.ts files exist for screens being audited

## Step 1: Load context

Read the human behavior context that drives evaluation criteria:

1. **Cognitive context** (`.context/external/cognitive/`):
   - `44pt-minimum-touch-target.md` — minimum touch target size
   - `fewer-fields-higher-completion.md` — field count vs completion rate
   - `centered-text-slows-reading.md` — left-align body text
   - `three-font-sizes-max.md` — max 3-4 distinct sizes per screen
   - `users-skip-error-messages.md` — inline, concise, actionable errors
   - `reduced-motion-is-accessibility.md` — respect prefers-reduced-motion

2. **Customer context** (`.context/external/customer/`):
   - `travelers-fill-forms-at-borders.md` — distracted, time-pressured, offline
   - `family-travelers-share-devices.md` — isolated data per family member
   - `users-wont-verify-auto-filled-values-carefully.md` — auto-fill must be accurate
   - `multi-leg-trips-are-common.md` — 3+ countries per trip
   - `users-dont-understand-portal-jargon.md` — translate bureaucratic language

These aren't guidelines — they're research-backed facts about how humans use mobile apps at borders. Every finding should trace back to one of these.

## Step 2: Load screen data

1. **Read committed screenshots** — `e2e/screenshots/*.jpg`. Use vision to see the actual UI.
2. **Read testIDs.ts** for each screen — extract interactive elements, types, zones.
3. **Read E2E test** — `e2e/mobile/full-e2e.test.ts` for journey flow, step counts, assertions.

If `--scope` provided, focus on that area only.

## Step 3: Visual analysis (per screenshot)

For each screenshot in `e2e/screenshots/`, evaluate against the cognitive context:

**Layout & Spacing**
- 4px/8px spacing grid consistent?
- Minimum 16px padding from edges?
- Left-aligned body text? (centered-text-slows-reading)
- Clear visual grouping of related elements?

**Visual Hierarchy**
- Clear primary action (one prominent CTA per screen)?
- Max 3-4 distinct font sizes? (three-font-sizes-max)
- Heading progression (large → medium → body)?
- Important info visible without scrolling?

**Touch & Interaction**
- All interactive elements 44x44pt minimum? (44pt-minimum-touch-target)
- Adequate spacing between tap targets (no accidental taps)?
- Visual affordance on buttons (looks tappable)?
- Primary action reachable by thumb (bottom half of screen)?

**Color & Contrast**
- WCAG AA contrast ratios?
- Status colors paired with icons/text (not color-only)?
- Consistent color palette across screens?

**Field Count & Cognitive Load**
- 6+ fields visible at once? Flag for splitting. (fewer-fields-higher-completion)
- Are fields that could be auto-filled still showing as manual input?
- Smart component usage — Input where SearchableSelect/DatePicker should be?
- Jargon in field labels? (users-dont-understand-portal-jargon)

**Error & Empty States**
- Error messages inline, concise, actionable? (users-skip-error-messages)
- Empty states have guidance (not just blank)?
- Loading states present where data fetches happen?

**Mobile Patterns**
- Primary CTA in thumb zone (bottom third)?
- No horizontal scrolling on any screen?
- Safe area insets respected?
- Works conceptually for distracted, offline use? (travelers-fill-forms-at-borders)

## Step 4: Structural analysis (from code)

**Dead ends**
- Screens with no navigation out and no action buttons — user is stuck
- Screens not reachable from any E2E journey — orphaned

**Steps-to-value**
- Count screens from app launch to first moment of user value (first auto-filled form)
- Flag onboarding with 5+ screens before main app
- Question each onboarding screen: essential NOW, or deferrable?

**Excessive tap counts**
- Count steps in E2E test for each core task. Flag 10+ steps.
- Is there a shorter path that could exist?

**Feature bloat**
- Features visible in UI that add cognitive load but aren't core journey
- Duplicate entry points (two buttons doing the same thing)
- Would removing this feature simplify the core flow?

**Screen complexity signals from E2E**
- `device.tap(x, y)` coordinate taps → element isn't accessible
- Excessive `device.sleep()` → unpredictable load times
- `try/catch` blocks → conditional/flaky UI flow

## Step 5: Rate findings

Every finding must reference:
- The specific screenshot or screen file
- The cognitive/customer context fact it violates
- Severity level

| Severity | Criteria |
|----------|----------|
| **Critical** | Dead end, unreachable core feature, 15+ steps to value, missing error handling on destructive action, auto-fill showing wrong data |
| **Major** | 10+ taps for common task, 6+ fields visible, CTA below fold, missing empty state, jargon in labels, touch targets under 44pt |
| **Minor** | Inconsistent spacing, suboptimal component type, duplicate entry point, centered body text |

## Step 6: Write spec tests for findings

**First, check for pending conflicts:**
```bash
ls __tests__/conflicts/*.spec.test.ts 2>/dev/null
```

Each finding becomes a `*.spec.test.ts` with `test.skip`:

```typescript
// __tests__/screens/<area>/<descriptive-name>.spec.test.ts
/**
 * Spec: <what should be true about the UI>
 * Context: .context/external/cognitive/<relevant-file>.md
 * Found by ux-audit: <screenshot name> shows <problem>
 *
 * Current state: <what the screen actually does>
 * Gap: <the difference>
 */
test.skip('<specific assertion>', () => {
  const content = readFileSync(resolve(ROOT, 'src/screens/...'), 'utf-8');
  // Assert the expected state
});
```

Prioritize: Critical > Major > Minor.

## Step 7: Discover UX constraints

If the same pattern appears across 3+ screens, it's a candidate for a permanent UX constraint in `__tests__/constraints/`:

Examples:
- "No screen has more than 6 visible fields" — enforced by counting testIDs with type 'field'
- "Every screen's primary CTA is in the footer zone" — enforced by checking testIDs zone
- "No centered body text in screens" — enforced by grepping for `text-center` on non-heading elements

Write new constraints with `Constraint:` JSDoc referencing the cognitive context file that justifies them.

## Step 8: Verify and commit

```bash
pnpm lint && pnpm typecheck && pnpm test
```

```bash
git add <changed files>
git diff --cached --quiet || git commit -m "chore: ux-audit findings ($DATE)" && git push origin master
```

## Guardrails
- Don't implement fixes — only identify and write spec tests
- Don't evaluate code quality — that's `/code-audit`
- Don't flag issues that already have an open spec test or GitHub issue
- Every finding must trace to a `.context/external/` fact — no subjective opinions
- Process one domain/area at a time to stay within context limits
