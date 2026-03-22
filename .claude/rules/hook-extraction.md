# Custom Hook Extraction Pattern

Screens must be thin render layers. Business logic belongs in custom hooks under `src/hooks/`.

## When to extract a hook:
- A screen has more than 3 `useState` declarations that manage related state
- A screen contains async operations (API calls, storage, credential resolution)
- Logic is reusable across screens or could be tested independently
- A screen exceeds ~300 lines — look for extractable logic groups

## Hook naming conventions:
- `use<Domain><Action>` — e.g., `usePortalAutoLogin`, `useLegForm`, `useTripCreation`
- One hook per concern, not one mega-hook per screen
- Generic reusable hooks (e.g., `useLoadTimeout`) should have no screen-specific logic

## Hook design rules:
- Hooks own their state (`useState`, `useRef`) and effects (`useEffect`)
- Hooks return state values AND callbacks — screens should not define business logic callbacks
- Pass external dependencies (refs, IDs, configs) as options objects, not positional args
- Hooks may import stores and services directly — this is the correct dependency direction
- Components must NOT import stores — only hooks and screens can

## Barrel export:
- All hooks must be exported from `src/hooks/index.ts`
- Import from `@/hooks/useXxx` in screens (not the barrel) to keep tree-shaking clean

## Testing:
- Every extracted hook should have a corresponding test in `__tests__/hooks/`
- Use `renderHook` from `@testing-library/react-hooks` for testing
- Test the hook's state transitions and callbacks independently from UI

## Dependency direction (enforced):
```
Screens → Hooks → Stores → Services
              ↘ Services
Components ← props only (no stores, no hooks with side effects)
```
