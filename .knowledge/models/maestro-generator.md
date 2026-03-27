# Model: Maestro Generator

The E2E test flow generation system. Produces Maestro YAML from TypeScript journey definitions using screen metadata.

## Entities

### screenRegistry.ts
- Auto-generated from source files by `scripts/generate-screen-registry.ts --write`
- Per-screen: fields (testID, componentType, required), actionButtons, alerts, navigatesTo, waitFor, notes
- Human-authored fields (waitFor, notes, alerts) preserved via `registry-overrides.json`
- Reads sub-component files in same directory (e.g., `CreateTripScreen.Destinations.tsx`)
- Matches 3 testID patterns: `testID="..."`, `testID: "..."`, `` testID={`...`} ``

### registry-overrides.json
- Human-authored alerts, waitFor, and notes that can't be parsed from source
- Merged into auto-generated registry during generation
- Edit this file when adding alerts or screen identification text

### Journey definitions (journeys/*.ts)
- TypeScript files composing screen steps into user flows
- Use DSL helpers: `tap()`, `fill()`, `select()`, `date()`, `alert()`, `assertVisible()`
- Use journey builder: `screenStep()`, `tapButton()`, `fillField()`, `handleAlert()`
- Reusable via function composition: `onboardingDemoScan.steps`, `createJapanTripSteps()`

### Emitter (emitter.ts)
- Converts Journey objects into Maestro YAML
- Scroll behavior per action type:
  - `tap()` — NO scroll by default. Pass `{ scroll: true }` for buttons below the fold
  - `tapButton()` — scrolls (buttons can be anywhere on form)
  - `fill()` — scrolls (form fields often below fold)
  - `select()` — scrolls
  - `date()` — scrolls + retry tap if picker doesn't open (scroll animation can swallow first tap)
- `scrollUntilVisible` settings: 30% visibility, 15s timeout, centerElement enabled

### DSL (dsl.ts)
- Type-safe action builders: `tap`, `fill`, `select`, `date`, `alert`, `assertVisible`, `conditional`, `swipe`
- Step and journey builders: `step()`, `journey()`

### Component Catalog (componentCatalog.ts)
- Interaction patterns per UI component type
- Sub-testIDs, keyboard behavior, modal vs inline rendering
- Used by journey builder to determine correct DSL action for each field

## Relationships
```
Journey definitions ──use──→ DSL helpers
Journey definitions ──use──→ Journey builder ──reads──→ screenRegistry
screenRegistry ──generated-by──→ generate-screen-registry.ts ──reads──→ source files
screenRegistry ──merges──→ registry-overrides.json
Emitter ──converts──→ Journey → YAML flows
```

## Invariants
- Only 2 flows: `demo-scan-smoke` (quick sanity) and `full-e2e` (complete journey)
- Zero hand-written YAML — all flows generated from journey definitions
- screenRegistry regenerated after screen changes: `npx tsx scripts/generate-screen-registry.ts --write`
- Flows regenerated after journey or registry changes: `pnpm maestro:generate`
- testIDs follow naming convention: `-button` for actions, `-field` for form fields

## Key Files
- `maestro/generator/screenRegistry.ts` — auto-generated screen metadata
- `maestro/generator/registry-overrides.json` — human-authored alerts/waitFor
- `maestro/generator/journeys/*.ts` — journey definitions
- `maestro/generator/emitter.ts` — YAML emitter with scroll behavior
- `maestro/generator/dsl.ts` — type-safe action builders
- `maestro/generator/journeyBuilder.ts` — registry-aware step builder
- `maestro/generator/componentCatalog.ts` — component interaction patterns
- `maestro/flows/generated/*.yaml` — generated flows (don't edit)
- `scripts/generate-screen-registry.ts` — registry auto-generator
