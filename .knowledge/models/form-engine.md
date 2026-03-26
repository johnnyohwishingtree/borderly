# Model: Form Engine

The core algorithm. Takes profile + trip leg + country schema → produces a filled/partial form.

## Entities

### Schema
- Lives in: `src/schemas/<ISO>.json`
- Fields: `sections[]`, each with `fields[]`
- One per country (JPN, USA, MYS, etc.)

### Field
- Properties: `id`, `label`, `type`, `required`, `section`, `countrySpecific`
- Types: `text`, `searchable_select`, `date`, `boolean`, `number`, `textarea`, `address`
- Optional: `autoFillSource`, `autoFillMapping`, `options`, `validation`, `portalFieldName`

### AutoFillSource
- Dot-notation path to profile data: `profile.passportNumber`, `profile.occupation`
- Resolved by `fieldMapper.ts` at form generation time

### AutoFillMapping
- Translates canonical enum values to country-specific portal labels
- Format: `{ "Software Developer": "company_employee", "_default": "other" }`
- Applied after autoFillSource resolution in `autoFillLogic.ts`

## Relationships
```
Schema 1──* Section 1──* Field
Field *──1 AutoFillSource (optional)
Field *──1 AutoFillMapping (optional, for enum fields)
Field *──* Option (for searchable_select/select types)
```

## Invariants
- Every field with profile data has `autoFillSource`
- Every field without profile data has `countrySpecific: true`
- Dropdown fields use `searchable_select` with portal-matching `options`
- Date fields use `type: "date"`
- `autoFillMapping` includes `_default` fallback

## Smart Components
| Field scenario | Component | Why |
|---|---|---|
| Hotel/accommodation name | `AccommodationAutocomplete` | Apple MapKit search + address resolution |
| Address fields | `AddressAutocomplete` | Apple MapKit + structured sub-fields |
| Date fields | `DatePickerField` | Column picker modal |
| Dropdown fields | `SearchableSelect` | Searchable with option list |

### Smart Component Wiring
- `AccommodationAutocomplete`: wire `onAddressResolved` + `countryHint`
- `AddressAutocomplete`: wire `onAddressChange` for full address object
- `SearchableSelect`: `onValueChange` returns option `value`, not `label`

## Key Files
- `src/services/forms/formEngine.ts` — main engine
- `src/services/forms/fieldMapper.ts` — dot-notation resolver
- `src/services/forms/autoFillLogic/` — intelligent auto-fill
- `src/services/forms/validators.ts` — Zod validation
- `src/schemas/*.json` — country schemas
- `src/components/forms/DynamicForm.tsx` — renders schemas
