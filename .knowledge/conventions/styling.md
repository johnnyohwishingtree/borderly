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
