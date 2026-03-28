# System Index

Read this first. Maps every artifact in the system. See `ENGINE-TYPES.md` for format reference.

## .claude/ (read-only — human edits only)

### Rules (auto-loaded every session — keep minimal)

| File | Constraint |
|------|-----------|
| `rules/commit-gate.md` | Run lint + typecheck + tests before every commit |
| `rules/output-location.md` | All output must be inside the project root |

Other rules migrated to policies (loaded on-demand by skills, not every session).

### Skills

| Skill | Purpose | Invocation |
|-------|---------|------------|
| `skills/pipeline/` | Autonomous story loop | `/pipeline` |
| `skills/local-pipeline/` | Same, for local CLI / Claude Desktop | `/local-pipeline` |
| `skills/code-audit/` | Code vs policy compliance, drift, dead code | `/code-audit` |
| `skills/knowledge-audit/` | Policy compliance + test coverage + consistency | `/knowledge-audit` |
| `skills/apply-knowledge/` | Scan and fix against one knowledge file | `/apply-knowledge` |
| `skills/optimize/` | Resolve gaps, compress bloated files | `/optimize` |
| `skills/epic-planner/` | Break a goal into Epic + Stories | `/epic-planner` |
| `skills/plan-feature/` | Plan and implement a new feature | `/plan-feature` |
| `skills/test-suite/` | Find and fix test coverage gaps | `/test-suite` |
| `skills/refactor-design/` | Audit and fix architecture issues | `/refactor-design` |
| `skills/capture-screens/` | Capture screenshots + generate manifest | `/capture-screens` |
| `skills/visual-audit/` | Audit UI/UX using screenshots | `/visual-audit` |
| `skills/visual-implement/` | Apply UI fixes from audit | `/visual-implement` |
| `skills/ux-review/` | Evaluate user journeys | `/ux-review` |
| `skills/ux-implement/` | Implement flow-level UX changes | `/ux-implement` |
| `skills/qa/` | Walk through app, document bugs | `/qa` |
| `skills/update-architecture/` | Update architecture diagrams | `/update-architecture` |
| `skills/organize/` | Reorganize file structure | `/organize` |
| `skills/cleanup/` | Remove unused files | `/cleanup` |
| `skills/local-feature/` | Develop feature in isolated worktree | `/local-feature` |
| `skills/test-audit/` | Score tests for quality, find junk, recommend deletions | `/test-audit` |

## .knowledge/ — Eight Engine Types

| Engine | Directory | Format | Purpose |
|--------|-----------|--------|---------|
| **Fact** | `facts/` | ID, STATEMENT, REFERENCED BY | Atomic truths (7 types: craft, domain, tool, regulatory, customer, organizational, cognitive) |
| **Principle** | `principles/` | STATEMENT, DERIVES FROM, IMPLEMENTED BY | Shared reasoning connecting facts to policies |
| **Policy** | `policies/` | SCOPE, RULES (ALLOW/DENY/REQUIRE), EXCEPTIONS, ENFORCEMENT, DERIVES FROM | Enforce constraints |
| **Belief** | `beliefs/` | STATUS, STATEMENT, EVIDENCE, CONFIRMATION/INVALIDATION | Track product assumptions |
| **Model** | `models/` | ENTITIES, RELATIONSHIPS, INVARIANTS, KEY FILES | Business context |
| **Template** | `templates/` | STRUCTURE, RULES, MATCHING RUBRIC | File generation |
| **Pattern** | `patterns/` | STEPS, FILES, CHECKLIST | Multi-step recipes |
| **Rubric** | `rubrics/` | CRITERIA (weighted), ANTI-PATTERNS | Quality evaluation |

**Derivation chain:** Facts → Principles → Policies → Rules → Structural Tests

### Facts (by type)

| Type | File | Count | Decay rate |
|------|------|-------|------------|
| Craft | `facts/craft.md` | 8 | Very slow |
| Domain | `facts/domain.md` | 8 | Slow (governments change rules) |
| Tool | `facts/tool.md` | 8 | Medium (tools update) |
| Regulatory | `facts/regulatory.md` | 5 | Slow but sudden |
| Customer | `facts/customer.md` | 5 | Fast (user base evolves) |
| Organizational | `facts/organizational.md` | 6 | Medium (process changes) |
| Cognitive | `facts/cognitive.md` | 6 | Very slow |

### Principles (10)

directional-dependency-graph, naming-enables-enforcement, security-through-storage-tiers, centralized-access-patterns, declarative-over-imperative, source-of-truth-prevents-drift, test-before-fix, user-always-submits, accessibility-is-non-negotiable, knowledge-is-living-documentation

### Policies (by scope)

| Scope | Policies |
|-------|---------|
| `architecture/` | dependency-direction, file-boundaries, local-first, testable-architecture, utils-boundary |
| `data/` | storage-tiers, pii-boundary, schema-fields |
| `ui/` | styling, typography, motion, accessibility, ux-writing |
| `state/` | hook-conventions, store-boundaries |
| `testing/` | test-conventions, test-quality, e2e-testability, drift-detection |
| `platform/` | native-modules, navigation |
| `workflow/` | verification, learning, self-review, fix-strategy, bug-fix, story-implementation, epic-planning |

### Models

form-engine, passport, qr-wallet, submission-guide, stores, user-journeys, maestro-generator, system-architecture

### Beliefs

scan-once-fill-everywhere (confirmed), schema-driven-forms-scale (confirmed), guided-submission-over-automation (confirmed), local-first-is-differentiator (working assumption), smart-delta-increases-completion (working assumption), asia-pacific-first-market (working assumption), auto-fill-40-percent-threshold (hypothesis)

### Domain

`domain/countries/` (15 countries)

### Other

templates/ (6), patterns/ (4), rubrics/ (3)

Gaps → `.knowledge/gaps.md`. Folder CLAUDE.md files auto-load relevant policies/models per directory.
