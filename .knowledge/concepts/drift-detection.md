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
- After changing screen UI: follow `.knowledge/conventions/e2e-testability.md`
- `maestro-registry-sync.test.ts` catches testID drift at `pnpm test` time

