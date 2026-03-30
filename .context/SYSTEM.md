# Borderly System: Constraint-Driven Development

How the autonomous AI pipeline develops, verifies, and evolves the codebase.

## Philosophy

**Knowledge is code.** Constraints are structural tests. Beliefs are typed constants. Models are TypeScript types. Everything that CAN be code IS code — because code enforces itself and prose drifts.

What remains as prose (in `.context/`) is only what can't be code: government portal behavior, laws, human cognition, rejected alternatives, and multi-step recipes not yet automated.

```
Source of truth hierarchy:

  Structural tests (__tests__/structure/)    ← constraints, enforced at pnpm test
  TypeScript types (src/types/)              ← models, enforced by compiler
  Beliefs (src/config/beliefs.ts)            ← assumptions, tracked with status
  Folder CLAUDE.md (src/**/CLAUDE.md)        ← pointers to constraints + types
  External context (.context/)               ← things outside our control (prose)
  Decisions (.context/decisions/)            ← rejected alternatives (permanent prose)
  Patterns (.context/patterns/)              ← recipes awaiting generator automation
```

## How a story flows through the system

### 1. Story creation (`/epic-planner`)

A story is a GitHub issue with `story` + `pending` labels.

```markdown
## Constraints
- <structural test> — what rules govern this area
- <belief> (status) — what assumptions apply

## Acceptance Criteria
- [ ] Implementation complete
- [ ] Structural tests pass
- [ ] Belief status updated if confirmed/invalidated
```

Stories reference constraints (structural tests) and beliefs (typed constants), not prose documentation. The constraint IS the spec.

### 2. Pipeline picks it up (`/pipeline`, hourly)

```
Step 1: Merge any open PRs
Step 2: Find next pending story
Step 3: Pre-flight — read folder CLAUDE.md → structural test JSDoc → beliefs.ts
Step 4: Implement
Step 5: Verify — pnpm lint, typecheck, test (structural tests enforce constraints)
Step 6: Learn — update beliefs, write new constraints, add external context
Step 7: Self-review
Step 8: Push, PR, merge
Step 9: Plan next epic if queue empty
```

### 3. Constraints catch violations automatically

When the pipeline runs `pnpm test`, the structural tests in `__tests__/structure/` execute in < 1 second and catch:

- Import direction violations (components importing stores)
- PII leaking to unencrypted storage
- Missing testIDs on interactive elements
- Native modules without web mocks
- Screen files not in named folders
- Hooks not exported from barrel

Each test has a JSDoc header that IS the constraint specification — the LLM reads the rules, exceptions, and anti-patterns from the test file itself.

### 4. Learning happens in code, not prose

After implementing, the pipeline checks 5 categories:

| What was learned | Where it goes |
|---|---|
| A belief was confirmed/invalidated | Update status in `src/config/beliefs.ts` |
| A new rule should be enforced | Write structural test in `__tests__/structure/` with Constraint JSDoc |
| Something about an external system | Add to `.context/external/` |
| A wrong approach was tried | Add to structural test's Anti-patterns JSDoc section |
| A `.context/` file gave wrong guidance | Update the file directly |

## Daily audits

### `/code-audit` (daily)

Walks every folder CLAUDE.md, follows `See:` links to structural tests, checks if code violates the constraint JSDoc rules. Creates fix stories for violations.

### `/context-audit` (daily)

1. **Drift detection** — reads `.claude/dirty-files` (accumulated by PostToolUse hook at zero token cost), gets focused `git diff` of what changed since last audit, greps `.context/` and `__tests__/structure/` for affected files
2. **Schema staleness** — checks `metadata.lastVerified` on country schemas
3. **Belief lifecycle** — flags hypotheses older than 60 days for re-evaluation
4. **Constraint coverage** — every structural test must have a Constraint JSDoc header
5. **Cross-reference integrity** — all `See:` links and `.context/` references resolve

### `/ux-review` (daily)

Evaluates user journeys against `e2e/mobile/full-e2e.test.ts` (the test IS the journey definition). Creates stories for UX gaps.

### `/test-audit` (weekly)

Scores existing tests by "what bug would this catch?" — not coverage percentage. Creates stories to rewrite low-value tests.

## How the file change hook works

```
You work normally
  → PostToolUse hook silently appends changed src/ paths to .claude/dirty-files
  → Zero tokens, zero overhead — shell script with no stdout

.claude/dirty-files accumulates across conversations

/context-audit runs daily
  → Reads dirty-files + last-audit-hash
  → git diff <last-hash>..HEAD -- <dirty-files>
  → Greps .context/ and __tests__/structure/ for references
  → Finds drift, updates context, clears dirty-files
```

## Where everything lives

```
.claude/
├── rules/                  # Auto-loaded every session (commit-gate, output-location)
├── skills/                 # Workflow orchestrators (18 skills)
├── hooks/post-tool-track.sh  # Silent file change tracking
└── settings.json           # Hook registration

.context/
├── decisions/              # 7 ADRs — rejected alternatives (immutable)
├── external/
│   ├── countries/          # 21 files — government portal behavior
│   ├── regulatory/         # 5 files — laws (GDPR, PII, ToS)
│   ├── cognitive/          # 6 files — human behavior (touch targets, reading)
│   ├── customer/           # 5 files — user behavior (borders, families)
│   ├── market/             # 3 files — competitive landscape
│   └── tools/              # 13 files — library/OS properties
├── patterns/               # 2 files — add-country, add-screen
├── unvalidated/            # Staging area for new observations
├── CLAUDE.md               # Creation rules for context files
└── SYSTEM.md               # This file

__tests__/structure/        # 21 structural tests = 21 constraints
src/config/beliefs.ts       # 13 beliefs as typed constants
src/**/CLAUDE.md            # Folder guardrails pointing to constraints + types
```

## Principles (codified, not prose)

These principles are embodied in the system, not written as separate files:

- **Constraints are code** — if it can be a test, it's a test. If it can be a type, it's a type. Prose is last resort.
- **Single source of truth** — the test IS the constraint AND the documentation. One file, zero drift.
- **Beliefs are typed** — product assumptions have status tracking and the compiler shows every callsite.
- **External context is separate** — things we don't control live in `.context/`, not mixed with our code.
- **Learning is concrete** — "update beliefs.ts" or "write a structural test", not "update knowledge".
- **Zero-token hooks** — file tracking costs nothing; LLM analysis is batched into daily audits.
- **Shell over LLM for deterministic work** — grep, git diff, file append don't need an AI agent.
