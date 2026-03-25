# E2E Testability Conventions

How to write UI code that keeps Maestro E2E tests in sync automatically.

## Core principle

The screen source code, the screenRegistry, and the generated Maestro flows must never drift. This is achieved by:
1. Following testID conventions in source → registry validates against source at `pnpm test` time
2. Updating the registry when UI changes → generator produces correct flows
3. All flows generated from journeys → no hand-maintained YAML to forget

## testID naming conventions

Every interactive element needs a `testID`. Follow these patterns:

| Element type | Pattern | Example |
|---|---|---|
| Button | `<action>-button` | `create-trip-button`, `skip-biometric-button` |
| Input field | `<field-name>-input` | `trip-name-input`, `surname-input` |
| SearchableSelect | `<field-name>-input` | `nationality-input` (generates `-trigger`, `-search`, `-option-*`) |
| DatePickerField | `<field-name>` | `leg-0-arrival-date` (generates `-container`) |
| Dynamic per-index | `<context>-${index}-<field>` | `leg-${index}-arrival-date` |
| Card | `<type>-card-<identifier>` | `trip-card-${trip.name}`, `leg-card-${countryCode}` |

## Component sub-testID propagation

Components that wrap interactive elements derive sub-testIDs from their `testID` prop:

| Component | testID prop | Generated sub-testIDs |
|---|---|---|
| SearchableSelect | `nationality-input` | `-trigger`, `-search`, `-option-{CODE}` |
| AddressAutocomplete | `accommodation-address` | `-line1`, `-line2`, `-city`, `-state`, `-postal-code`, `-country` |
| DatePickerField | `arrival-date` | `-container` |
| AccommodationAutocomplete | `accommodation-name` | (same as Input — no sub-testIDs) |

When building a new component with internal interactive elements, derive sub-testIDs from the parent `testID` prop using the `${testID}-<suffix>` pattern. This lets the registry and generator predict the testIDs without reading the component source.

## Screen registry as source of truth

`maestro/generator/screenRegistry.ts` is the single source of truth for what each screen contains. It maps:
- `waitFor` — text that identifies the screen
- `fields` — ordered interactive fields with testIDs and component types
- `actionButtons` — buttons with testIDs
- `alerts` — alert dialogs with titles, buttons, and outcomes
- `navigatesTo` — downstream screens

### When to update the registry

**Any** change to a screen's interactive elements requires a registry update:
- Adding/removing a button or field
- Changing a testID
- Changing button text (label)
- Changing alert titles or button labels
- Changing component type (e.g., Input → SearchableSelect)
- Changing navigation targets

### After updating the registry

1. Run `pnpm maestro:generate` to regenerate flows
2. Update hand-written subflows in `maestro/flows/subflows/` if they reference changed elements
3. `pnpm test` will catch any remaining drift via `maestro-registry-sync.test.ts`

## Journey definitions over hand-written flows

Prefer generated flows over hand-written YAML:
- **Generated** (`maestro/flows/generated/`) — produced by `pnpm maestro:generate` from journey definitions. Stay in sync when registry updates.
- **Hand-written** (`maestro/flows/subflows/`) — manually maintained. Drift when UI changes. Use only for flows the generator can't express (e.g., complex conditional logic).

To add a new E2E flow:
1. Create a journey in `maestro/generator/journeys/<name>.ts`
2. Use DSL helpers: `fillField()`, `tapButton()`, `handleAlert()`, `screenStep()`
3. Export from `maestro/generator/journeys/index.ts`
4. Run `pnpm maestro:generate`

## Drift detection

`maestro-registry-sync.test.ts` runs at `pnpm test` time and catches:
- Registry testIDs that don't exist in source (stale entries)
- Hand-written subflows referencing testIDs not in source
- Dynamic testID templates that don't match source patterns

This means drift is caught in 0.4 seconds, not at Maestro runtime (3+ minutes).

## Anti-patterns
- **Text-based taps** (`tapOn: "Submit"`) — breaks when button text changes. Always use testID-based taps.
- **Hand-writing Maestro YAML** for flows the generator can handle — drifts on the next UI change
- **Adding an interactive element without a testID** — invisible to Maestro and the registry
- **Using `style={{}}` testID-like attributes** — only `testID` prop is visible to Maestro
- **Hardcoded index in testIDs** (`leg-0-arrival-date` in source) — use `leg-${index}-arrival-date` so it works for any leg
- **Forgetting to run `pnpm maestro:generate`** after registry updates — generated flows will be stale
