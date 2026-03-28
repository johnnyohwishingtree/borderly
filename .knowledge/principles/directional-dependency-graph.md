# Principle: Directional Dependency Graph

All dependencies must form an acyclic graph. Data flows in one direction: components <- hooks <- stores/services <- storage. Circular imports break the module system and create untestable coupling.

## Derives from
- `facts/craft.md#f:craft:separation-of-concerns`
- `facts/craft.md#f:craft:interfaces-over-implementations`
- `facts/craft.md#f:craft:state-is-the-source-of-bugs`

## Implemented by
- `policies/architecture/dependency-direction.md`
- `policies/state/store-boundaries.md`
- `policies/state/hook-conventions.md`
