# Knowledge Engine Types

The `.knowledge/` directory contains five types of knowledge, each with its own format and purpose. Think of them as different "engines" that serve different functions in the system.

## 1. Policy Engine (`policies/`)

**What it does:** Enforces constraints on code. ALLOW/DENY rules with explicit scope.
**When it's read:** Auto-loaded via folder CLAUDE.md when working in a governed directory.
**How it's enforced:** Structural tests in `__tests__/structure/`.

**Format:**
```markdown
# Policy: <Name>
## Scope — directories/files this governs
## Rules — ALLOW/DENY/REQUIRE statements
## Exceptions — when rules don't apply
## Anti-patterns — concrete violation examples
## Enforcement — which structural test catches violations
```

**Subcategories:**
- `architecture/` — code structure, dependency direction, file boundaries
- `data/` — storage tiers, PII, security, schemas
- `ui/` — styling, typography, motion, accessibility, UX writing
- `state/` — hooks, stores, state management
- `testing/` — test conventions, E2E, drift detection
- `platform/` — native modules, navigation, build config

## 2. Domain Model (`models/`)

**What it does:** Describes business entities, their relationships, fields, and invariants. Like a relational database schema.
**When it's read:** When implementing features that touch business logic.
**How it's enforced:** Schema validation tests, unit tests on business logic.

**Format:**
```markdown
# Model: <Name>
## Entities — what objects exist (with fields and types)
## Relationships — how entities connect
## Invariants — rules that must always be true
## Key Files — where the implementation lives
```

## 3. Templates (`templates/`)

**What it does:** Defines file structure for new files. Like a code generator.
**When it's read:** When creating new modules, tests, stories, skills.
**How it's enforced:** Rubrics evaluate the output against the template.

**Format:**
```markdown
# Template: <Name>
## Structure — code skeleton with placeholders
## Rules — what must be present
## Matching rubric — quality criteria for evaluation
```

## 4. Patterns (`patterns/`)

**What it does:** Multi-step recipes for cross-cutting changes. Like a workflow engine.
**When it's read:** When implementing a task that touches multiple files.
**How it's enforced:** Checklist in the pattern + story acceptance criteria.

**Format:**
```markdown
# Pattern: <Name>
## Steps — ordered list of actions
## Files to create/modify — with expected changes
## Checklist — verification before done
```

## 5. Rubrics (`rubrics/`)

**What it does:** Evaluates quality of output. Like a grading engine.
**When it's read:** During pipeline Step 6 (self-review).
**How it's enforced:** Pipeline checks diff against rubric criteria.

**Format:**
```markdown
# Rubric: <Name>
## Criteria — weighted evaluation dimensions
## Anti-patterns — what fails the rubric
```

## Operational Artifacts (not an engine type)

**`gaps.md`** — a transient work queue, not knowledge. Entries are created by `/audit`, `/knowledge-audit`, and `/pipeline` Step 5 when violations or missing knowledge are found. Each entry includes a test strategy. Entries are removed after the fix is merged.

Not an engine type because: it's a single file, entries are temporary, and it doesn't define rules or entities. It's the input queue for `/optimize` and the pipeline.

## How They Relate

```
Audit / Knowledge-Audit / Pipeline
    ↓ discovers gaps
gaps.md (work queue)
    ↓ resolved by
Optimize / Pipeline stories
    ↓ may create new
Policies (constraints)   ←──── with structural test
    ↓ enforced by
Structural Tests
    ↓ informed by
Domain Models (business context)

Patterns (how to build)
    ↓ references
Templates (file structure)
    ↓ evaluated by
Rubrics (quality check)
```
