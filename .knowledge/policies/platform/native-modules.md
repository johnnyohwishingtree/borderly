# Policy: Native Modules

## Scope
ios/, e2e/mocks/, jest.setup.js, webpack.config.js

## Rules
- REQUIRE: web mock in `e2e/mocks/` + webpack alias for every native module
- REQUIRE: Jest mock in `jest.setup.js` for every native module
- REQUIRE: `cd ios && pod install` after adding iOS dependencies
- REQUIRE: custom Swift modules added to Xcode `project.pbxproj`
- REQUIRE: `SWIFT_OBJC_BRIDGING_HEADER` set when adding Swift files
- REQUIRE: `SWIFT_VERSION` set in Xcode build settings
- REQUIRE: platform service abstraction for cross-platform features (Apple on iOS, fallback on Android)
- DENY: bumping `react` independently of `react-native`
- DENY: `|| true` to silence failing checks
- DENY: importing native modules directly in components — wrap in services

## Country Code Formats
- Borderly uses ISO alpha-3 (`JPN`, `USA`) everywhere
- Apple MapKit `isoCountryCode` returns alpha-2 (`JP`, `US`)
- Always convert at the service boundary using `alpha2ToAlpha3()`

## Exceptions
- None — every native module needs all three (web mock, Jest mock, pod install)

## Anti-patterns
- Native module file on disk but not in Xcode pbxproj → `NativeModules.X` is null
- Missing web mock → E2E crashes with no useful error
- Comparing alpha-3 (`JPN`) with alpha-2 (`JP`) — always fails silently
- Testing with Jest mocks as proof native code works (verify at runtime too)

## Enforcement
- `__tests__/structure/native-module-mocks.test.ts` — mock file existence

## References
- Related: policies/testing/test-conventions.md
