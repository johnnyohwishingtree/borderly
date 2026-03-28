# Principle: Directional Dependency Graph

All dependencies must form an acyclic graph. Data flows in one direction: components <- hooks <- stores/services <- storage. Circular imports break the module system and create untestable coupling.

## Derives from
- `facts/craft/separation-of-concerns.md`
- `facts/craft/interfaces-over-implementations.md`
- `facts/craft/state-is-the-source-of-bugs.md`

## Implemented by
- `policies/architecture/dependency-direction.md`
- `policies/state/store-boundaries.md`
- `policies/state/hook-conventions.md`
