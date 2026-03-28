# Fact: Interfaces Over Implementations

Depending on abstractions rather than concrete implementations allows components to be swapped without changing callers. Direct imports of native modules (Keychain, MMKV) create tight coupling.

## Referenced by
- `policies/architecture/dependency-direction.md`
- `policies/platform/native-modules.md`
- `policies/data/storage-tiers.md`
