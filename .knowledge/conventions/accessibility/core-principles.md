# Accessibility Core Principles

React Native a11y for VoiceOver (iOS) and TalkBack (Android).

- Every interactive element: `accessible={true}` + `accessibilityRole`
- Labels describe intent, not appearance: "Submit declaration form" not "Blue button"
- Errors announced via `accessibilityLiveRegion="polite"`
- Decorative elements hidden: `accessibilityElementsHidden={true}` or `importantForAccessibility="no-hide-descendants"`
- State communicated: disabled, loading, selected via `accessibilityState`

