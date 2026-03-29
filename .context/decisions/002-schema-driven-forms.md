# Decision: Schema-Driven Form Engine

## Status
Accepted

## Context
Each country has a unique customs/immigration form with different fields, validation rules, and portal-specific value mappings. Building per-country React Native screens doesn't scale.

## Decision
Country forms are defined as JSON schema files (`src/schemas/<ISO>.json`) rendered by a single `DynamicForm` component. Adding a new country requires only a JSON file and a knowledge file — no new React components.

Auto-fill uses dot-notation paths (`profile.passportNumber`, `leg.arrivalDate`) resolved at form generation time. Country-specific enum values are mapped via `autoFillMapping`.

## Derives from
- `facts/domain/every-country-unique-rules.md`
- `facts/domain/field-semantics-stable-labels-vary.md`
- `facts/customer/multi-leg-trips-are-common.md`
- `facts/craft/caching-trades-freshness-for-speed.md`
- `facts/organizational/schema-first-development.md`
- `principles/declarative-over-imperative.md`
- `beliefs/schema-driven-forms-scale.md`

## Consequences
- Adding a country is a data task, not a code task
- Schema changes don't require app rebuilds (OTA updates via manifest)
- DynamicForm must handle all field types any country might need
- Complex portal interactions (multi-page wizards) are harder to express in JSON
