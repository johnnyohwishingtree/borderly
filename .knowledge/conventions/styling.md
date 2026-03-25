# Styling Conventions

## Framework
NativeWind (Tailwind for React Native). No inline hex colors.

## Rules
- Use Tailwind tokens for all colors, spacing, sizing
- Consistent 16px vertical spacing between form fields
- Minimum 44x44pt touch targets (use `TouchTargetUtils.getHitSlop()`)
- Prefer NativeWind `className` over inline `style={{}}`

## When inline styles are acceptable
- Animated values (`Animated.View style={{ opacity }}`)
- Computed dimensions (`style={{ width: \`${percent}%\` }}`)
- Dynamic transforms (`style={{ transform: [{ rotate }] }}`)
- SVG-like rendering that requires precise pixel positioning (e.g., `CountryFlag`)
- Platform-specific layout that NativeWind can't express (e.g., `DatePickerField` column picker)

If the value is static and expressible in Tailwind, use `className`. If it's dynamic or computed at runtime, `style={{}}` is fine.

## Anti-patterns
- **Inline hex colors** (`color: '#3B82F6'`) — use Tailwind color tokens (`text-blue-500`)
- **Arbitrary spacing values** (`p-[13px]`) — stick to the Tailwind scale (`p-2`, `p-4`)
- **Pure black/gray text** (`text-black`, `text-gray-500` on colored backgrounds) — tint grays to match the palette
- **Card-on-card nesting** — flattens visual hierarchy; use spacing/dividers instead
- **Fixed widths** (`w-[320px]`) — use responsive classes (`w-full`, `max-w-sm`)
- **Mixing styled-components/StyleSheet with NativeWind** — pick one system per component
