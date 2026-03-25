# Native Module Conventions

## Adding a native dependency — five mandatory steps

1. **Web mock**: Create mock in `e2e/mocks/`, add alias in `webpack.config.js`, verify `pnpm e2e` passes. Native modules crash at runtime in the browser — webpack won't catch this at build time.

2. **iOS linking**: Run `cd ios && pod install`. If the package requires fonts/assets (e.g., `react-native-vector-icons`), register in `ios/Borderly/Info.plist` under `UIAppFonts`. Commit `Podfile.lock` and `Info.plist`.

3. **Jest mock**: Add mock in `jest.setup.js`. Understand this hides real import failures — Metro bundle check is the safety net.

4. **Xcode project (for custom Swift/ObjC modules)**: Files on disk are NOT enough — they must be added to `ios/Borderly.xcodeproj/project.pbxproj`. Use the xcodeproj Ruby gem or add via Xcode GUI. Also requires:
   - `SWIFT_OBJC_BRIDGING_HEADER` set to `Borderly/Borderly-Bridging-Header.h` in build settings
   - `SWIFT_VERSION` set to `5.0` in build settings
   - ObjC bridge file (`.m`) with `RCT_EXTERN_MODULE` and `RCT_EXTERN_METHOD`
   - `NativeModules` import in JS to access the module

5. **Verify the module loads**: After building, confirm `NativeModules.YourModule` is not `null` at runtime. A module that exists as files but isn't in the Xcode project silently returns `null` — any fallback code runs instead, hiding the bug.

## Platform service abstraction pattern

When a feature needs different backends per platform (e.g., Apple MapKit on iOS, Photon on Android):
- Create a service with a unified interface (`PlaceSuggestion`, `PlaceDetails`)
- Use `Platform.OS` to route to the correct backend
- The native module returns `null` on non-iOS platforms → fallback runs automatically
- Components import only the service, never the native module directly

Example: `src/services/places/placesService.ts` routes to `ApplePlacesModule` (iOS) or `photonService.ts` (Android/web).

## Country code formats

Borderly uses ISO alpha-3 codes (`JPN`, `USA`) everywhere. External APIs return different formats:
- **Apple MapKit** `isoCountryCode` → alpha-2 (`JP`, `US`)
- **Photon/OSM** `countrycode` → alpha-2 (`jp`, `us`)
- **Google Places** `address_components` → alpha-2 (`JP`, `US`)

Always convert at the service boundary using `alpha2ToAlpha3()` from `placesService.ts`. Never let alpha-2 codes leak into the app.

## React version
Never bump `react` independently of `react-native`. RN pins a specific React version via `react-native-renderer`. Check `node_modules/react-native/package.json` peerDependencies. Mismatches cause runtime crashes.

## Anti-patterns
- **Adding a native dep without a web mock** — E2E tests will crash with no useful error
- **Skipping `pod install`** — iOS build will fail at link time, not at import time
- **Files on disk but not in pbxproj** — module compiles but `NativeModules.X` is `null` at runtime. Silent fallback hides the bug completely.
- **Bumping `react` independently of `react-native`** — causes runtime renderer crashes
- **Using `|| true` to silence failing checks** — hides real errors; fix the root cause
- **Importing native modules directly in components** — wrap in a service so mocking is centralized
- **Comparing alpha-3 codes with alpha-2** (`JPN != JP`) — always convert at the boundary
- **Testing native modules only with Jest mocks** — Jest mocks prove JS passes correct args, NOT that the native code works. Verify the module loads at runtime too.
