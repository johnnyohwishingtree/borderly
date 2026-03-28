# Principle: Declarative Over Imperative

Configuration in JSON schemas and TypeScript objects is preferred over hardcoded conditional logic. Declarative definitions can be validated, tested, and extended without modifying the engine that processes them. This is why country forms are JSON schemas rendered by one component, not per-country screen code.

## Derives from
- `facts/domain/every-country-unique-rules.md`
- `facts/domain/field-semantics-stable-labels-vary.md`
- `facts/organizational/schema-first-development.md`
- `facts/craft/naming-enables-automation.md`

## Implemented by
- `policies/data/schema-fields.md` (schema structure rules)
- `policies/architecture/testable-architecture.md` (greppable conventions)
- `beliefs/schema-driven-forms-scale.md`
