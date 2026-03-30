# Decision: Bare React Native Workflow

## Status
Accepted

## Context
Borderly needs native module access for passport MRZ scanning (camera + ML Kit), biometric-protected Keychain storage, and potentially NFC e-passport reading. Expo managed workflow restricts native module usage.

## Decision
Use bare React Native workflow (not Expo managed) to allow direct native module integration. Accept the trade-off of manual iOS/Android configuration in exchange for unrestricted native access.

## Derives from
- `facts/tool/bare-rn-not-expo.md`
- `facts/domain/passport-mrz-is-standardized.md`

## Consequences
- Full control over native modules and build configuration
- Must manage CocoaPods, Xcode project, and Android Gradle manually
- Every native dependency needs three implementations: native + web mock + Jest mock
- No Expo Go for rapid prototyping (must build to simulator/device)
