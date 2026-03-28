# Facts: Tool

Truths about specific technologies in Borderly's stack. These change when the tool changes version or is replaced.

## f:tool:bare-rn-not-expo

Borderly uses bare React Native workflow (not Expo managed) to support native modules: camera for MRZ scanning, Keychain for biometric-protected storage, future NFC for e-passport reading.

**Referenced by:** `policies/platform/native-modules.md`

## f:tool:nativewind-is-tailwind-for-rn

NativeWind provides Tailwind CSS utility classes for React Native. It enables utility-first styling with a shared vocabulary but cannot handle animated/dynamic values (those require `style={{}}`).

**Referenced by:** `policies/ui/styling.md`

## f:tool:keychain-is-os-secure-storage

react-native-keychain provides OS-level Keychain access (iOS Keychain / Android Keystore). Items stored with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` are excluded from iCloud/Google backups and require device unlock.

**Referenced by:** `policies/data/storage-tiers.md`, `policies/data/pii-boundary.md`

## f:tool:watermelondb-encrypts-at-rest

WatermelonDB uses SQLite with JSI for native speed. It supports at-rest encryption but the decryption key must exist in memory during use. The key is stored separately in Keychain.

**Referenced by:** `policies/data/storage-tiers.md`

## f:tool:mmkv-is-fast-but-unencrypted

MMKV is an ultra-fast key-value store for preferences and config. It is NOT encrypted. Items stored in MMKV are included in device backups by default.

**Referenced by:** `policies/data/storage-tiers.md`, `policies/data/pii-boundary.md`

## f:tool:searchable-select-for-long-lists

For mobile UX, `searchable_select` is the standard dropdown type (not `select`) because it supports search/filter over 200+ items (countries, airlines, airports). Standard select becomes unusable beyond ~20 items.

**Referenced by:** `policies/data/schema-fields.md`, `models/form-engine.md` (Smart Components)

## f:tool:jest-fake-timers-hang-with-renderhook

Jest's `useFakeTimers()` combined with `renderHook` from RNTL causes infinite loops or OOM. Tests using both must use real timers or alternative patterns.

**Referenced by:** `policies/testing/test-conventions.md` (Anti-patterns)

## f:tool:date-string-parsing-shifts-timezone

`new Date('YYYY-MM-DD')` parses as UTC midnight, which shifts to the previous day in negative UTC offsets. Always use `new Date(year, month - 1, day)` for date-only strings.

**Referenced by:** `policies/testing/test-conventions.md` (Anti-patterns)
