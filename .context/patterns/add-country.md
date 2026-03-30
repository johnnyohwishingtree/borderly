# Pattern: Add a New Country Schema

## Policies to follow
- `__tests__/schemas/schemaValidation.test.ts` — field types, autoFillSource, autoFillMapping
- `__tests__/structure/component-testids.test.ts` — drift detection, schema ↔ form rendering sync
- `src/types/schema.ts` — entity types for schemas and fields

## Step 0: Audit the real portal

Before writing any code, document every field on the country's immigration/customs portal. This is the source of truth for the schema.

### What to capture per field:
- **Field label** (exact text on the portal)
- **Field type**: text input, dropdown, checkbox, radio, date picker
- **Options** (if dropdown/radio): exact option labels in the portal's language
- **Required or optional**
- **Validation rules** (character limits, format patterns like phone/postal)
- **Section/page** the field appears on

### Where to document:
Create `.context/external/countries/<iso>.md` with:
- Portal name and URL
- List of all screens/pages in the portal flow
- Field inventory table with the metadata above
- Any country-specific quirks (e.g., Japan requires separate entry for each family member)

### For dropdown fields with country-specific options:
Add `autoFillMapping` to translate Borderly's canonical enums to the portal's values:
```json
{
  "id": "occupation",
  "type": "searchable_select",
  "options": ["Company employee", "Government employee", "Self-employed", ...],
  "autoFillSource": "profile.occupation",
  "autoFillMapping": {
    "Software Developer": "Company employee",
    "Student": "Student",
    "_default": "Other"
  }
}
```

## Step 1: `src/schemas/<ISO>.json` — Country schema

Build the schema from the portal audit, NOT by copying another country's schema. Every field needs:
- `id`, `label`, `type`, `required`, `section`
- `autoFillSource` — dot-notation path to profile data (e.g., `profile.passport.number`)
- `type` must match the portal: `searchable_select` for dropdowns, `date` for dates, `boolean` for checkboxes
- `options` array for dropdown fields — must match the portal's exact option labels
- `autoFillMapping` for fields where Borderly's canonical values differ from the portal's
- `portalFieldName` — the exact label text shown on the government portal (used by AutoFill field matcher)

### Standardized field IDs
Use these canonical field IDs across all schemas for consistency. The AutoFill field matcher relies on them:

| Profile field | Canonical ID | Avoid |
|---|---|---|
| Given/first name | `givenNames` | `firstName`, `givenName` |
| Surname | `surname` | `lastName`, `familyName` |
| Date of birth | `dateOfBirth` | `dob`, `birthDate` |
| Passport number | `passportNumber` | `passport`, `passNumber` |
| Email | `email` | `emailAddress` |
| Phone | `phoneNumber` | `phone`, `tel` |

Note: The AutoFill field matcher (`src/services/forms/fieldMatcher.ts`) handles legacy aliases, but new schemas should always use canonical IDs.

## Step 2: `src/services/schemas/schemaRegistry.ts` — Register schema

Add the new ISO code to the registry.

## Step 3: `__tests__/schemas/<ISO>.test.ts` — Schema validation tests

Verify all fields have autoFillSource, types are valid, dropdown fields have options, required fields are present.

## Step 4: `.context/external/countries/<iso>.md` — Country knowledge

Update with portal field documentation from Step 0.

## Step 5: `src/services/submission/mappings/<ISO>.ts` — Submission mapping

Create a mapping file that connects schema field IDs to the portal's HTML selectors.

**Critical constraint:** The mapping object keys MUST match the schema field IDs exactly (the same `id` values used in the JSON schema's `sections[].fields[].id`). The `submissionCoordinator.ts` looks up mappings via `automationScript.fieldMappings[field.id]` — if the key doesn't match, auto-fill silently skips the field.

Add test in `__tests__/services/submission/mappings/<ISO>.test.ts` following the JPN test pattern.

## Step 6: E2E tests

Add form rendering test verifying DynamicForm loads the schema correctly.

## Checklist
- [ ] Portal audited — all fields documented in country knowledge file
- [ ] Dropdown fields use `searchable_select` with exact portal options
- [ ] `autoFillMapping` added for fields with country-specific enums
- [ ] All fields have `autoFillSource`
- [ ] Date fields use `type: "date"`
- [ ] Schema registered in schemaRegistry
- [ ] Schema validation tests pass
- [ ] E2E form rendering test added
- [ ] Submission mapping keys match schema field IDs exactly
- [ ] Submission mapping test validates fields against schema
- [ ] Country knowledge file updated
