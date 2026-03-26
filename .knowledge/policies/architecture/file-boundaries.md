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

## Anti-patterns
- 900-line screen file with 9 useState calls — extract to a hook
- Splitting a file but forgetting the barrel index.ts — imports break
- Hook file not exported from barrel — unusable via standard import path
- Screen at `SettingsScreen/Settings.tsx` — should be `SettingsScreen/SettingsScreen.tsx`

## Enforcement
- `__tests__/structure/hooks-barrel.test.ts` — barrel completeness + naming
- `__tests__/structure/screen-folder-convention.test.ts` — screen naming
- `.claude/rules/file-size-limits.md` — 500-line rule (auto-loaded)
