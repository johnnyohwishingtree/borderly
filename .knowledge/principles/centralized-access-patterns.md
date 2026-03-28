# Principle: Centralized Access Patterns

Direct imports of low-level modules (MMKV, Keychain, native APIs) are forbidden outside designated service boundaries. All access goes through centralized services. This enables swapping implementations without breaking callers and concentrates security-sensitive code in fewer files.

## Derives from
- `facts/craft/interfaces-over-implementations.md`
- `facts/craft/separation-of-concerns.md`
- `facts/tool/keychain-is-os-secure-storage.md`

## Implemented by
- `policies/data/storage-tiers.md` (DENY direct imports outside services/storage/)
- `policies/platform/native-modules.md` (DENY native module imports in components)
- `policies/architecture/dependency-direction.md`
- `policies/architecture/utils-boundary.md`
