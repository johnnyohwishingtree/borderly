# Form Engine

The core algorithm. Takes profile + trip leg + country schema → produces a filled/partial form.

## How it works
1. Load country schema (JSON from `src/schemas/<ISO>.json`)
2. Resolve `autoFillSource` dot-notation paths against the user's profile
3. Identify remaining unfilled fields (the "smart delta")
4. Track fill stats (how much was auto-filled vs manual)

## Smart delta
Most travelers answer 3-5 questions per country instead of 30+. Only country-specific or non-auto-fillable fields are shown.

## Schema structure
Each field has: `id`, `label`, `type`, `required`, `section`, `autoFillSource`. Special field types:
- `searchable_select` with `optionsSource: 'accommodations'` → hotel autocomplete
- `date` → DatePickerField
- `text` → plain Input

## Key files
- `src/services/forms/formEngine.ts` — main engine
- `src/services/forms/fieldMapper.ts` — dot-notation resolver
- `src/services/forms/validators.ts` — Zod validation
- `src/schemas/*.json` — country schemas

## Known gaps

## Smart components
When a specialized component exists for a field type, ALWAYS use it instead of plain `<Input>`:
- `AccommodationAutocomplete` — for hotel/accommodation name fields
- `AddressAutocomplete` — for address fields with Google Places
- `DatePickerField` — for date fields
- `SearchableSelect` — for dropdown fields with search

Plain Input loses autocomplete, platform autofill hints, and API-powered suggestions.
