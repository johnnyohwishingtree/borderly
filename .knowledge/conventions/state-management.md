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
- `useTripDetail`, `usePortalSubmission`, `useTemplates`
- `useAddQR`, `useQRWallet`, `useBugReport`, `useSettings`, `useFeedback`

All exported from `src/hooks/index.ts`.

## Anti-patterns
- **Business logic in screen render functions** — extract to a hook, screen just calls it
- **`useState` for derived data** — compute it inline or use `useMemo`; don't sync state
- **Passing store selectors as props** — components get plain data, not store references
- **Cross-store imports** (`useTripStore` importing `useProfileStore`) — coordinate in a hook
- **Positional hook arguments** (`useMyHook(true, false, 3)`) — use an options object
- **Hooks that return 10+ values** — split into focused hooks or group into named objects

