# Knowledge Graph — Entity Relationship Diagram

## Schema Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        .knowledge/ (DATABASE)                       │
├─────────────┬──────────────┬──────────────┬────────────┬────────────┤
│  concepts/  │ conventions/ │   domain/    │ templates/ │  rubrics/  │
│ (principles)│   (rules)    │(business)    │(structure) │ (quality)  │
├─────────────┼──────────────┼──────────────┼────────────┼────────────┤
│ dependency- │ styling      │ form-engine  │ module     │ code-      │
│  direction  │ testing      │ passport     │ test       │  quality   │
│ security-   │ storage      │ submission-  │ story      │ test-      │
│  boundary   │ navigation   │  guide       │ epic       │  quality   │
│ local-first │ state-mgmt   │ qr-wallet    │ skill      │ skill-     │
│ drift-      │ native-mods  │ countries/   │ folder-    │  quality   │
│  detection  │ e2e-testab.  │  (11 files)  │  claude-md │            │
│ testable-   │ typography   │              │            │            │
│  architect. │ motion       │              │            │            │
│             │ ux-writing   │              │            │            │
│             │ accessib./   │              │            │            │
│             │  (3 files)   │              │            │            │
└─────────────┴──────────────┴──────────────┴────────────┴────────────┘
```

## Entity Relationships

### Folder CLAUDE.md → Knowledge (Foreign Keys)

These are the "indexes" — auto-loaded when the agent works in a directory.

```
src/CLAUDE.md ──────────────┬→ concepts/local-first
                            ├→ concepts/dependency-direction ←──┐
                            └→ conventions/storage               │
                                                                 │
src/stores/CLAUDE.md ───────→ concepts/dependency-direction ←────┤
src/services/CLAUDE.md ─────→ concepts/dependency-direction ←────┤
src/components/CLAUDE.md ───┬→ concepts/dependency-direction ←───┘
                            └→ conventions/styling ←─────────────┐
                                                                 │
src/components/ui/CLAUDE.md ┬→ conventions/styling ←─────────────┘
                            ├→ conventions/typography
                            └→ conventions/motion

src/screens/CLAUDE.md ──────┬→ conventions/state-management ←───┐
                            ├→ conventions/ux-writing            │
                            └→ patterns/add-screen               │
                                                                 │
src/hooks/CLAUDE.md ────────→ conventions/state-management ←────┘

src/schemas/CLAUDE.md ──────┬→ domain/form-engine ←─────────────┐
                            └→ patterns/add-country              │
                                                                 │
src/components/forms/ ──────→ domain/form-engine ←───────────────┤
src/services/forms/ ────────→ domain/form-engine ←───────────────┘

src/services/storage/ ──────┬→ conventions/storage
                            └→ concepts/security-boundary ←─────┐
src/services/backup/ ───────┬→ conventions/storage               │
                            └→ concepts/security-boundary ←──────┘

src/services/passport/ ─────→ domain/passport
src/services/submission/ ───┬→ domain/submission-guide
                            └→ concepts/local-first

src/services/notification/ ─┬→ concepts/dependency-direction
                            └→ conventions/native-modules ←─────┐
e2e/CLAUDE.md ──────────────┬→ conventions/testing               │
                            └→ conventions/native-modules ←──────┘
__tests__/CLAUDE.md ────────┬→ conventions/testing
                            └→ conventions/accessibility/testing-patterns
```

### Knowledge → Knowledge (Internal References)

```
conventions/storage ────────→ concepts/security-boundary
concepts/drift-detection ───→ conventions/e2e-testability
patterns/add-screen ────────┬→ conventions/styling
                            └→ conventions/accessibility/component-props
patterns/add-native-dep ────→ conventions/native-modules
patterns/add-country ───────→ (uses domain/form-engine implicitly)

templates/module ───────────┬→ rubrics/code-quality
                            └→ templates/test
templates/test ─────────────→ rubrics/test-quality
rubrics/skill-quality ──────→ templates/skill
```

### Skills → Knowledge (Query Paths)

```
/pipeline ──────────────────┬→ gaps.md
                            ├→ rubrics/* (self-review)
                            ├→ templates/story, epic
                            ├→ templates/folder-claude-md
                            └→ conventions/e2e-testability

/audit ─────────────────────┬→ gaps.md
                            ├→ index.md
                            ├→ concepts/dependency-direction
                            ├→ conventions/styling
                            └→ templates/story

/knowledge-audit ───────────┬→ ALL conventions/*
                            ├→ ALL concepts/*
                            ├→ domain/form-engine
                            ├→ patterns/add-country
                            └→ gaps.md

/apply-knowledge ───────────→ (single file, specified by user)

/optimize ──────────────────┬→ gaps.md
                            └→ templates/story

/plan-feature ──────────────┬→ index.md
                            └→ domain/form-engine

/refactor-design ───────────┬→ concepts/dependency-direction
                            ├→ conventions/state-management
                            └→ domain/form-engine
```

### Structural Tests → Knowledge (Constraint Enforcement)

```
dependency-direction.test ──→ concepts/dependency-direction
pii-boundary.test ──────────→ concepts/security-boundary
                            → conventions/storage
maestro-registry-sync.test ─→ conventions/e2e-testability
                            → concepts/drift-detection
component-testids.test ─────→ conventions/e2e-testability
hooks-barrel.test ──────────→ conventions/state-management
screen-folder-convention ───→ conventions/navigation
native-module-mocks.test ───→ conventions/native-modules
accessibility-props.test ───→ conventions/accessibility/*
no-space-x.test ────────────→ conventions/styling
smart-component-usage.test ─→ conventions/styling
                            → domain/form-engine
knowledge-test-coverage ────→ concepts/testable-architecture
                            → (ALL conventions — meta-test)
```

## Shared Topic Clusters

Files that reference the same concept must not contradict:

```
"testID"          → e2e-testability, drift-detection, testing, add-screen
"Keychain"        → security-boundary, local-first, storage, passport
"autoFillSource"  → form-engine, add-country, drift-detection, folder-claude-md
"inline styles"   → styling, code-quality, module template
"useState"        → state-management, testable-architecture
"searchable_select" → form-engine, add-country, countries/japan
```

## High-Connectivity Nodes (most referenced)

| Knowledge file | Referenced by |
|---|---|
| `concepts/dependency-direction` | 6 folder CLAUDE.md + 3 skills + 1 test |
| `domain/form-engine` | 3 folder CLAUDE.md + 4 skills + 1 test |
| `conventions/styling` | 3 folder CLAUDE.md + 1 skill + 2 tests |
| `conventions/storage` | 3 folder CLAUDE.md + internal ref to security-boundary |
| `conventions/state-management` | 2 folder CLAUDE.md + 2 skills + 1 test |
| `conventions/e2e-testability` | 3 skills + 2 tests + internal ref from drift-detection |
| `concepts/security-boundary` | 2 folder CLAUDE.md + internal ref from storage + 1 test |

## Orphaned Nodes (no folder CLAUDE.md references)

| Knowledge file | Referenced by | Issue |
|---|---|---|
| `conventions/e2e-testability` | Skills + tests only | No folder CLAUDE.md points to it |
| `conventions/testing` | `e2e/` + `__tests__/` only | Not loaded for `src/` work |
| `domain/qr-wallet` | Nothing | Completely orphaned |
| `domain/submission-guide` | `services/submission/` only | Low connectivity |
| `concepts/testable-architecture` | Nothing | Principle, not actionable per-directory |
| `concepts/drift-detection` | Internal ref only | Not auto-loaded anywhere |
