# Storage Services

Three-tier storage: Keychain (PII), WatermelonDB (structured), MMKV (config) — passport data NEVER leaves Keychain except into memory.
See: __tests__/structure/storage-boundary.test.ts
See: __tests__/structure/pii-boundary.test.ts
