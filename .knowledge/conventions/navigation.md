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

