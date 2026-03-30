---
name: visual-implement
description: Implement UI/UX fixes from a ux-audit, re-capture screenshots to verify
---

# /visual-implement — Apply UX Fixes

Implements UI/UX fixes from `/ux-audit` findings. For bugs, writes a spec test first. For styling, applies directly. Re-runs E2E to update screenshots.

## Prerequisites

- A completed `/ux-audit` report (current session or provided by user)
- Simulator booted with latest app build (for screenshot refresh)

## Step 1: Review findings

Read the ux-audit findings. Prioritize by severity: Critical > Major > Minor.

Classify each finding:
- **Bug** (broken behavior, missing content, data errors, wrong auto-fill) → needs spec test first
- **Styling** (spacing, colors, alignment, font sizes, touch target size) → apply directly, no test

## Step 2: Bugs → write spec tests

For each bug finding, write a `*.spec.test.ts` with `test.skip`:

```typescript
// __tests__/screens/<domain>/<Screen>.spec.test.ts
/**
 * Spec: <what should be true about the screen>
 * Context: .context/external/cognitive/<relevant-file>.md
 * Found by: ux-audit
 */
test.skip('<specific assertion>', () => { ... });
```

Then resolve it: unskip, implement the fix, graduate the test.

## Step 3: Styling → apply directly

Pure visual changes don't need tests:
- Use NativeWind `className` (not inline styles)
- Use existing `src/components/ui/` components
- Use Tailwind spacing scale (p-2 = 8px, p-4 = 16px)
- Use Lucide icons via `lucide-react-native`

One file at a time. Run `pnpm typecheck` after each.

## Step 4: Verify

```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Step 5: Refresh E2E screenshots

If a simulator is booted:
```bash
xcrun simctl list devices booted 2>/dev/null | grep -q Booted && pnpm e2e:mobile
```

Screenshots in `e2e/screenshots/` auto-update on pass. Read the updated screenshots to verify fixes visually.

If no simulator available, skip — `/context-audit` will flag stale screenshots.

## Guardrails

- Bugs get spec tests first — don't skip
- Styling fixes don't need tests
- Don't refactor unrelated code — stay focused on audit findings
- Every fix should trace to a ux-audit finding + cognitive/customer context
