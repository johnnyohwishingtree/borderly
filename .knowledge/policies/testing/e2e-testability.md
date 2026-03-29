# Policy: E2E Testability

## Scope
src/components/, src/screens/, e2e/mobile/

## Rules

### testID naming
- REQUIRE: every interactive element has a `testID`
- REQUIRE: suffix indicates function:
  - `-button` for all tappable actions (buttons, pressable rows, links)
  - `-field` for all form fields (Input, SearchableSelect, DatePickerField, AccommodationAutocomplete, AddressAutocomplete)
  - `-container` for non-interactive wrappers that need identification
- REQUIRE: screen prefix for disambiguation: `<screen>-<name>-<suffix>` (e.g., `create-trip-name-field`, `passport-continue-button`)
- REQUIRE: dynamic testIDs use `${index}`: `leg-${index}-arrival-field`
- DENY: suffix-less testIDs (e.g., `demo-scan-adult`) — must be `demo-scan-adult-button`
- DENY: misleading suffixes (e.g., `-input` for a SearchableSelect) — use `-field`
- DENY: hardcoded index in source testIDs (`leg-0-*`) — use `leg-${index}-*`

### testID declaration
- REQUIRE: one `testIDs.ts` file per screen directory — single source of truth
- REQUIRE: screens and components import testIDs from this file
- REQUIRE: testIDs file exports a typed constant with `id` and `type` per entry
- DENY: inline testID strings in JSX (`testID="my-button"`) — import from testIDs.ts
- DENY: `testID: "..."` in prop objects — use the constant

### E2E test maintenance
- REQUIRE: update `e2e/mobile/full-e2e.test.ts` after any UI text/testID changes
- REQUIRE: interactive elements are accessible via mobilecli (accessibility tree)
- DENY: text-based taps when testID is available — use testID-based

### Screen layout metadata
- REQUIRE: every screen's testIDs.ts declares `zone` for elements outside the scroll area
- REQUIRE: `zone: 'header'` for elements fixed at top (always visible)
- REQUIRE: `zone: 'footer'` for elements fixed at bottom (outside ScrollView)
- REQUIRE: `zone: 'scroll'` (or omit — default) for elements inside ScrollView
- REQUIRE: screenRegistry includes `ScreenLayout` with `scrollable`, `fitsOnScreen`, `elementOrder`
- REQUIRE: `ScreenLayout` is auto-inferred by the generator from source code (ScrollView detection, element count, testID order)
- REQUIRE: structural test verifies generated registry matches source — catches layout drift
- DENY: blind scrolling — emitter must check screen layout before scrolling
- DENY: manual layout maps or overrides for scrollable/fitsOnScreen — always derived from source
- DENY: hardcoding scroll behavior in journey definitions when the emitter can infer it from layout

## testIDs.ts Format
```typescript
// src/screens/trips/LegFormScreen/testIDs.ts
import type { TestMeta } from '@/types/testMeta';

export const LEG_FORM_IDS: Record<string, TestMeta> = {
  smartDeltaButton: { id: 'smart-delta-button', type: 'button', zone: 'header' },
  dynamicForm: { id: 'dynamic-form', type: 'container', zone: 'scroll' },
  saveProgressButton: { id: 'save-progress-button', type: 'button', zone: 'footer' },
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

## Debugging E2E Failures

1. Check the saved screenshots in `e2e/screenshots/` — they're captured at each step
2. Read the test console output for the failing step
3. Use mobile-mcp `save_screenshot` for live debugging (never `take_screenshot`)
4. Read source code for testIDs before interacting with the simulator

## Anti-patterns
- `<Pressable onPress={...}>` without testID — invisible to mobilecli
- Updating screen UI without updating testIDs.ts
- Inline testID strings in JSX — drift when refactored
- `-input` suffix for a SearchableSelect — misleading suffix; use `nationality-field`
- Suffix-less testIDs — parser can't classify; use `demo-scan-adult-button`
- `testID: "..."` in prop objects — use constant import
- Keychain access groups on simulator without provisioning — use `USE_SHARED_ACCESS_GROUP` flag

## Enforcement
- `e2e/mobile/full-e2e.test.ts — mobilecli-based E2E
- `__tests__/structure/component-testids.test.ts` — interactive elements have testID

## References
- Related: policies/testing/drift-detection.md
- Related: policies/testing/test-conventions.md

## Derives From
- `principles/naming-enables-enforcement.md`
- `principles/source-of-truth-prevents-drift.md`
- `facts/craft/naming-enables-automation.md`
- `facts/craft/tests-are-specifications.md`
