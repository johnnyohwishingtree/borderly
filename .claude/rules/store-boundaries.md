# Store Boundaries

Zustand stores are the state management layer. Enforce strict dependency direction.

## Dependency direction:
```
Screens → Hooks → Stores → Services
Components → Hooks (for store access)
```

## Rules:

### Components must NOT import stores
Components receive data via props or hooks. If a component needs store data, create a hook that wraps the store and use it in the component.

Example: `AccountSetupChecklist` uses `useAccountSetup` hook instead of importing `useAccountSetupStore` directly.

### Services must NOT import stores
Services are lower-level than stores. If a service needs runtime state, accept it as a parameter from the caller (screen or hook).

Example: `bugReporter.submitBugReport()` accepts a `DiagnosticContext` param instead of calling `useAppStore.getState()`.

### Stores must NOT import other stores
Each store manages its own domain. Cross-store coordination belongs in hooks or screens.

### Screens CAN import stores directly
Screens are the top-level coordinators. They can import stores when hooks don't cover the use case.

## Current stores:
- `useProfileStore` — multi-profile/family management, onboarding
- `useTripStore` — trips, legs, QR codes, multi-traveler
- `useFormStore` — form generation, validation, auto-fill
- `useAppStore` — preferences, feature flags, app lock, network
- `useAccountSetupStore` — portal account readiness per profile
