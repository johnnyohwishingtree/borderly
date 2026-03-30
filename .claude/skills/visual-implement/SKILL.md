---
name: visual-implement
description: Implement UI/UX fixes from a visual audit, re-capture screenshots to verify
---

# /visual-implement — Apply Visual Fixes

Implements UI/UX fixes from `/visual-audit` findings. For bugs, writes a spec test first. For styling, applies directly. Re-captures screenshots to verify.

## Prerequisites

- A completed `/visual-audit` report (current session or provided by user)
- Screenshots in `__screenshots__/` folders

## Step 1: Review findings

Prioritize by severity: Critical > Major > Minor.

Classify each finding:
- **Bug** (broken behavior, missing content, data errors) → needs spec test first
- **Styling** (spacing, colors, alignment) → apply directly, no test

## Step 2: Bugs → write spec tests

For each bug finding, write a `*.spec.test.ts` with `test.skip`:

```typescript
// __tests__/screens/<domain>/<Screen>.spec.test.ts
/**
 * Spec: <what should be true about the screen>
 * Found by: visual-audit
 */
test.skip('<specific assertion>', () => { ... });
```

Then resolve it: unskip, implement the fix, graduate the test.

Follow `the bug-fix rules: write failing test first, verify it fails without the fix, then fix`.

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

## Step 5: Re-capture screenshots

```bash
E2E_PROJECT=screenshot-capture npx playwright test captureScreenshots --project=screenshot-capture --workers=1
```

Read new screenshots and compare with before state. Present summary of what changed.

## Guardrails

- Bugs get spec tests first — don't skip
- Styling fixes don't need tests
- Don't refactor unrelated code — stay focused on audit findings
- Don't skip the re-capture step
