# Policy: Storage Tiers

## Scope
src/services/storage/, src/hooks/, src/services/**

## Rules
- REQUIRE: passport data, encryption keys → OS Keychain only
- REQUIRE: trips, form data, QR codes → WatermelonDB (encrypted at rest)
- REQUIRE: preferences, schemas, flags → MMKV
- DENY: PII in MMKV (not encrypted, included in device backups)
- DENY: PII in WatermelonDB (must be stripped via `stripPIIFromFormData`)
- DENY: direct `react-native-keychain` imports outside `src/services/storage/`
- DENY: direct `react-native-mmkv` imports outside `src/services/storage/`
- REQUIRE: all storage access through centralized services in `src/services/storage/`
- REQUIRE: WatermelonDB encryption key stored in Keychain
- REQUIRE: Keychain items use `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (excluded from backups)

## Exceptions
- `LockScreen.tsx` — biometric capability check (not reading PII)
- `useAppLock.ts` — biometric auth prompt (IS the security boundary)
- `keychainValidator.ts` — security audit tool (needs raw Keychain access)
- `dataLeakDetector.ts` — security scanner (needs raw MMKV access to scan)
- `privacyAudit.ts` — audit tool (needs raw access to inventory all tiers)

## Anti-patterns
- `import * as Keychain from 'react-native-keychain'` in a hook (use storage service)
- `new MMKV({ id: 'custom' })` in utils (use mmkvService)
- `console.log(passportData)` — never log PII
- Storing encryption keys alongside encrypted data
- `AsyncStorage` — not used, use MMKV or WatermelonDB

## Enforcement
- `__tests__/structure/pii-boundary.test.ts` — PII stripped before DB persist
- Story #853 — storage boundary structural test (pending)

## References
- Related: policies/data/pii-boundary.md
- Related: policies/architecture/local-first.md

## Context
- `.context/decisions/001-three-tier-storage.md`
- `.context/external/regulatory/pii-has-special-handling-requirements.md`
- `.context/external/tools/keychain-is-os-secure-storage.md`
- `.context/external/tools/watermelondb-encrypts-at-rest.md`
- `.context/external/tools/mmkv-is-fast-but-unencrypted.md`
