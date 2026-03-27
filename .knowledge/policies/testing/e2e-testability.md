# Policy: E2E Testability

## Scope
src/components/, src/screens/, maestro/

## Rules

### testID naming
- REQUIRE: every interactive element has a `testID`
- REQUIRE: suffix indicates function:
  - `-button` for all tappable actions (buttons, pressable rows, links)
  - `-field` for all form fields (Input, SearchableSelect, DatePickerField, AccommodationAutocomplete, AddressAutocomplete)
  - `-container` for non-interactive wrappers that need identification
- REQUIRE: screen prefix for disambiguation: `<screen>-<name>-<suffix>` (e.g., `create-trip-name-field`, `passport-continue-button`)
- REQUIRE: dynamic testIDs use `${index}`: `leg-${index}-arrival-field`
- DENY: suffix-less testIDs (`demo-scan-adult`) — must be `demo-scan-adult-button`
- DENY: misleading suffixes (`nationality-input` for a SearchableSelect) — use `-field`
- DENY: hardcoded index in source testIDs (`leg-0-*`) — use `leg-${index}-*`

### testID declaration
- REQUIRE: one `testIDs.ts` file per screen directory — single source of truth
- REQUIRE: screens and components import testIDs from this file
- REQUIRE: testIDs file exports a typed constant with `id` and `type` per entry
- DENY: inline testID strings in JSX (`testID="my-button"`) — import from testIDs.ts
- DENY: `testID: "..."` in prop objects — use the constant

### Registry and generation
- REQUIRE: `screenRegistry.ts` is auto-generated from testIDs.ts files
- REQUIRE: `pnpm maestro:generate` after any UI text/testID changes
- REQUIRE: typed text commits on blur (components must work for Maestro, not just users)
- DENY: hand-writing Maestro YAML when the generator can handle it
- DENY: text-based taps (`tapOn: "Submit"`) — use testID-based

## testIDs.ts Format
```typescript
// src/screens/trips/CreateTripScreen/testIDs.ts
export const CREATE_TRIP_IDS = {
  nameField: { id: 'create-trip-name-field', type: 'Input' as const },
  countryField: { id: 'create-trip-country-field', type: 'SearchableSelect' as const },
  arrivalDateField: { id: 'leg-${index}-arrival-field', type: 'DatePickerField' as const, dynamic: true as const },
  createButton: { id: 'create-trip-button', type: 'button' as const },
};
```

## Component Sub-testID Propagation
| Component | Parent testID | Generated sub-testIDs |
|---|---|---|
| SearchableSelect | `nationality-field` | `-trigger`, `-search`, `-option-{CODE}` |
| AddressAutocomplete | `accommodation-address-field` | `-line1`, `-city`, `-postal-code`, `-country` |
| DatePickerField | `arrival-field` | `-container` |
| AccommodationAutocomplete | `accommodation-name-field` | `-input`, `-suggestions` |

## Exceptions
- Non-interactive display components don't need testIDs
- Option testIDs in SearchableSelect are data-driven (country codes)

## Debugging Maestro Failures

When a flow fails, check app logs BEFORE screenshots:
```bash
xcrun simctl spawn booted log show --last 2m --predicate 'process == "Borderly"' | grep -i "error\|exception\|fail"
```

## Anti-patterns
- `<Pressable onPress={...}>` without testID — invisible to Maestro
- `tapOn: "City"` in Maestro flow — breaks when label text changes
- Updating screen UI without updating testIDs.ts
- Inline testID strings in JSX — drift when refactored
- `nationality-input` for a SearchableSelect — misleading suffix
- `demo-scan-adult` with no suffix — parser can't classify
- `testID: "..."` in prop objects — use constant import
- Debugging Maestro failures by screenshot alone — check simulator logs first
- Keychain access groups on simulator without provisioning — use `USE_SHARED_ACCESS_GROUP` flag

## Enforcement
- `__tests__/structure/maestro-registry-sync.test.ts` — registry ↔ source sync
- `__tests__/structure/component-testids.test.ts` — interactive elements have testID

## References
- Related: policies/testing/drift-detection.md
- Related: policies/testing/test-conventions.md
