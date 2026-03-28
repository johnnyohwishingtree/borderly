# Facts: Craft

Universal software engineering truths. These rarely change. They justify architectural policies.

## f:craft:separation-of-concerns

A system is easier to change when each component has one reason to change. Mixing UI, state, and side-effects in one file creates coupling that makes all three harder to modify independently.

**Referenced by:** `policies/architecture/dependency-direction.md`, `policies/state/hook-conventions.md`, `policies/state/store-boundaries.md`

## f:craft:fail-fast

Detecting and surfacing errors at the earliest possible point minimizes debugging cost and data corruption. A type error caught at compile time is cheaper than one caught in production.

**Referenced by:** `policies/workflow/fix-strategy.md`, `policies/workflow/verification.md`

## f:craft:interfaces-over-implementations

Depending on abstractions rather than concrete implementations allows components to be swapped without changing callers. Direct imports of native modules (Keychain, MMKV) create tight coupling.

**Referenced by:** `policies/architecture/dependency-direction.md`, `policies/platform/native-modules.md`, `policies/data/storage-tiers.md`

## f:craft:state-is-the-source-of-bugs

Most software bugs are caused by unexpected or inconsistent state, not logic errors. Minimizing mutable state surface area reduces bug density.

**Referenced by:** `policies/state/hook-conventions.md`, `policies/state/store-boundaries.md`

## f:craft:tests-are-specifications

A test suite is a machine-readable specification of intended behavior, not just a bug detector. Tests that only assert `toBeDefined()` specify nothing.

**Referenced by:** `policies/testing/test-quality.md`, `policies/testing/test-conventions.md`, `policies/workflow/bug-fix.md`

## f:craft:naming-enables-automation

Predictable naming patterns (prefixes, suffixes, folder conventions) make constraints greppable and therefore mechanically enforceable. Unpredictable naming requires human review.

**Referenced by:** `policies/architecture/testable-architecture.md`, `policies/testing/e2e-testability.md`, `policies/architecture/file-boundaries.md`, `policies/state/hook-conventions.md`

## f:craft:size-indicates-scope-creep

File size, parameter count, and return value count are proxies for cognitive complexity. When these exceed thresholds, the unit is doing too much and should be split.

**Referenced by:** `policies/architecture/file-boundaries.md`, `policies/state/hook-conventions.md`, `policies/architecture/utils-boundary.md`

## f:craft:caching-trades-freshness-for-speed

Cached data is always potentially stale. Every cache needs a TTL and an invalidation strategy. Without these, stale data becomes silent bugs.

**Referenced by:** `models/form-engine.md` (5m form cache, 2m field cache)
