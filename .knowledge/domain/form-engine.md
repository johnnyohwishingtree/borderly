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

## Smart components
When a specialized component exists for a field type, ALWAYS use it instead of plain `<Input>`:
- `AccommodationAutocomplete` — for hotel/accommodation name fields (Apple MapKit on iOS, Photon on Android)
- `AddressAutocomplete` — for address fields (Apple MapKit on iOS, Photon on Android)
- `DatePickerField` — for date fields
- `SearchableSelect` — for dropdown fields with search

Plain Input loses autocomplete, platform autofill hints, and API-powered suggestions.

### Smart component wiring checklist
When using a smart component, check ALL its props — not just `value` and `onChange`:
- `AccommodationAutocomplete`: wire `onAddressResolved` to auto-fill the `AddressAutocomplete` below it. Wire `countryHint` to the leg's destination country so search results are scoped.
- `AddressAutocomplete`: wire `onAddressChange` to update the full address object (line1, city, state, postalCode, country).
- `SearchableSelect`: wire `options` with `{ value: code, label: name }` format — `onValueChange` returns the `value` (code), not the label.

## Multi-traveler model
Travelers are assigned per-leg, not per-trip. Each `TripLeg` has an optional `assignedTravelers: string[]` (profile IDs) and `travelerFormsData: TravelerFormData[]` for per-traveler form state. There is no `Trip.travelers` field — the trip itself doesn't own traveler assignments.

## Anti-patterns
- **Plain `<Input>` for hotel/address fields** — always use `AccommodationAutocomplete` or `AddressAutocomplete`
- **Validating dates with `isValidTravelDate()`** for non-travel dates — use `isValidISODate()` for DOB, passport expiry
- **Ignoring `autoFillSource`** — if a schema field has it, the engine handles it; don't manually set values
- **Hardcoding country-specific logic in the form engine** — put it in the country schema JSON instead
- **Showing all 30+ fields** — the smart delta should reduce to 3-5 manual fields; if users see more, auto-fill is broken
