# Fact: Portal Screen Shows Tab Bar, Causing Mistaps

The PortalSubmissionScreen shows the bottom tab bar while the WebView is active. The auto-fill pill ("Fields for this page") sits directly above the tab bar at ~y=770, while tab icons are at ~y=840. The 70px gap makes accidental tab switches likely.

This was discovered during E2E testing when a tap intended for the pill hit the Profile tab icon instead, navigating away from the portal.

Source: `src/screens/trips/PortalSubmissionScreen/`
