# Policy: Accessibility

## Scope
src/components/, src/screens/

## Rules
- REQUIRE: every interactive element has `accessible={true}` + `accessibilityRole`
- REQUIRE: `accessibilityLabel` describes intent ("Submit declaration form" not "Blue button")
- REQUIRE: errors announced via `accessibilityLiveRegion="polite"`
- REQUIRE: decorative elements hidden: `accessibilityElementsHidden={true}`
- REQUIRE: disabled/loading/selected state via `accessibilityState`
- REQUIRE: minimum 44x44pt touch targets
- DENY: interactive elements without `accessibilityRole`

## Component Prop Requirements
| Component type | Required props |
|---|---|
| Button/Pressable | `accessibilityRole="button"` + `accessibilityLabel` |
| TextInput | `accessibilityLabel` or associated label |
| Switch/Toggle | `accessibilityRole="switch"` + `accessibilityState` |
| Link | `accessibilityRole="link"` + `accessibilityLabel` |
| Image (informative) | `accessibilityLabel` with description |
| Image (decorative) | `accessibilityElementsHidden={true}` |

## Exceptions
- Decorative icons next to labeled text — hide with `accessibilityElementsHidden`

## Anti-patterns
- `<TouchableOpacity onPress={...}>` without accessibilityRole
- `accessibilityLabel="button"` — describes appearance, not intent
- Touch target smaller than 44x44pt

## Enforcement
- `__tests__/structure/accessibility-props.test.ts` — a11y props on UI components

## References
- Related: policies/ui/styling.md (touch targets)

## Derives From
- `principles/accessibility-is-non-negotiable.md`
- `facts/cognitive.md#f:cog:44pt-minimum-touch-target`
- `facts/customer.md#f:cust:travelers-fill-forms-at-borders`
