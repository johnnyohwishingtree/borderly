# Policy: Store Boundaries

## Scope
src/stores/

## Rules
- DENY: stores importing other stores
- DENY: stores importing hooks
- REQUIRE: cross-store coordination done in hooks or screens
- ALLOW: stores importing services
- ALLOW: stores importing own internal files (types, helpers, slices) via relative paths

## Current Stores
- `useProfileStore` — multi-profile/family management, onboarding
- `useTripStore` — trips, legs, QR codes, multi-traveler
- `useFormStore` — form generation, validation, auto-fill
- `useAppStore` — preferences, feature flags, app lock, network

## Exceptions
- Store barrel `index.ts` re-exports all stores
- Type-only imports across stores are allowed

## Anti-patterns
- `useTripStore` importing `useProfileStore` for family data
- Store calling a hook to get derived state

## Enforcement
- `__tests__/structure/dependency-direction.test.ts` (tests 1-2)

## References
- Related: policies/state/hook-conventions.md
- Related: policies/architecture/dependency-direction.md
