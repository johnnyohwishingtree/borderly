# Policy: File Boundaries

## Scope
src/**/*.ts, src/**/*.tsx

## Rules
- DENY: source files over 500 lines — split into subdirectory with barrel
- DENY: screens with 5+ useState — extract business logic to hook
- REQUIRE: every subdirectory split gets a barrel index.ts re-exporting everything
- REQUIRE: screen files match folder name — `<Name>/<Name>.tsx`
- REQUIRE: hook files start with `use` — `use<Domain><Action>.ts`
- REQUIRE: all hooks exported from `src/hooks/index.ts`

## Exceptions
- Test helper files and type definition files have no size limit
- Schema JSON files have no size limit
- Generated files (maestro/flows/generated/) have no size limit

## How to Split

### Utility files with multiple classes/functions
Split each class or logical group into its own file under a subdirectory with a barrel `index.ts`:
```
utils/automationHelpers.ts (6 classes, 900 lines) →
utils/automation/
  selectorBuilder.ts
  dataTransformer.ts
  elementUtils.ts
  errorHandling.ts
  performanceMonitor.ts
  automationPatterns.ts
  index.ts           # barrel re-exports all
```

### Files with types + a single class
Extract type definitions into a separate `*Types.ts` file:
```
utils/portalDetection.ts (types + class, 965 lines) →
utils/portal/
  portalTypes.ts     # all interfaces and type aliases
  portalDetector.ts  # class imports types from portalTypes
  index.ts           # barrel re-exports class + types
```

### Screens with complex business logic
Extract logic into custom hooks under `src/hooks/` per `policies/state/hook-conventions.md`.

## Anti-patterns
- 900-line screen file with 9 useState calls — extract to a hook
- Splitting a file but forgetting the barrel index.ts — imports break
- Hook file not exported from barrel — unusable via standard import path
- Screen at `SettingsScreen/Settings.tsx` — should be `SettingsScreen/SettingsScreen.tsx`

## Enforcement
- `__tests__/structure/hooks-barrel.test.ts` — barrel completeness + naming
- `__tests__/structure/screen-folder-convention.test.ts` — screen naming
- Skills reference this policy directly when splitting files

## Derives From
- `principles/naming-enables-enforcement.md`
- `facts/craft.md#f:craft:size-indicates-scope-creep`
- `facts/craft.md#f:craft:naming-enables-automation`
- `facts/craft.md#f:craft:separation-of-concerns`
