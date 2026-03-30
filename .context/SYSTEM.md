# Borderly System: Constraint-Driven Development

How the autonomous AI pipeline develops, verifies, and evolves the codebase.

## Philosophy

**Knowledge is code.** Constraints are structural tests. Beliefs are skipped tests with JSDoc. Models are TypeScript types. Everything that CAN be code IS code — because code enforces itself and prose drifts.

What remains as prose (in `.context/`) is only what can't be code: government portal behavior, laws, human cognition, rejected alternatives, and multi-step recipes not yet automated.

```
Source of truth hierarchy:

  Structural tests (__tests__/structure/)    ← constraints, enforced at pnpm test
  TypeScript types (src/types/)              ← models, enforced by compiler
  Belief tests (*.beliefs.test.ts)           ← assumptions, tracked with JSDoc status
  Folder CLAUDE.md (src/**/CLAUDE.md)        ← pointers to constraints + types
  External context (.context/)               ← things outside our control (prose)
  Decisions (.context/decisions/)            ← rejected alternatives (permanent prose)
```

## How work flows through the system

### 1. Work enters as skipped belief tests

Work comes from two sources:

**Human requests** → run `/plan` which writes `test.skip` belief tests:
```
User: "simplify trip creation"
/plan → reads CLAUDE.md, folder CLAUDE.md, identifies CreateTripScreen
     → writes __tests__/screens/trips/CreateTripScreen.beliefs.test.ts (test.skip)
```

**Audits** → write `test.skip` belief tests for violations found:

| Audit | Frequency | Discovers | Output |
|---|---|---|---|
| `/code-audit` | Daily | Code violating structural test constraints | `*.beliefs.test.ts` with `test.skip` |
| `/ux-review` | Daily | UX gaps in user journeys | `*.beliefs.test.ts` with `test.skip` |
| `/test-audit` | Weekly | Junk tests needing rewrite | `*.beliefs.test.ts` with `test.skip` |
| `/context-audit` | Daily | Drift, staleness, belief lifecycle | Updates `.context/` and belief test JSDoc directly |

### 2. Belief test anatomy

```typescript
// __tests__/screens/trips/CreateTripScreen.beliefs.test.ts
/**
 * Belief: Trip creation should be lightweight — name + country only.
 *
 * Status: hypothesis
 * Confirm: Trip creation completion rate > 90% after simplifying
 * Invalidate: Users need flight/accommodation at creation time
 */
test.skip('CreateTripScreen LegCard does not have flight detail fields', () => {
  const content = readFileSync(resolve(ROOT, 'src/screens/.../LegCard.tsx'), 'utf-8');
  expect(content).not.toMatch(/flightNumber/);
});
```

Key properties:
- **Colocated** — lives in `__tests__/` mirroring the source it tests, named `*.beliefs.test.ts`
- **Skipped** — `test.skip` means "this should be true but isn't yet." Commits cleanly.
- **Self-describing** — JSDoc has the what, why, confirm, and invalidate criteria
- **Asserting end state** — "has 3 fields" not "remove 9 fields"

### 3. Pipeline resolves skipped tests (`/pipeline`, hourly)

### 4. Pipeline picks it up (`/pipeline`, hourly)

```
Step 1: Sync — git pull + cleanup stale PRs
Step 2: Find skipped belief tests — grep for *.beliefs.test.ts with test.skip
Step 3: Read the skipped test's JSDoc — understand intent
Step 4: Read folder CLAUDE.md → constraints → types — understand context
Step 5: Implement + unskip (test.skip → test)
Step 6: Verify — pnpm lint, typecheck, test (ALL tests must pass including the unskipped one)
Step 7: Push, PR, merge
Step 8: Loop back to Step 2 if more skipped tests remain
Step 9: No skipped tests — run audits to discover new work
```

`test.skip` = the work queue. Unskipping + passing = work done. Commit gate is never violated because skipped tests don't run.

### 5. Tests as executable specifications

Two kinds of tests drive the pipeline:

**Belief tests** (`*.beliefs.test.ts`, colocated with source) — product assumptions as skipped tests:
```typescript
/**
 * Belief: Trip creation should be lightweight
 * Confirm: completion rate > 90% after simplifying
 */
test.skip('CreateTripScreen has at most 3 required fields', () => { ... });
// Pipeline unskips → implements → verifies → merges
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
| `/code-audit` | Constraint violations → `test.skip` in `*.beliefs.test.ts` colocated with source |
| `/ux-review` | UX gaps → `test.skip` in `*.beliefs.test.ts` colocated with source |
| `/test-audit` | Junk tests → `test.skip` in `*.beliefs.test.ts` colocated with source |
| `/context-audit` | Drift detection, staleness, belief lifecycle (no tests written) |

After an audit writes skipped tests, the pipeline picks them up on the next cycle. Commit gate stays green because skipped tests don't run.

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
├── unvalidated/            # Staging area for new observations
├── CLAUDE.md               # Creation rules for context files
└── SYSTEM.md               # This file

__tests__/structure/        # 21 structural tests = 21 constraints
*.beliefs.test.ts           # Beliefs as colocated test.skip with JSDoc status
src/**/CLAUDE.md            # Folder guardrails pointing to constraints + types
```

## Principles (codified, not prose)

These principles are embodied in the system, not written as separate files:

- **Constraints are code** — if it can be a test, it's a test. If it can be a type, it's a type. Prose is last resort.
- **Single source of truth** — the test IS the constraint AND the documentation. One file, zero drift.
- **Beliefs are tests** — product assumptions live as `test.skip` in `*.beliefs.test.ts` with JSDoc status tracking.
- **External context is separate** — things we don't control live in `.context/`, not mixed with our code.
- **Learning is concrete** — "write a belief test" or "write a structural test", not "update knowledge".
- **Zero-token hooks** — file tracking costs nothing; LLM analysis is batched into daily audits.
- **Shell over LLM for deterministic work** — grep, git diff, file append don't need an AI agent.
