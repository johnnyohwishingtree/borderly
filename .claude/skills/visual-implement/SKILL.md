---
name: visual-implement
description: Implement UI/UX fixes from a visual audit report, then re-capture screenshots to verify
---

# Visual Implement — Apply UI/UX Fixes

Takes findings from a `/visual-audit` report and implements the fixes in code. After applying changes, re-captures screenshots to verify the improvements.

## Prerequisites

- A completed `/visual-audit` report (either from the current session or a previous one)
- Screenshots in `e2e/screenshots/` (from `/capture-screens`)

## Steps

### Step 1: Review Audit Findings

1. If the user provides a specific audit report, use it directly.
2. If no report is provided, ask the user which screens to fix or run `/visual-audit` first.
3. Prioritize by severity: Critical > Major > Minor.

### Step 2: Read Before Screenshots

Before making changes, read the current screenshots from `e2e/screenshots/` for the screens being modified. This establishes the "before" state.

### Step 3: Implement Fixes

For each finding, apply the fix in the source code:

**Styling Rules:**
- Use NativeWind `className` props (not inline styles)
- Use existing components from `src/components/ui/` when available
- Use Lucide icons via `lucide-react-native` (not vector-icons)
- Follow existing Tailwind class patterns in the codebase
- Use Tailwind spacing scale (p-2 = 8px, p-4 = 16px, etc). Never arbitrary values.

**Screen files are in:** `src/screens/<domain>/<ScreenName>.tsx`

**Component files are in:** `src/components/<domain>/` or `src/components/ui/`

**Process for each fix:**
1. Read the screen source file
2. Identify the exact code to modify
3. Apply the NativeWind class changes
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
E2E_PROJECT=screenshot-capture npx playwright test captureScreenshots --project=screenshot-capture --workers=1
```

### Step 6: Before/After Comparison

1. Read the new screenshots from `e2e/screenshots/`
2. Compare with the "before" screenshots from Step 2
3. Present a summary to the user:
   - What changed on each screen
   - Which audit findings were addressed
   - Any remaining issues that need design decisions

### Step 7: Update Manifest

The screenshot capture test automatically updates `e2e/screenshots/manifest.json`. Verify the manifest reflects the current state.

## What NOT to Do

- **Don't change functionality** — only visual/UX fixes
- **Don't add new dependencies** without checking `src/components/ui/` first
- **Don't refactor unrelated code** — stay focused on the audit findings
- **Don't skip the re-capture step** — the before/after comparison is the proof

## Example Workflow

```
User: /visual-audit
→ Report: "Settings screen has inconsistent spacing, Profile has low-contrast text"

User: /visual-implement
→ Reads before screenshots
→ Fixes SettingsScreen.tsx spacing (p-2 → p-4, mb-2 → mb-4)
→ Fixes ProfileScreen.tsx text contrast (text-gray-400 → text-gray-600)
→ Runs typecheck + tests
→ Re-captures screenshots
→ Shows before/after comparison
```

## Running This Skill

1. **After a visual audit**: `/visual-implement` — applies all findings from the audit
2. **Specific screens**: `/visual-implement` then say "fix the Settings screen spacing"
3. **With a report**: Paste audit findings, then `/visual-implement`
