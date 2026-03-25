# State Management Conventions

## Framework
Zustand stores.

## Hook extraction pattern
Screens must be thin render layers. Business logic belongs in custom hooks under `src/hooks/`.

### When to extract
- Screen has 3+ related `useState` declarations
- Screen contains async operations (API calls, storage, credential resolution)
- Logic is reusable or independently testable
- Screen exceeds ~300 lines

### Hook design
- `use<Domain><Action>` naming (e.g., `usePortalAutoLogin`, `useLegForm`)
- Hooks own state + effects, return values AND callbacks
- Pass external deps as options objects, not positional args
- Hooks import stores and services directly
- Components NEVER import stores — only hooks and screens can

### Existing extracted hooks
- `usePortalProfiles`, `useLoadTimeout`, `usePortalAutoLogin`, `usePortalAutoFill`
- `useLegForm`, `useTripCreation`, `usePassportScan`
- `useBackupExport`, `useBackupRestore`, `usePassportValidity`

All exported from `src/hooks/index.ts`.

