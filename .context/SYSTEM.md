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

### 1. Where stories come from

Stories originate from four sources, each a different audit:

| Source | Skill | Frequency | What it finds |
|---|---|---|---|
| UX gaps | `/ux-review` | Daily | Dead ends, missing states, flow friction in user journeys |
| Code violations | `/code-audit` | Daily | Code that violates structural test constraints |
| Context drift | `/context-audit` | Daily | Stale schemas, invalidated beliefs, broken references |
| Test quality | `/test-audit` | Weekly | Junk tests, missing coverage for critical paths |

Each audit creates GitHub issues with `story` + `pending` + `source:<skill>` labels. The source label lets the pipeline prioritize by category. Humans can also create stories manually (no source label needed).

### 2. Story creation process (`/epic-planner`)

When creating a story (whether from an audit finding or a human goal), the epic-planner follows this process:

**Step 1: Understand what exists.** Read CLAUDE.md, then read the folder CLAUDE.md files for the areas the story will touch. Each folder CLAUDE.md has `See:` links to structural tests — read the JSDoc headers to understand the constraints.

**Step 2: Check beliefs.** Read `src/config/beliefs.ts`. Identify any belief this story depends on. If the belief has status `hypothesis` or `working`, the story must note this — it's building on unproven ground.

**Step 3: Check external context.** If the story touches country portals, read `.context/external/countries/`. If it touches storage or PII, read `.context/decisions/001-three-tier-storage.md`. The external context tells you WHY constraints exist.

**Step 4: Check patterns.** If the story involves adding a country or screen, read `.context/patterns/add-country.md` or `add-screen.md` for the multi-step recipe.

**Step 5: Write the story.** A well-formed story has:

```markdown
**Parent Epic:** #<epic_number>
**Skill:** /plan-feature (or /test-suite, /ux-implement, etc.)

## Description
<what needs to be implemented and why>

## Constraints
- `<test-file>.test.ts` — <which rules from the JSDoc apply>
- `<belief-key>` (<status>) — <why this assumption matters>
  confirm: <what would validate this>
  invalidate: <what would kill this>

## Acceptance Criteria
- [ ] <specific, testable outcomes>
- [ ] Structural tests pass (`pnpm test`)
- [ ] Belief status updated in `src/config/beliefs.ts` if confirmed/invalidated

## Dependencies
Depends on #<previous_story_number> (if applicable)
```

**What goes in the Constraints section:**

The Constraints section is NOT a list of every structural test. It's the subset that's RELEVANT to this story:

- If the story moves components between directories → `dependency-direction.test.ts`
- If it touches form fields or PII → `pii-boundary.test.ts` + `storage-boundary.test.ts`
- If it adds interactive elements → `component-testids.test.ts`
- If it depends on a product assumption → the belief from `beliefs.ts` with its confirm/invalidate criteria

The pipeline uses these to:
1. **Pre-flight** (Step 3): Read the referenced tests and beliefs before implementing
2. **Verify** (Step 5): Know which structural tests to watch for failures
3. **Learn** (Step 6): Know which beliefs to re-evaluate after implementation

**Example — Issue #1126 (Simplify trip creation):**

```markdown
## Constraints
- `screen-folder-convention.test.ts` — screen naming, folder structure
- `dependency-direction.test.ts` — moved fields must follow import direction rules
- `component-testids.test.ts` — all interactive elements need testIDs
- `tripCreationShouldBeLightweight` (working) in `src/config/beliefs.ts`
  confirm: Trip creation completion rate > 90% after simplifying
  invalidate: Users need flight/accommodation at creation time for auto-fill

## Acceptance Criteria
- [ ] Create trip form: trip name + destination country only
- [ ] Flight, accommodation, address fields moved to leg form
- [ ] E2E test updated with simpler trip creation
- [ ] Belief promoted to `confirmed` if validated
```

### 3. Sizing stories

Each story should be completable in a single Claude session. Split by layer (storage → UI → integration) or by vertical slice (one feature end-to-end). Combine steps that are small and tightly coupled. If a story has no meaningful acceptance criteria beyond "files exist," merge it with a related story.

### 4. Pipeline picks it up (`/pipeline`, hourly)

```
Step 1: Merge any open PRs
Step 2: Run pnpm test — find failing tests
Step 3: Read the failing test's JSDoc — understand intent
Step 4: Read folder CLAUDE.md → constraints → types — understand context
Step 5: Implement the fix
Step 6: Verify — pnpm lint, typecheck, test (ALL tests must pass)
Step 7: Push, PR, merge
Step 8: Loop back to Step 2 if more failing tests remain
Step 9: No failures — run audits to discover new work
```

Failing tests ARE the work queue. `pnpm test` shows the backlog. No GitHub issues, no labels, no story lifecycle.

### 5. Tests as executable specifications

Two kinds of tests drive the pipeline:

**Belief tests** (`__tests__/beliefs/`) — product assumptions written as failing tests:
```typescript
/**
 * Belief: Trip creation should be lightweight
 * Confirm: completion rate > 90% after simplifying
 */
test('CreateTripScreen has at most 3 required fields', () => { ... });
```

**Constraint tests** (`__tests__/structure/`) — architectural rules that enforce themselves:
```typescript
/**
 * Constraint: Dependency Direction
 * DENY: components importing stores
 */
test('components never import stores', () => { ... });
```

The JSDoc IS the spec. The test IS the enforcement. The pipeline reads both to understand what to build and whether it succeeded.

### 6. Audits discover new work by writing failing tests

| Audit | Writes failing tests for |
|---|---|
| `/code-audit` | Constraint violations (code doesn't match structural test rules) |
| `/ux-review` | UX gaps (user journey doesn't match belief about experience) |
| `/test-audit` | Junk tests (tests that don't catch bugs need rewriting) |
| `/context-audit` | Drift (code changed but context/beliefs not updated) |

After an audit writes failing tests, the pipeline picks them up on the next cycle.

## Daily audits

### `/code-audit` (daily)

Walks every folder CLAUDE.md, follows `See:` links to structural tests, checks if code violates the constraint JSDoc rules. Writes failing tests for violations found.

### `/context-audit` (daily)

1. **Drift detection** — reads `.claude/dirty-files` (accumulated by PostToolUse hook at zero token cost), gets focused `git diff` of what changed since last audit, greps `.context/` and `__tests__/structure/` for affected files
2. **Schema staleness** — checks `metadata.lastVerified` on country schemas
3. **Belief lifecycle** — flags hypotheses older than 60 days for re-evaluation
4. **Constraint coverage** — every structural test must have a Constraint JSDoc header
5. **Cross-reference integrity** — all `See:` links and `.context/` references resolve

### `/ux-review` (daily)

Evaluates user journeys against `e2e/mobile/full-e2e.test.ts` (the test IS the journey definition). Writes failing belief tests for UX gaps.

### `/test-audit` (weekly)

Scores existing tests by "what bug would this catch?" — not coverage percentage. Writes failing belief tests asserting the correct test quality.

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
