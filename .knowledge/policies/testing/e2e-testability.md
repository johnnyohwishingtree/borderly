# Policy: E2E Testability

## Scope
src/components/, src/screens/, maestro/

## Rules
- REQUIRE: every interactive element has a `testID`
- REQUIRE: testID naming: `<action>-button`, `<field>-input`, `<context>-${index}-<field>`
- REQUIRE: components derive sub-testIDs from parent `testID` prop (`${testID}-trigger`, `${testID}-search`)
- REQUIRE: `screenRegistry.ts` is source of truth for all screen testIDs
- REQUIRE: `pnpm maestro:generate` after any UI text/testID changes
- REQUIRE: typed text commits on blur (components must work for Maestro, not just users)
- REQUIRE: `eraseText: 20` before `inputText` in SearchableSelect search fields
- REQUIRE: `centerElement: true` on all `scrollUntilVisible`
- DENY: text-based taps (`tapOn: "Submit"`) — use testID-based
- DENY: hand-writing Maestro YAML when the generator can handle it
- DENY: hardcoded index in source testIDs (`leg-0-*`) — use `leg-${index}-*`

## Component Sub-testID Propagation
| Component | Parent testID | Generated sub-testIDs |
|---|---|---|
| SearchableSelect | `nationality-input` | `-trigger`, `-search`, `-option-{CODE}` |
| AddressAutocomplete | `accommodation-address` | `-line1`, `-city`, `-postal-code`, `-country` |
| DatePickerField | `arrival-date` | `-container` |
| AccommodationAutocomplete | `accommodation-name` | `-input`, `-suggestions` |

## Exceptions
- Non-interactive display components don't need testIDs
- Option testIDs in SearchableSelect are data-driven (country codes)

## Anti-patterns
- `<Pressable onPress={...}>` without testID — invisible to Maestro
- `tapOn: "City"` in Maestro flow — breaks when label text changes
- Updating screen UI without updating `screenRegistry.ts`
- Component that only commits value on suggestion tap (not on blur)

## Enforcement
- `__tests__/structure/maestro-registry-sync.test.ts` — registry ↔ source sync
- `__tests__/structure/component-testids.test.ts` — interactive elements have testID

## References
- Related: policies/testing/drift-detection.md
- Related: policies/testing/test-conventions.md
