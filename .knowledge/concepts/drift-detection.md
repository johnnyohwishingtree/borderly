# Drift Detection

When source changes, derived artifacts must stay in sync.

## Applies to
- testIDs in source ↔ Maestro E2E flows that reference them
- Button/label text in source ↔ Maestro flows that tap by text
- Country schema fields ↔ form rendering tests
- CLI/API changes ↔ README documentation
- File renames/moves ↔ references in .md and .yaml files
- Native module additions ↔ web mocks in e2e/mocks/ + webpack aliases
- Schema autoFillSource paths ↔ profile data model

## How to prevent
- After renaming/moving files: grep for old paths in all .md and .yaml files
- After adding native modules: add web mock + webpack alias + pod install
- Maestro drift detection tests exist in `maestro-drift.test.ts`

## Maestro generator
Maestro flows are generated from declarative journey definitions, NOT hand-written.

**After changing any screen UI text, testIDs, or navigation:**
1. Update `maestro/generator/screenRegistry.ts` with new text/testIDs/buttons
2. Update the relevant journey in `maestro/generator/journeys/`
3. Run `pnpm maestro:generate` to regenerate flows
4. Commit the updated generated flows

Never hand-edit files in `maestro/flows/generated/` — they get overwritten by the generator. Hand-written flows in `maestro/flows/subflows/` must be updated manually.

