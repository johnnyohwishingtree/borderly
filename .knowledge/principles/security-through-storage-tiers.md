# Principle: Security Through Storage Tier Mapping

Data sensitivity determines where data lives. PII goes in the most secure tier (Keychain), structured app data in the middle tier (WatermelonDB, encrypted), and config/prefs in the fastest tier (MMKV, unencrypted). Data never crosses tiers upward — PII never goes in MMKV.

## Derives from
- `facts/regulatory.md#f:reg:pii-has-special-handling-requirements`
- `facts/tool.md#f:tool:keychain-is-os-secure-storage`
- `facts/tool.md#f:tool:watermelondb-encrypts-at-rest`
- `facts/tool.md#f:tool:mmkv-is-fast-but-unencrypted`
- `facts/organizational.md#f:org:three-tier-storage`

## Implemented by
- `policies/data/storage-tiers.md`
- `policies/data/pii-boundary.md`
- `policies/architecture/local-first.md`
