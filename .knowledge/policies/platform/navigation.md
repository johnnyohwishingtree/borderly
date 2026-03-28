# Policy: Navigation

## Scope
src/screens/, src/app/navigation/

## Rules
- REQUIRE: each screen in a named folder: `src/screens/<domain>/<ScreenName>/<ScreenName>.tsx`
- REQUIRE: typed route names from `types.ts` — no hardcoded strings
- REQUIRE: navigation logic in screens/hooks only — components receive `onPress` callbacks
- DENY: deep nesting of stacks (stack inside tab inside stack)
- REQUIRE: verify back button works after adding a new screen

## Screen Organization
- `RootNavigator.tsx` — Auth/Onboarding/Main routing
- `MainTabNavigator.tsx` — Bottom tabs
- Tab navigation on web: `stripWebHref()` removes `href` from tab button props

## Exceptions
- None

## Anti-patterns
- `navigation.navigate('TripDetail')` hardcoded string — use typed routes
- Component with `useNavigation()` — pass `onPress` via props instead
- Adding a screen without checking back navigation

## Enforcement
- `__tests__/structure/screen-folder-convention.test.ts` — folder/file naming

## References
- Related: policies/architecture/file-boundaries.md (screen naming)

## Derives From
- `principles/directional-dependency-graph.md`
- `principles/naming-enables-enforcement.md`
- `facts/craft/naming-enables-automation.md`
- `facts/craft/separation-of-concerns.md`
