# src/ — Application Source Code

## Architecture

Borderly is a **local-first** React Native app. All PII stays on-device. See `docs/mvp-proposal.md` for the full spec.

## Directory Structure

| Folder | Purpose |
|--------|---------|
| `app/` | Root component + navigation bootstrap |
| `screens/` | Full-screen navigation targets (one per route, each in a named folder) |
| `components/` | Reusable UI components (organized by domain) |
| `services/` | Business logic, storage, APIs (no React dependencies) |
| `stores/` | Zustand state management |
| `schemas/` | Bundled country form schemas (JSON) |
| `types/` | Shared TypeScript interfaces |
| `hooks/` | Custom React hooks |
| `utils/` | Pure utility functions |
| `constants/` | App-wide constants |
| `styles/` | Shared style definitions |

## Design Patterns

### Storage Tiers

Never store data in the wrong tier:

| Tier | Technology | What goes here |
|------|-----------|----------------|
| **Sensitive** | OS Keychain (`services/storage/keychain.ts`) | Passport data, encryption keys |
| **Structured** | WatermelonDB (`services/storage/database.ts`) | Trips, form data, QR codes |
| **Config** | MMKV (`services/storage/mmkv.ts`) | Preferences, schemas, flags |

### Component Hierarchy

```
screens/       → Full pages, navigation-aware, use stores
components/    → Reusable pieces, receive props, domain-grouped
components/ui/ → Primitive UI atoms (Button, Card, Input, etc.)
```

- Screens can import from `components/`, `stores/`, `services/`, `hooks/`
- Components should NOT import from `screens/` or `stores/` (receive data via props)
- `components/ui/` are pure presentational — no business logic

### Service Layer

Services are plain TypeScript modules (no React). They:
- Own business logic (form engine, MRZ parsing, schema loading)
- Interface with storage tiers
- Are testable without React rendering
- Should NOT import from `components/` or `screens/`

### State Management (Zustand)

- One store per domain: `useProfileStore`, `useTripStore`, `useFormStore`, `useAppStore`
- Actions are methods on the store (not external functions)
- Async operations go in store actions, not components
- Components select only what they need: `const name = useProfileStore(s => s.name)`

### Forms

- Use React Hook Form + Zod for validation
- Country schemas define fields via `autoFillSource` dot-notation paths
- The Form Engine (`services/forms/formEngine.ts`) resolves auto-fill sources
- `DynamicForm` renders fields from schema definitions

### Adding a New Screen

1. Create a named folder: `screens/<domain>/<ScreenName>/`
2. Create the screen file: `screens/<domain>/<ScreenName>/<ScreenName>.tsx`
3. Export from the domain barrel: `screens/<domain>/index.ts`
4. Add the route to `navigation/types.ts`
5. Wire it into the appropriate navigator
6. Add a Playwright E2E test in `e2e/tests/`
7. If the screen uses a new native module, add a mock in `e2e/mocks/`
8. Use `@/` path aliases for all imports (not relative `../../`)

The named folder convention enables colocated `__screenshots__/` directories for visual auditing. A structural test in `__tests__/structure/screen-folder-convention.test.ts` enforces this — flat screen files will fail CI.

### Adding a New Country

1. Add the country entry to `constants/countries.ts` (`SUPPORTED_COUNTRIES` array)
2. Create the schema JSON in `schemas/<ISO>.json`
3. Register it in `services/schemas/schemaRegistry.ts`
4. Add a `case '<ISO>':` in `components/trips/CountryFlag.tsx`'s `renderFlag()` switch — the `country-completeness` structural test in `__tests__/structure/` enforces this
5. Add schema validation tests in `__tests__/schemas/<ISO>.test.ts`
