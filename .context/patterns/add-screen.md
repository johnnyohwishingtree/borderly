# Pattern: Add a New Screen

## Policies to follow
- `__tests__/structure/screen-folder-convention.test.ts` — screen naming, typed routes, folder/file naming
- `__tests__/structure/no-space-x.test.ts` — NativeWind styling rules
- `__tests__/structure/accessibility-props.test.ts` — a11y props on interactive elements
- `__tests__/structure/component-testids.test.ts` — testIDs on interactive elements
- `__tests__/structure/hooks-barrel.test.ts` — extract logic if 3+ useState

## Files to create/modify (in order)

### 1. `src/screens/<domain>/<ScreenName>/<ScreenName>.tsx`
- Thin render layer — extract business logic to hooks
- testIDs on every interactive element
- NativeWind className for styling
- accessibilityRole + accessibilityLabel on Pressable/TouchableOpacity

### 2. Register in navigator
- Add to appropriate navigator in `src/app/navigation/`
- Add type to the stack's param list in `src/app/navigation/types.ts`
- Add a lazy import and `<Stack.Screen>` entry in the relevant navigator
- If adding to onboarding flow, update `OnboardingStackParamList` and wire navigation from the preceding/following screens

### 3. Tests
- Update `e2e/mobile/full-e2e.test.ts` if the screen is part of a tested journey
- `e2e/tests/<screen>.spec.ts` — Playwright E2E (add mock if new native module)
- `__tests__/screens/<domain>/<ScreenName>.test.tsx` — unit test

## Checklist
- [ ] Screen folder matches file name (`<Name>/<Name>.tsx`)
- [ ] testIDs on all interactive elements (declared in `testIDs.ts`)
- [ ] accessibilityRole on all Pressable/TouchableOpacity
- [ ] Hook extracted if 3+ useState
- [ ] Registered in navigator with typed route
- [ ] E2E and unit tests pass
