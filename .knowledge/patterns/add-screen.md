# Pattern: Add a New Screen

## Policies to follow
- `.knowledge/policies/platform/navigation.md` — screen naming, typed routes
- `.knowledge/policies/ui/styling.md` — NativeWind, spacing
- `.knowledge/policies/ui/accessibility.md` — a11y props on interactive elements
- `.knowledge/policies/testing/e2e-testability.md` — testIDs on interactive elements
- `.knowledge/policies/state/hook-conventions.md` — extract logic if 3+ useState
- `.knowledge/policies/architecture/file-boundaries.md` — folder/file naming

## Files to create/modify (in order)

### 1. `src/screens/<domain>/<ScreenName>/<ScreenName>.tsx`
- Thin render layer — extract business logic to hooks
- testIDs on every interactive element
- NativeWind className for styling
- accessibilityRole + accessibilityLabel on Pressable/TouchableOpacity

### 2. Register in navigator
- Add to appropriate navigator in `src/app/navigation/`
- Add type to `src/app/navigation/types.ts` — no hardcoded route strings

### 3. Update screenRegistry
- Add screen to `maestro/generator/screenRegistry.ts` with testIDs, buttons, alerts
- Run `pnpm maestro:generate`

### 4. Tests
- `e2e/tests/<screen>.spec.ts` — Playwright E2E (add mock if new native module)
- `__tests__/screens/<domain>/<ScreenName>.test.tsx` — unit test

## Checklist
- [ ] Screen folder matches file name (`<Name>/<Name>.tsx`)
- [ ] testIDs on all interactive elements
- [ ] accessibilityRole on all Pressable/TouchableOpacity
- [ ] Hook extracted if 3+ useState
- [ ] Registered in navigator with typed route
- [ ] Added to screenRegistry + maestro:generate
- [ ] E2E and unit tests pass
