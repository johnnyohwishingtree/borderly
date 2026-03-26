# Policy: Styling

## Scope
src/components/, src/screens/

## Rules
- REQUIRE: NativeWind `className` for all styling
- REQUIRE: Tailwind spacing scale (p-2, p-4) — no arbitrary values (p-[13px])
- REQUIRE: Tailwind color tokens — no inline hex colors
- REQUIRE: minimum 44x44pt touch targets
- REQUIRE: 16px vertical spacing between form fields
- DENY: `style={{}}` for static values expressible in Tailwind
- ALLOW: `style={{}}` for animated values, computed dimensions, dynamic transforms
- ALLOW: `style={{}}` for SVG-like rendering (CountryFlag)
- ALLOW: `style={{}}` for platform-specific layout NativeWind can't express
- DENY: mixing StyleSheet with NativeWind in same component
- DENY: fixed widths (`w-[320px]`) — use responsive classes
- DENY: pure black/gray text on colored backgrounds — tint grays
- DENY: card-on-card nesting — use spacing/dividers

## Exceptions
- Lucide icon `color` prop accepts inline hex — component library requirement
- `CountryFlag.tsx` — pixel-precise SVG flag rendering requires inline styles

## Anti-patterns
- `style={{ marginTop: 16 }}` when `className="mt-4"` works
- `#3B82F6` inline when `text-blue-500` exists
- `w-[320px]` fixed width instead of `w-full max-w-sm`
- Mixing `StyleSheet.create()` and `className` in the same file

## Enforcement
- `__tests__/structure/no-space-x.test.ts` — banned space-x pattern
- `__tests__/structure/smart-component-usage.test.ts` — smart component enforcement

## References
- Related: policies/ui/typography.md
- Related: policies/ui/motion.md
