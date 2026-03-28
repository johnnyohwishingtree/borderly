# Model: Maestro Generator

The E2E test flow generation system. Produces Maestro YAML from TypeScript journey definitions using screen metadata. Deterministic — given the same registry + journey, the same YAML is always produced.

## Entities

### TestMeta (src/types/testMeta.ts)
- Extensible metadata for testIDs — the single type all testIDs.ts files use
- Fields: `id` (string), `type` (button/Input/SearchableSelect/...), `zone` (scroll/header/footer)
- Components use `testID={meta.id}` — only the id string reaches React Native
- Generator reads the full object for zone, type, and future metadata
- Adding new metadata: add a field to TestMeta, generator picks it up. No component changes.

### testIDs.ts (per screen directory)
- Declares all testIDs for a screen with their TestMeta
- Zones indicate position: `scroll` (in ScrollView), `header` (fixed top), `footer` (fixed bottom)
- Source of truth for the registry — generator reads these files

### screenRegistry.ts
- Auto-generated from source files by `scripts/generate-screen-registry.ts --write`
- Per-screen: layout (scrollable, fitsOnScreen, elementOrder), fields, actionButtons, alerts, navigatesTo, waitFor, notes
- `ScreenLayout` tells the emitter whether to scroll: `fitsOnScreen: true` → never scroll
- Human-authored fields (waitFor, notes, alerts, layout overrides) preserved via `registry-overrides.json`

### registry-overrides.json
- Human-authored alerts, waitFor, notes, and layout overrides
- Merged into auto-generated registry during generation
- Use for: alerts (can't be parsed from source), layout corrections, waitFor text

### Journey definitions (journeys/*.ts)
- TypeScript files composing screen steps into user flows
- Use DSL helpers: `tap()`, `fill()`, `select()`, `date()`, `alert()`, `assertVisible()`, `eraseText()`
- Use journey builder: `screenStep()`, `tapButton()`, `fillField()`
- Reusable via function composition: `onboardingDemoScan.steps`, `createMalaysiaTripSteps()`

### Emitter (emitter.ts)
- Converts Journey objects into Maestro YAML
- **Screen-aware**: receives screen context (ScreenLayout) for each step
- Scroll decision is deterministic via `shouldScroll()`:
  1. Explicit `scroll: false/true` on action → respect it (manual override)
  2. `fitsOnScreen: true` → never scroll (single-page screen)
  3. `scrollable: false` → never scroll
  4. Zone is header/footer → never scroll
  5. Zone is scroll → scrollUntilVisible
- No guessing, no blind swiping

### DSL (dsl.ts)
- Type-safe action builders with optional `{ scroll }` override
- Step and journey builders: `step()`, `journey()`

### Diagnostic script (scripts/diagnose-maestro.sh)
- One command collects: screenshot, failing step, visible testIDs from accessibility tree, app logs
- Run after any Maestro failure: `scripts/diagnose-maestro.sh`

## Relationships
```
testIDs.ts ──declares──→ TestMeta (id, type, zone)
generate-screen-registry.ts ──reads──→ testIDs.ts + source files → screenRegistry.ts
registry-overrides.json ──merges into──→ screenRegistry.ts
Journey definitions ──use──→ DSL helpers + Journey builder ──reads──→ screenRegistry
Emitter ──reads──→ screenRegistry.layout → decides scroll behavior
Emitter ──converts──→ Journey → YAML flows
```

## Invariants
- Only 2 flows: `demo-scan-smoke` (quick sanity) and `full-e2e` (complete journey)
- Zero hand-written YAML — all flows generated from journey definitions
- Emitter scroll behavior is deterministic — derived from screen layout metadata
- screenRegistry regenerated after screen changes: `npx tsx scripts/generate-screen-registry.ts --write`
- Flows regenerated after journey or registry changes: `pnpm maestro:generate`
- testIDs follow naming convention: `-button` for actions, `-field` for form fields

## Key Files
- `src/types/testMeta.ts` — extensible testID metadata type
- `src/screens/*/testIDs.ts` — per-screen testID declarations with zones
- `maestro/generator/screenRegistry.ts` — auto-generated screen metadata with layout
- `maestro/generator/registry-overrides.json` — human-authored overrides
- `maestro/generator/journeys/*.ts` — journey definitions
- `maestro/generator/emitter.ts` — screen-aware YAML emitter
- `maestro/generator/dsl.ts` — type-safe action builders
- `maestro/generator/journeyBuilder.ts` — registry-aware step builder
- `maestro/flows/generated/*.yaml` — generated flows (don't edit)
- `scripts/generate-screen-registry.ts` — registry auto-generator
- `scripts/diagnose-maestro.sh` — failure diagnosis tool
