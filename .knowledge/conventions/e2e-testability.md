# E2E Testability Conventions

How to write UI code that keeps Maestro E2E tests in sync automatically.

## Core principle

The screen source code, the screenRegistry, and the generated Maestro flows must never drift. This is achieved by:
1. Following testID conventions in source → registry validates against source at `pnpm test` time
2. Updating the registry when UI changes → generator produces correct flows
3. All flows generated from journeys → no hand-maintained YAML to forget

## Component testability contract

Every interactive component must work for both users AND automated tests. This means:

- **Typed text must commit on blur** — if Maestro types text and moves to the next field, the value must be saved. Components that only commit on suggestion-tap (like autocompletes) need a fallback: commit the raw text if no suggestion was selected when the field loses focus.
- **Modals must be dismissable by testID** — "Done" text is fragile. Add `testID="date-picker-done"` to modal confirm buttons.
- **Dropdowns must close on outside tap** — if Maestro scrolls past a dropdown, it should auto-close, not block the scroll.
- **Auto-focused fields must start empty** — when a SearchableSelect opens and auto-focuses its search input, the input must be empty. Stale text from previous interactions causes "TJapan" / "TUnited States" bugs.

When building a new interactive component, test it with this mental model: "Can Maestro interact with this using only `tapOn`, `inputText`, `eraseText`, `scrollUntilVisible`, and `pressKey`?"

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
- **Hand-written** (`maestro/flows/subflows/`) — manually maintained. Drift when UI changes. Use only for flows the generator can't express.

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

Drift is caught in 0.4 seconds, not at Maestro runtime (3+ minutes).

## Maestro interaction patterns

- **Always `eraseText: 20` before `inputText` in search fields** — stray keystrokes from previous taps/swipes leak into auto-focused TextInputs
- **Use `centerElement: true` on `scrollUntilVisible`** — prevents elements from being found but hidden behind sticky headers
- **Dismiss Fast Refresh banners** — add `runFlow when visible "Fast Refresh disconnected"` handlers
- **Use `pressKey: Enter` + swipe after search input** — dismisses keyboard so options below are tappable
- **Commit text inputs before scrolling** — `pressKey: Enter` or small swipe to blur the field, otherwise typed text may not be saved

## Debugging Maestro failures

When a flow fails:
1. **Read the screenshot** — the `.maestro/tests/<timestamp>/` directory has failure screenshots
2. **Categorize the failure:**
   - **Drift** — testID or text changed in source but not in registry/flow → update registry, regenerate
   - **Interaction** — component needs different interaction than what the flow does (e.g., autocomplete needs suggestion tap, not just inputText) → fix the component's testability contract or the flow interaction
   - **Timing** — element not ready yet → increase timeout, add `extendedWaitUntil`
   - **Scroll** — element behind header or off-screen → use `centerElement: true`, check scroll direction
   - **Stale input** — search field has residual text → add `eraseText` before `inputText`
3. **Fix at the right level:**
   - Component bug (doesn't commit on blur) → fix the component
   - Registry stale → update `screenRegistry.ts`
   - Flow wrong → update journey definition + regenerate
   - Emitter pattern wrong → fix `emitter.ts` (affects ALL generated flows)

## Anti-patterns
- **Text-based taps** (`tapOn: "Submit"`) — breaks when button text changes. Always use testID-based taps.
- **Hand-writing Maestro YAML** for flows the generator can handle — drifts on the next UI change
- **Adding an interactive element without a testID** — invisible to Maestro and the registry
- **Hardcoded index in testIDs** (`leg-0-arrival-date` in source) — use `leg-${index}-arrival-date` so it works for any leg
- **Components that only commit on suggestion tap** — must also commit on blur for testability
- **Forgetting to run `pnpm maestro:generate`** after registry updates — generated flows will be stale
- **Spawning background Maestro processes** — kills stale driver connections, causes "Fast Refresh disconnected"
