# Storage Conventions

Three-tier storage. See `.knowledge/concepts/security-boundary.md` for security rules.

## Where data goes

| Data type | Storage | Why |
|-----------|---------|-----|
| Passport, encryption keys | OS Keychain (`react-native-keychain`) | Biometric-locked, excluded from backups |
| Trips, form data, QR codes | WatermelonDB (SQLite-backed) | Encrypted at rest, queryable |
| Preferences, schemas, flags | MMKV (`react-native-mmkv`) | Fast synchronous reads, not sensitive |

## WatermelonDB encryption
- Encryption key stored in OS Keychain
- Key generated on first app launch
- `WHEN_UNLOCKED_THIS_DEVICE_ONLY` — not backed up

## MMKV notes
- v3.x requires `newArchEnabled=true` — setting false breaks Android builds
- API keys (e.g., Google Places) stored here — not sensitive enough for Keychain

## Known gaps
