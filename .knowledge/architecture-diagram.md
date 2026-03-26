# Knowledge Graph — Entity Relationship Diagram

## Directory Layout

```
.knowledge/
├── concepts/     (5): dependency-direction, security-boundary, local-first, drift-detection, testable-architecture
├── conventions/  (10+): styling, testing, storage, navigation, state-mgmt, native-mods, e2e-testability, typography, motion, ux-writing, accessibility/ (3)
├── domain/       (5+): form-engine, passport, submission-guide, qr-wallet, countries/ (11)
├── templates/    (5): module, test, story, epic, skill, folder-claude-md
└── rubrics/      (3): code-quality, test-quality, skill-quality
```

## Folder CLAUDE.md → Knowledge (Foreign Keys)

```
src/                    → local-first, dependency-direction, storage
src/stores/             → dependency-direction
src/services/           → dependency-direction
src/services/storage/   → storage, security-boundary
src/services/forms/     → form-engine
src/services/passport/  → passport
src/services/submission/→ submission-guide, local-first
src/components/         → dependency-direction, e2e-testability
src/components/ui/      → styling, typography, motion
src/components/forms/   → form-engine
src/components/wallet/  → qr-wallet, styling
src/screens/            → state-management, ux-writing, add-screen
src/screens/wallet/     → qr-wallet, e2e-testability
src/hooks/              → state-management
src/schemas/            → form-engine, add-country, drift-detection
maestro/                → e2e-testability, drift-detection
e2e/                    → testing, native-modules
__tests__/              → testing, accessibility/testing-patterns
__tests__/structure/    → testable-architecture
```

## Knowledge Cross-References

```
conventions/storage       → concepts/security-boundary
concepts/drift-detection  → conventions/e2e-testability
patterns/add-screen       → conventions/styling, accessibility/component-props
patterns/add-native-dep   → conventions/native-modules
patterns/add-country      → domain/form-engine (implicit)
templates/module          → rubrics/code-quality, templates/test
templates/test            → rubrics/test-quality
```

## Skills → Knowledge

```
/pipeline     → gaps.md, rubrics/*, templates/story+epic, conventions/e2e-testability
/audit        → gaps.md, index.md, dependency-direction, styling, templates/story
/knowledge-audit → ALL conventions/*, ALL concepts/*, form-engine, add-country, gaps.md
/optimize     → gaps.md, templates/story
/plan-feature → index.md, form-engine
/refactor     → dependency-direction, state-management, form-engine
```

## Structural Tests → Knowledge

```
dependency-direction.test  → concepts/dependency-direction
pii-boundary.test          → concepts/security-boundary, conventions/storage
maestro-registry-sync.test → conventions/e2e-testability, concepts/drift-detection
component-testids.test     → conventions/e2e-testability
hooks-barrel.test          → conventions/state-management
screen-folder-convention   → conventions/navigation
native-module-mocks.test   → conventions/native-modules
accessibility-props.test   → conventions/accessibility/*
no-space-x.test            → conventions/styling
smart-component-usage.test → conventions/styling, domain/form-engine
knowledge-test-coverage    → concepts/testable-architecture (meta-test)
autofill-extension.test    → concepts/security-boundary (entitlements)
autofill-extension-ui.test → conventions/styling (color tokens)
```

## Shared Topic Clusters

Files referencing the same concept must not contradict:

| Topic | Referenced in |
|---|---|
| testID | e2e-testability, drift-detection, testing, add-screen |
| Keychain | security-boundary, local-first, storage, passport |
| autoFillSource | form-engine, add-country, drift-detection |
| inline styles | styling, code-quality, module template |
| searchable_select | form-engine, add-country, countries/japan |

## High-Connectivity Nodes

| File | Refs |
|---|---|
| `concepts/dependency-direction` | 6 dirs + 3 skills + 1 test |
| `domain/form-engine` | 3 dirs + 4 skills + 1 test |
| `conventions/e2e-testability` | 3 dirs + 3 skills + 2 tests |
| `conventions/styling` | 4 dirs + 1 skill + 2 tests |
| `conventions/storage` | 3 dirs + security-boundary ref |
| `concepts/security-boundary` | 2 dirs + storage ref + 2 tests |
| `concepts/drift-detection` | 2 dirs + internal ref + 1 test |
| `domain/qr-wallet` | 2 dirs |
| `concepts/testable-architecture` | 1 dir + meta-test |

## Orphaned Nodes

None — all knowledge files are referenced by at least one folder CLAUDE.md.
