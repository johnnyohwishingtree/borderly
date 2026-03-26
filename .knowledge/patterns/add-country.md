# Pattern: Add a New Country Schema

## Policies to follow
- `.knowledge/policies/data/schema-fields.md` — field types, autoFillSource, autoFillMapping
- `.knowledge/policies/testing/drift-detection.md` — schema ↔ form rendering sync
- `.knowledge/models/form-engine.md` — entity model for schemas and fields

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
Create `.knowledge/domain/countries/<iso>.md` with:
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

## Step 4: `.knowledge/domain/countries/<iso>.md` — Country knowledge

Update with portal field documentation from Step 0.

## Step 5: E2E tests

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
- [ ] Country knowledge file updated
