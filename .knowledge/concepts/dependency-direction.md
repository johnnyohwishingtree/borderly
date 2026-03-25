# Dependency Direction

Strict unidirectional data flow. Violations cause circular imports and testability problems.

## The rule

```
Screens → Hooks → Stores → Services
Components → Props only (no stores, no hooks with side effects)
```

- **Screens** can import hooks and stores directly
- **Hooks** own state + effects, call stores and services
- **Stores** (Zustand) manage domain state, call services
- **Services** are lowest level — never import stores or hooks
- **Components** receive everything via props — never import stores

## Current stores
- `useProfileStore` — multi-profile/family management, onboarding
- `useTripStore` — trips, legs, QR codes, multi-traveler
- `useFormStore` — form generation, validation, auto-fill
- `useAppStore` — preferences, feature flags, app lock, network

## Cross-store coordination
Stores never import other stores. If two stores need to coordinate, the hook or screen does the coordination.

## Anti-patterns
- **Component importing a store** (`import { useTripStore } from '../stores'`) — pass data via props
- **Service importing a store** — services accept state as function parameters
- **Screen with 300+ lines of logic** — extract to a hook; screen should just render
- **Circular imports** (A imports B imports A) — always a dependency direction violation
- **`useEffect` in a component that calls a store action** — move the effect to a hook

