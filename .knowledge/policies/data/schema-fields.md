# Policy: Schema Fields

## Scope
src/schemas/*.json, src/services/forms/, src/services/schemas/

## Rules
- REQUIRE: fields with profile data have `autoFillSource` (dot-notation path)
- REQUIRE: fields without profile data set `countrySpecific: true`
- REQUIRE: date fields use `type: "date"` (not `type: "text"`)
- REQUIRE: dropdown fields use `type: "searchable_select"` (not `type: "select"`)
- REQUIRE: dropdown fields have `options` array matching the portal's exact labels
- REQUIRE: fields with country-specific enums have `autoFillMapping` (canonical → portal value)
- REQUIRE: `autoFillMapping` includes `_default` fallback key
- DENY: hardcoding country-specific logic in the form engine — put in schema JSON

## Exceptions
- `type: "boolean"` for checkbox fields (no dropdown needed)
- `type: "textarea"` for multi-line free text
- Free-text fields on portals (verified) stay as `type: "text"`

## Anti-patterns
- `type: "text"` for a field that's a dropdown on the real portal
- Missing `autoFillMapping` when canonical value differs from portal label
- `autoFillSource: "profile.occupation"` without mapping for country-specific enums
- Schema field that doesn't match the portal's actual field type

## Enforcement
- `__tests__/schemas/schemaValidation.test.ts` — validates all schemas
- Per-country tests in `__tests__/schemas/<ISO>.test.ts`

## References
- Related: models/form-engine.md
- Related: patterns/add-country.md

## Derives From
- `principles/declarative-over-imperative.md`
- `facts/domain.md#f:domain:every-country-unique-rules`
- `facts/domain.md#f:domain:field-semantics-stable-labels-vary`
- `facts/domain.md#f:domain:boolean-fields-default-false`
- `facts/organizational.md#f:org:schema-first-development`
- `facts/tool.md#f:tool:searchable-select-for-long-lists`
