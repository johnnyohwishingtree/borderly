# Pattern: Add a New Country Schema

## Files to create/modify (in order)

### 1. `src/schemas/<ISO>.json` — Country schema
Copy an existing schema (e.g., JPN.json) as starter. Every field needs:
- `id`, `label`, `type`, `required`, `section`
- `autoFillSource` — dot-notation path to profile data (e.g., `profile.passport.number`)
- Date fields use `type: "date"`, not `type: "text"`
- Hotel/accommodation fields use `optionsSource: "accommodations"`

### 2. `src/services/schemas/schemaRegistry.ts` — Register schema
Add the new ISO code to the registry.

### 3. `__tests__/schemas/<ISO>.test.ts` — Schema validation tests
Copy existing schema test. Verify all fields have autoFillSource, types are valid, required fields are present.

### 4. E2E tests
Add form rendering test verifying DynamicForm loads the schema correctly.

## Checklist
- [ ] All fields have autoFillSource
- [ ] Date fields use type: "date"
- [ ] Schema registered in schemaRegistry
- [ ] Schema validation tests pass
- [ ] E2E form rendering test added

## Known gaps
