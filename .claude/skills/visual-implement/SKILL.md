---
name: visual-implement
description: Implement UI/UX fixes from a visual audit report, then re-capture screenshots to verify
---

# Visual Implement — Apply UI/UX Fixes

Takes findings from a `/visual-audit` report and implements the fixes in code. After applying changes, re-captures screenshots to verify the improvements.

## Prerequisites

- A completed `/visual-audit` report (either from the current session or a previous one)
- Screenshots in colocated `__screenshots__/` folders (component screenshots are captured automatically in CI; screen screenshots may need a manual `/capture-screens` run)

## Steps

### Step 1: Review Audit Findings

1. If the user provides a specific audit report, use it directly.
2. If no report is provided, ask the user which screens to fix or run `/visual-audit` first.
3. Prioritize by severity: Critical > Major > Minor.
4. **Classify each finding** as either a **bug** (broken behavior, missing content, data errors) or a **styling fix** (spacing, colors, alignment). This determines the fix workflow.

### Step 2: Read Before Screenshots

Before making changes, read the current screenshots from `src/screens/<domain>/<ScreenName>/__screenshots__/` for the screens being modified. Read the per-screen `manifest.json` in each `__screenshots__/` folder for variant descriptions. This establishes the "before" state.

### Step 3: Implement Fixes

#### Bug Fixes (TDD Required)

Findings that involve broken behavior — screens not rendering, incorrect data displayed, loading states that never resolve, missing UI elements that should exist — are **bugs**, not styling issues. Follow the project's TDD bug-fix workflow (`.claude/rules/bug-fix-workflow.md`):

1. **Read the relevant source code** to understand the root cause
2. **Write a failing test** that reproduces the exact bug (must fail before the fix)
3. **Fix the code** so the test passes
4. **Run the test suite** to verify no regressions

| Bug location | Test tool | Test file |
|-------------|-----------|-----------|
| App code (`src/`) | Jest | `__tests__/<matching-path>.test.ts` |
| E2E rendering issues | Playwright | `e2e/tests/<relevant>.spec.ts` |
| Components (`src/components/`) | Jest + RNTL | `__tests__/components/<matching-path>.test.tsx` |

#### Styling Fixes (No Test Required)

Pure visual changes — spacing, colors, alignment, font sizes, Tailwind class adjustments — do not need new tests. Apply directly.

**Styling Rules:**
- Use NativeWind `className` props (not inline styles)
- Use existing components from `src/components/ui/` when available
- Use Lucide icons via `lucide-react-native` (not vector-icons)
- Follow existing Tailwind class patterns in the codebase
- Use Tailwind spacing scale (p-2 = 8px, p-4 = 16px, etc). Never arbitrary values.

**Screen files are in:** `src/screens/<domain>/<ScreenName>/<ScreenName>.tsx`

**Component files are in:** `src/components/<domain>/` or `src/components/ui/`

**Process for each fix:**
1. Read the screen source file
2. Identify the exact code to modify
3. Apply the fix (with TDD for bugs, directly for styling)
4. Run `pnpm typecheck` after each file to catch errors immediately

### Step 4: Verify

Run all checks:
```bash
pnpm typecheck    # Must pass
pnpm test         # Must pass
pnpm lint         # No new errors
```

### Step 5: Re-Capture Screenshots

After all fixes are applied and checks pass, re-capture screenshots:

```bash
# Screen screenshots (serial)
E2E_PROJECT=screenshot-capture npx playwright test captureScreenshots --project=screenshot-capture --workers=1

# Component screenshots (parallel) — only if components were modified
E2E_PROJECT=screenshot-capture npx playwright test captureComponents --project=screenshot-capture
```

### Step 6: Before/After Comparison

1. Read the new screenshots from `src/screens/<domain>/<ScreenName>/__screenshots__/`
2. Compare with the "before" screenshots from Step 2
3. Present a summary to the user:
   - What changed on each screen
   - Which audit findings were addressed
   - Any remaining issues that need design decisions

### Step 7: Verify Manifests

The screenshot capture test automatically writes per-screen `manifest.json` files in each `__screenshots__/` folder. Verify they reflect the current state.

## What NOT to Do

- **Don't skip tests for bugs** — if a screen doesn't render, data is wrong, or behavior is broken, write a test first
- **Don't add new dependencies** without checking `src/components/ui/` first
- **Don't refactor unrelated code** — stay focused on the audit findings
- **Don't skip the re-capture step** — the before/after comparison is the proof

## Example Workflow

```
User: /visual-audit
→ Report: "Settings screen shows Loading forever (bug), Profile has low-contrast text (styling)"

User: /visual-implement
→ Reads before screenshots
→ BUG: SettingsScreen loading — writes failing test, finds async init never resolves in web, fixes it, test passes
→ STYLING: ProfileScreen text contrast — changes text-gray-400 → text-gray-600
→ Runs typecheck + tests (including new test)
→ Re-captures screenshots
→ Shows before/after comparison
```

## Running This Skill

1. **After a visual audit**: `/visual-implement` — applies all findings from the audit
2. **Specific screens**: `/visual-implement` then say "fix the Settings screen spacing"
3. **With a report**: Paste audit findings, then `/visual-implement`
