# Decision: Three-Tier Storage Architecture

## Status
Accepted

## Context
Borderly stores sensitive identity data (passport numbers, DOB, names) alongside non-sensitive app data (trips, preferences, schemas). A single storage layer can't satisfy both security and performance requirements.

## Decision
Three tiers mapped to data sensitivity:
- **Keychain** — PII + encryption keys (OS-level security, biometric-protected)
- **WatermelonDB** — structured app data (trips, forms, QR codes; encrypted at rest)
- **MMKV** — config, preferences, cached schemas (fast, unencrypted)

Data never crosses tiers upward — PII never goes in MMKV or WatermelonDB.

## Derives from
- `facts/regulatory/pii-has-special-handling-requirements.md`
- `facts/tool/keychain-is-os-secure-storage.md`
- `facts/tool/watermelondb-encrypts-at-rest.md`
- `facts/tool/mmkv-is-fast-but-unencrypted.md`
- `principles/security-through-storage-tiers.md`

## Consequences
- PII access requires Keychain round-trip (slower than MMKV reads)
- Family member isolation requires separate Keychain entries per member
- WatermelonDB encryption key stored in Keychain (two-layer dependency)
- MMKV excluded from backup verification (no sensitive data)
