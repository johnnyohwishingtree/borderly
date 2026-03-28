# Principle: Security Through Storage Tier Mapping

Data sensitivity determines where data lives. PII goes in the most secure tier (Keychain), structured app data in the middle tier (WatermelonDB, encrypted), and config/prefs in the fastest tier (MMKV, unencrypted). Data never crosses tiers upward — PII never goes in MMKV.

## Derives from
- `facts/regulatory/pii-has-special-handling-requirements.md`
- `facts/tool/keychain-is-os-secure-storage.md`
- `facts/tool/watermelondb-encrypts-at-rest.md`
- `facts/tool/mmkv-is-fast-but-unencrypted.md`
- `facts/organizational/three-tier-storage.md`

## Implemented by
- `policies/data/storage-tiers.md`
- `policies/data/pii-boundary.md`
- `policies/architecture/local-first.md`
