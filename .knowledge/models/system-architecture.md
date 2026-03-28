# Model: System Architecture

How the knowledge hierarchy (facts → principles → policies), rules, skills, and the knowledge graph work together.

## Entities

### Facts (.knowledge/facts/)
- Atomic truths about the world — the foundation everything else derives from
- 7 types: craft, domain, tool, regulatory, customer, organizational, cognitive
- Each fact has an ID (e.g., `f:craft:separation-of-concerns`) and `Referenced by` pointers
- Facts justify why principles and policies exist
- Pipeline CAN edit facts — new truths discovered during implementation

### Principles (.knowledge/principles/)
- Shared reasoning connecting multiple facts to multiple policies
- Each principle has `Derives from` (facts) and `Implemented by` (policies)
- When a principle changes, all implementing policies should be revisited
- Pipeline CAN edit principles

### Rules (.claude/rules/)
- Auto-loaded every session — always in context
- Only 2 rules: `commit-gate.md`, `output-location.md`
- Keep minimal — each rule costs tokens in every conversation
- Only for irreversible-damage guardrails (bad commits, files outside project)
- Everything else belongs in policies (loaded on-demand)

### Policies (.knowledge/policies/)
- Loaded on-demand when a skill says "Follow .knowledge/policies/..."
- Structured format: SCOPE, RULES (ALLOW/DENY/REQUIRE), EXCEPTIONS, ANTI-PATTERNS, ENFORCEMENT, DERIVES FROM
- 7 scopes: architecture, data, ui, state, testing, platform, workflow
- Each policy now has `Derives From` pointing to its justifying facts and principles
- Pipeline CAN edit policies — this is where learning happens

### Skills (.claude/skills/)
- Loaded on invocation (`/skill-name`)
- Orchestrators — sequence of steps referencing policies
- Structure: Prerequisites → Steps → Guardrails
- Pipeline CANNOT edit skills — all learnable content must be in policies/facts/principles
- Reference policies inline: "Follow `.knowledge/policies/workflow/verification.md`."
- No hardcoded project specifics — read from knowledge dynamically

### Beliefs (.knowledge/beliefs/)
- Tracked product assumptions with status lifecycle: Hypothesis → Working assumption → Confirmed
- Format: STATUS, STATEMENT, EVIDENCE, CONFIRMATION/INVALIDATION criteria, REFERENCED BY
- Checked during pipeline pre-flight (Step 3) and updated during learning (Step 6)
- Justify policies — a belief like "local-first is a differentiator" underpins the local-first policy
- Knowledge-audit checks for stale hypotheses (no evidence updates in 60+ days)

### Knowledge Graph (scripts/knowledge-graph.ts)
- 105+ nodes: policies, models, beliefs, templates, patterns, rubrics, folder-claude, skills, rules
- Edge types: REFERENCES, REFERENCED_BY, ENFORCED_BY, SCOPES, MATCHES, FOLLOWS, INVOKES
- Parses `Follow .knowledge/...` from skill step body — no metadata sections
- Queries: stats, orphans, unreferenced, unenforced, impact, deps, visualize

### Structural Tests (__tests__/structure/)
- Enforce policies at `pnpm test` time (< 1 second each)
- `system-integrity.test.ts` — validates all cross-references resolve
- `skill-structure.test.ts` — validates Prerequisites/Steps/Guardrails
- `knowledge-test-coverage.test.ts` — every policy mapped to a test
- Plus 19 codebase-specific tests

## Relationships
```
Facts ──DERIVES INTO──→ Principles
Principles ──IMPLEMENTED BY──→ Policies
Policies ──DERIVES FROM──→ Facts + Principles (traceability)
Policies ──ENFORCED_BY──→ Structural Tests
Rules (auto-loaded) ──thin pointers──→ Policies
Skills ──FOLLOWS──→ Policies (loaded on-demand)
Skills ──INVOKES──→ Other Skills
Folder CLAUDE.md ──REFERENCED_BY──→ Policies
Policies ──REFERENCES──→ Other Policies
Beliefs ──JUSTIFIES──→ Policies (why constraints exist)
Pipeline ──CHECKS──→ Beliefs + Facts (pre-flight + learning)
```

Full chain: **Fact → Principle → Policy → Rule → Structural Test**

## Invariants
- Skills never contain hardcoded project specifics
- Rules never exceed 2 (auto-loaded context cost)
- Every testable policy has a structural test
- All cross-references resolve (system-integrity test)
- Pipeline learning is mandatory for PRs with 5+ files
- When the generator needs exceptions, standardize the convention and refactor the source — don't hack the parser

## Key Files
- `.claude/rules/` — 2 auto-loaded guardrails
- `.claude/skills/*/SKILL.md` — workflow orchestrators
- `.knowledge/facts/` — atomic truths (7 type files)
- `.knowledge/principles/` — shared reasoning (10 principles)
- `.knowledge/policies/` — structured constraints (7 scopes, 28 policies)
- `.knowledge/beliefs/` — tracked product assumptions (7 beliefs)
- `.knowledge/models/` — business entities and system models
- `.knowledge/templates/` — file structure templates
- `.knowledge/patterns/` — multi-step recipes
- `.knowledge/rubrics/` — quality evaluation criteria
- `scripts/knowledge-graph.ts` — graph query engine
- `__tests__/structure/` — policy enforcement tests
