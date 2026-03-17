# Service Facade Pattern

When a screen or hook needs to coordinate multiple services, use a facade (coordinator) instead of importing services directly.

## Why:
- Screens/hooks importing 5+ services is a code smell
- A facade provides a single entry point with a coherent API
- Makes testing easier — mock one coordinator instead of many services
- Reduces coupling between UI layer and service internals

## Current facades:
- `submissionCoordinator` (`src/services/submission/submissionCoordinator.ts`) — coordinates page detection, auto-fill, auto-login, credential management, and QR detection for portal submission

## When to create a new facade:
- A hook or screen imports 4+ services from the same domain
- Multiple hooks share the same service imports
- Service APIs are low-level but consumers need high-level operations

## Facade design rules:
- One facade per domain (submission, trips, profiles)
- Facade is a singleton class instance (like `submissionCoordinator`)
- Facade methods call through to underlying services — no duplicated logic
- Move inline JavaScript scripts into the facade (not in hooks or screens)
- Export facade from the domain's barrel `index.ts`
- Underlying services remain independently importable for tests and edge cases

## Dependency direction:
```
Hooks → Facade → Services
Screen → Facade (only for items not in hooks)
```

Hooks should NOT import individual low-level services when a facade exists for that domain.
