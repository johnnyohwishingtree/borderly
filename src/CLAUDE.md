# src/ — Application Source Code

## Architecture

Borderly is a **local-first** React Native app. All PII stays on-device. See `docs/mvp-proposal.md` for the full spec.

## Directory Structure

| Folder | Purpose |
|--------|---------|
| `app/` | Root component + navigation bootstrap |
| `screens/` | Full-screen navigation targets (one per route) |
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

1. Create the screen in `screens/<domain>/`
2. Add the route to `navigation/types.ts`
3. Wire it into the appropriate navigator
4. Add a Playwright E2E test in `e2e/tests/`
5. If the screen uses a new native module, add a mock in `e2e/mocks/`

### Adding a New Country

1. Create the schema JSON in `schemas/<ISO>.json`
2. Register it in `services/schemas/schemaRegistry.ts`
3. Add schema validation tests in `__tests__/schemas/<ISO>.test.ts`
4. Add country flag asset in `assets/flags/`
