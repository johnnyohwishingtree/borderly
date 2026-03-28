# Principle: Single Source of Truth Prevents Drift

Every piece of derived data should trace to exactly one source. testIDs.ts is the source for screenRegistry and Maestro flows. Schema JSON is the source for form rendering and tests. When the source changes, derived artifacts are regenerated — not manually maintained.

## Derives from
- `facts/domain.md#f:domain:forms-change-without-notice`
- `facts/craft.md#f:craft:naming-enables-automation`
- `facts/craft.md#f:craft:tests-are-specifications`

## Implemented by
- `policies/testing/drift-detection.md`
- `policies/testing/e2e-testability.md` (screenRegistry auto-generated)
- `patterns/add-country.md` (schema-first workflow)
