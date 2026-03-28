# Belief: Schema-driven forms scale better than hardcoded screens

## Status
Confirmed

## Statement
Using JSON schemas to define country forms (rendered by a single DynamicForm component) scales better than building per-country screen components. Adding a new country should require only a new JSON file and knowledge file, not new React Native screens.

## Evidence
- 14 countries supported with one form renderer — confirms scalability
- Schema changes are data changes, not code changes — faster iteration
- The add-country pattern documents this as a JSON-first workflow
- Country-specific field mappings (autoFillMapping) handle portal variance without code changes

## What would confirm
- Already confirmed — 14 countries prove this works at current scale

## What would invalidate
- A country portal requiring interaction patterns that JSON schemas can't express (e.g., multi-page wizard with conditional branching that varies per field combination)
- Schema complexity exceeding what a single DynamicForm can render correctly
- Performance degradation as schema count grows past ~50 countries

## Referenced by
- `.knowledge/models/form-engine.md` — Schema entity and field types
- `src/components/forms/DynamicForm.tsx` — the single form renderer
- `src/schemas/*.json` — all country schemas
- `.knowledge/patterns/add-country.md` — schema-first workflow
