# Tailwind Spacing: Use gap-* Instead of space-x-*

**NEVER** use `space-x-*` classes on flex containers. **ALWAYS** use `gap-*` instead.

## Why

`space-x-*` applies left/right margins to child elements. When combined with `flex-wrap`, wrapped items get an unwanted margin on their leading edge, causing visual misalignment. Worse, without `flex-wrap`, buttons and content spill past the viewport edge on narrow screens (375px iPhone SE).

`gap-*` uses the CSS `gap` property which works correctly in both wrapped and non-wrapped flex layouts. It only adds space *between* items, never on the outside.

## Pattern

```tsx
// BAD — will overflow on narrow screens or break with flex-wrap
<View className="flex-row space-x-3">

// GOOD — works with all viewport widths and with flex-wrap
<View className="flex-row gap-3">

// BEST — for button rows that may not fit on narrow screens
<View className="flex-row flex-wrap gap-3">
```

## When to add flex-wrap

Add `flex-wrap` when a `flex-row` container holds **buttons or elements with intrinsic widths** (not `flex-1` children). These can overflow on narrow viewports.

Do NOT add `flex-wrap` to side-by-side form fields using `flex-1` — those shrink proportionally and won't overflow.

## Enforcement

- **Structural test**: `__tests__/structure/no-space-x.test.ts` fails CI if any `space-x-*` class is found in `src/`
- **E2E test**: `e2e/tests/overflow-detection.spec.ts` renders screens at 375px width and fails if horizontal scroll appears
