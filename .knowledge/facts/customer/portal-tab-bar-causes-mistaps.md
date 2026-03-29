# Fact: Portal Tab Bar Hidden — No More Mistaps

**Previously:** The tab bar was visible during portal submission, with the auto-fill pill at y=770 and tab icons at y=840. The 70px gap caused accidental tab switches during E2E testing.

**Current state (March 2026):** Tab bar is hidden via `getFocusedRouteNameFromRoute` in MainTabNavigator when PortalSubmissionScreen is active. The portal is now full-screen. The pill sits at the bottom of the safe area with no risk of tab switching.

Source: `src/app/navigation/MainTabNavigator.tsx`
