# Knowledge Engine Types

The `.knowledge/` directory contains six types of knowledge, each with its own format and purpose. Think of them as different "engines" that serve different functions in the system.

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

## 2. Belief Engine (`beliefs/`)

**What it does:** Tracks product assumptions and working hypotheses that drive architecture and UX decisions. Unlike policies (which enforce constraints), beliefs capture the reasoning behind why those constraints exist.
**When it's read:** During pipeline pre-flight (Step 3) to check if a story touches code driven by unconfirmed beliefs. During pipeline learning (Step 6) to update beliefs based on implementation experience. During knowledge-audit (Step 2) to check for stale hypotheses.
**How it's enforced:** Not enforced directly — beliefs inform judgment, not rules. The pipeline flags low-confidence beliefs before implementing code that depends on them.

**Format:**
```markdown
# Belief: <Name>
## Status — Hypothesis | Working assumption | Confirmed
## Statement — what we believe and why it matters
## Evidence — what supports this belief
## What would confirm — criteria to promote the belief
## What would invalidate — criteria to archive the belief
## Referenced by — files and knowledge nodes that depend on this belief
```

**Status lifecycle:** `Hypothesis` → `Working assumption` → `Confirmed`. Beliefs can also be `Invalidated` (archived with reason).

**Key difference from policies:** A policy says "DENY: cloud sync of passport data." A belief says "We believe local-first privacy is a differentiator" — it's the reasoning that justifies the policy. If the belief gets invalidated, the policy should be revisited.

## 3. Domain Model (`models/`)

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

## 4. Templates (`templates/`)

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

## 5. Patterns (`patterns/`)

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

## 6. Rubrics (`rubrics/`)

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
    ↓ enforced by            ↑ justified by
Structural Tests         Beliefs (assumptions)
    ↓ informed by            ↓ checked during
Domain Models            Pipeline pre-flight (Step 3)
(business context)       Pipeline learn (Step 6)
                         Knowledge-audit (Step 2)

Patterns (how to build)
    ↓ references
Templates (file structure)
    ↓ evaluated by
Rubrics (quality check)
```
