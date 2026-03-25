# Navigation Conventions

## Framework
React Navigation v7

## Structure
- `RootNavigator.tsx` — Auth/Onboarding/Main routing
- `MainTabNavigator.tsx` — Bottom tabs
- Tab navigation on web: `stripWebHref()` removes `href` from tab button props to prevent browser navigation

## Screen organization
Each screen lives in a named folder: `src/screens/<domain>/<ScreenName>/<ScreenName>.tsx`

Screens are thin render layers — business logic belongs in custom hooks under `src/hooks/`.

## Anti-patterns
- **Hardcoded route strings** (`navigation.navigate('TripDetail')`) — use typed route names from `types.ts`
- **Navigation logic in components** — components receive `onPress` callbacks, screens handle navigation
- **Deep nesting of stacks** (stack inside tab inside stack) — keeps navigation tree shallow
- **Forgetting back navigation** — always verify the back button works after adding a new screen

