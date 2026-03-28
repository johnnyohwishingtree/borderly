# Policy: Hook Conventions

## Scope
src/hooks/, src/screens/

## Rules
- REQUIRE: screens with 3+ related useState → extract to custom hook
- REQUIRE: hook naming: `use<Domain><Action>` (e.g., `useTripCreation`)
- REQUIRE: all hooks exported from `src/hooks/index.ts` barrel
- REQUIRE: hooks own state + effects, return values AND callbacks
- REQUIRE: pass external deps as options objects, not positional args
- DENY: business logic in screen render functions
- DENY: `useState` for derived data — compute inline or `useMemo`
- DENY: hooks that return 10+ values — split or group into named objects
- DENY: positional hook arguments (`useMyHook(true, false, 3)`)
- ALLOW: hooks import stores and services directly
- DENY: components import stores — only hooks and screens can

## Exceptions
- Modal visibility state (2-3 useState for show/hide) can stay in screens
- Simple UI state (search text, tab selection) can stay in screens if < 3

## Anti-patterns
- 9 useState calls in a screen file
- `useMyHook(true, false, 3)` — use `useMyHook({ enabled: true, limit: 3 })`
- Hook not in barrel — unusable via `from '@/hooks'`
- `const derived = items.filter(...)` stored in useState instead of computed

## Enforcement
- `__tests__/structure/hooks-barrel.test.ts` — barrel completeness + naming
- `__tests__/structure/hook-return-limit.test.ts` — max 10 top-level return keys

## References
- Related: policies/state/store-boundaries.md
- Related: policies/architecture/dependency-direction.md

## Derives From
- `principles/directional-dependency-graph.md`
- `principles/naming-enables-enforcement.md`
- `facts/craft/separation-of-concerns.md`
- `facts/craft/state-is-the-source-of-bugs.md`
- `facts/craft/naming-enables-automation.md`
- `facts/craft/size-indicates-scope-creep.md`
