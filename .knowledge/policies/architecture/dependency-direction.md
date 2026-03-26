# Policy: Dependency Direction

## Scope
src/stores/, src/services/, src/components/, src/hooks/, src/screens/

## Rules
- ALLOW: screens → hooks, stores, services, components
- ALLOW: hooks → stores, services
- ALLOW: stores → services (runtime), own types/helpers (relative imports)
- ALLOW: services → other services, utilities
- ALLOW: components → props only
- DENY: components → stores (receive data via props)
- DENY: components → hooks with side effects
- DENY: services → stores (accept state as function parameters)
- DENY: services → hooks
- DENY: stores → other stores (coordinate in hooks)
- DENY: stores → hooks
- REQUIRE: cross-store coordination done in hooks or screens

## Exceptions
- Store barrel `index.ts` may re-export all stores
- Type-only imports (`import type`) are allowed across any boundary
- Store internal files (types, helpers, slices) may import each other via relative paths

## Anti-patterns
- `import { useTripStore } from '../stores'` in a component — pass data via props
- `import { useProfileStore } from '@/stores'` in a service — accept state as parameter
- `useEffect` in a component that calls a store action — move to a hook
- Circular imports (A → B → A) — always a direction violation

## Enforcement
`__tests__/structure/dependency-direction.test.ts` — 4 tests:
1. Stores never import from hooks
2. Stores never import from other stores (except barrel)
3. Components never import stores directly
4. Services never import stores or hooks

## References
- Related: policies/state/store-boundaries.md
- Related: policies/state/hook-conventions.md

## Current Stores
- useProfileStore — multi-profile/family management
- useTripStore — trips, legs, QR codes, multi-traveler
- useFormStore — form generation, validation, auto-fill
- useAppStore — preferences, feature flags, app lock
