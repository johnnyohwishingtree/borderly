# Knowledge Graph — Entity Relationship Diagram

## Directory Layout

```
.knowledge/
├── policies/              POLICY ENGINE (SCOPE/RULES/ENFORCEMENT)
│   ├── architecture/      dependency-direction, file-boundaries, local-first, testable-architecture
│   ├── data/              storage-tiers, pii-boundary, schema-fields
│   ├── ui/                styling, typography, motion, accessibility, ux-writing
│   ├── state/             hook-conventions, store-boundaries
│   ├── testing/           test-conventions, e2e-testability, drift-detection
│   └── platform/          native-modules, navigation
├── models/                DOMAIN MODEL (ENTITIES/RELATIONSHIPS/INVARIANTS)
│   └── form-engine, passport, qr-wallet, submission-guide
├── domain/countries/      per-country portal metadata (14 countries)
├── templates/             TEMPLATES (STRUCTURE/RULES/RUBRIC)
├── patterns/              PATTERNS (STEPS/FILES/CHECKLIST)
└── rubrics/               RUBRICS (CRITERIA/ANTI-PATTERNS)
```

## Folder CLAUDE.md → Knowledge (Foreign Keys)

```
src/                    → architecture/local-first, architecture/dependency-direction, data/storage-tiers
src/stores/             → architecture/dependency-direction
src/services/           → architecture/dependency-direction
src/services/storage/   → data/storage-tiers, data/pii-boundary
src/services/forms/     → models/form-engine
src/services/passport/  → models/passport
src/services/submission/→ models/submission-guide, architecture/local-first
src/components/         → architecture/dependency-direction, testing/e2e-testability
src/components/ui/      → ui/styling, ui/typography, ui/motion
src/components/forms/   → models/form-engine
src/components/wallet/  → models/qr-wallet, ui/styling
src/screens/            → state/hook-conventions, ui/ux-writing, patterns/add-screen
src/screens/wallet/     → models/qr-wallet, testing/e2e-testability
src/hooks/              → state/hook-conventions
src/schemas/            → models/form-engine, patterns/add-country, testing/drift-detection
maestro/                → testing/e2e-testability, testing/drift-detection
e2e/                    → testing/test-conventions, platform/native-modules
__tests__/structure/    → architecture/testable-architecture
```

## Structural Tests → Policies

```
dependency-direction.test  → architecture/dependency-direction, state/store-boundaries
pii-boundary.test          → data/pii-boundary, data/storage-tiers, architecture/local-first
maestro-registry-sync.test → testing/e2e-testability, testing/drift-detection
component-testids.test     → testing/e2e-testability
hooks-barrel.test          → state/hook-conventions, architecture/file-boundaries
screen-folder-convention   → platform/navigation, architecture/file-boundaries
native-module-mocks.test   → platform/native-modules
accessibility-props.test   → ui/accessibility
no-space-x.test            → ui/styling
smart-component-usage.test → ui/styling
knowledge-test-coverage    → architecture/testable-architecture (meta)
```

## High-Connectivity Nodes

| Policy | References |
|---|---|
| architecture/dependency-direction | 6 dirs + 3 skills + 2 tests |
| testing/e2e-testability | 3 dirs + 3 skills + 2 tests |
| data/pii-boundary | 3 dirs + 2 policies + 1 test |
| ui/styling | 4 dirs + 2 tests |
| state/hook-conventions | 2 dirs + 2 skills + 1 test |

## Orphaned Nodes

None.
