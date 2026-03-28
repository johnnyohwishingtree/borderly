# Fact: Three-Tier Storage

Borderly uses three storage tiers mapped to data sensitivity: OS Keychain (PII + encryption keys), WatermelonDB (structured data, encrypted at rest), MMKV (config + schemas, unencrypted, fast).

## Referenced by
- `policies/data/storage-tiers.md`
- `policies/data/pii-boundary.md`
