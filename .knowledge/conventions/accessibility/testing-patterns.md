# Accessibility Testing Patterns

All UI components must have a11y tests in `__tests__/components/<domain>/<Component>.a11y.test.tsx`.

## Query order of preference
1. `getByRole` — when RNTL recognizes the host component
2. `getByLabelText` — for elements with `accessibilityLabel`
3. `getByTestId` + `.props.accessibilityRole` — when host component is mocked

**Do NOT use** `getByRole` on mocked native components (TouchableOpacity, etc.) — use `getByTestId` and check `.props.accessibilityRole` directly.

## Known gaps
