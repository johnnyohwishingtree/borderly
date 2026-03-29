# Principle: Single Source of Truth Prevents Drift

Every piece of derived data should trace to exactly one source. testIDs.ts (with TestMeta) is the source for E2E test element discovery. Schema JSON is the source for form rendering and tests. When the source changes, derived artifacts are regenerated — not manually maintained.

## Derives from
- `facts/craft/naming-enables-automation.md`
- `facts/craft/tests-are-specifications.md`

## Implemented by
- `policies/testing/drift-detection.md`
- `policies/testing/e2e-testability.md` (testIDs.ts per screen)
- `patterns/add-country.md` (schema-first workflow)
- `src/types/testMeta.ts` → `testIDs.ts` → `e2e/mobile/full-e2e.test.ts` (single chain)
