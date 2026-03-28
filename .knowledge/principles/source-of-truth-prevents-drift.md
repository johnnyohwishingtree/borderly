# Principle: Single Source of Truth Prevents Drift

Every piece of derived data should trace to exactly one source. testIDs.ts (with TestMeta) is the source for screenRegistry, Maestro flows, and scroll behavior. Schema JSON is the source for form rendering and tests. When the source changes, derived artifacts are regenerated — not manually maintained.

## Derives from
- `facts/craft/naming-enables-automation.md`
- `facts/craft/tests-are-specifications.md`

## Implemented by
- `policies/testing/drift-detection.md`
- `policies/testing/e2e-testability.md` (screenRegistry auto-generated from testIDs.ts)
- `patterns/add-country.md` (schema-first workflow)
- `src/types/testMeta.ts` → `testIDs.ts` → `screenRegistry.ts` → `emitter.ts` (single chain)
