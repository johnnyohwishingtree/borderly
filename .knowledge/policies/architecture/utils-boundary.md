# Policy: Utils Boundary

## Scope
src/utils/, src/services/

## Rules
- REQUIRE: utils are pure functions — no state, no storage, no side effects
- REQUIRE: utils are stateless — same input always produces same output
- DENY: utils creating MMKV/storage instances (use `src/services/storage/`)
- DENY: utils with their own lifecycle (init, cleanup, sessions)
- DENY: utils with 5+ files in a subdirectory — promote to a service

## What belongs in utils/
- Pure transformers: `dateUtils.ts`, `crypto.ts`, `deepCopy.ts`
- Formatters: `fieldFormatters.ts`, `errorMessages.ts`
- Validators: `validation/*.ts` (pure input → boolean/error)
- Constants: `constants.ts`, `colors.ts`, `countryUtils.ts`
- Test helpers: `testHelpers/`, `testData.ts`

## What belongs in services/ (NOT utils/)
- Anything with state or storage (MMKV, Keychain, WatermelonDB)
- Anything with lifecycle (init, connect, disconnect)
- Anything that coordinates multiple operations
- Anything with 5+ files in a subdirectory

## Exceptions
- `theme.ts` uses reactive state for dark mode — OK because it's a React hook re-exported from hooks/
- `piiSanitizer.ts` manages a field list — borderline but stateless (list is constant)

## Anti-patterns
- `new MMKV({ id: 'custom' })` in utils — belongs in a service
- `performanceOptimization/` (5 files, own MMKV) — is a service, not a utility
- `automation/` (6 files) — duplicates `src/services/automation/`
- `portal/` (5 files, detection logic) — overlaps `src/services/portal/`

## Enforcement
- No structural test yet — story #853 pending
- Manual review during `/knowledge-audit`
