# Accessibility Props by Component Type

| Component type | Required a11y props |
|----------------|---------------------|
| Pressable / TouchableOpacity | `accessible={true}`, `accessibilityRole`, `accessibilityLabel` |
| TextInput | `accessibilityLabel` (includes field name + "required" if required) |
| Toggle / Switch | `accessibilityRole="switch"`, `accessibilityLabel`, `accessibilityState.checked` |
| Error text | `accessibilityLiveRegion="polite"`, `accessibilityRole="text"` |
| Progress bar | `accessibilityRole="progressbar"`, `accessibilityValue` |
| Collapsible section header | `accessibilityRole="button"`, `accessibilityState.expanded` |

## Utility helpers (`src/utils/accessibility.ts`)
- `ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET` — 44×44pt minimum
- `TouchTargetUtils.getHitSlop()` — expand touch area without changing layout
- `AccessibilityStateHelpers.createButtonState(disabled, loading, selected)`
- `SemanticUtils.generateFieldLabel(label, required, hasError, errorMsg)`

## Known gaps
