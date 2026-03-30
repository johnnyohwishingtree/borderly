# Borderly System: Spec-Driven Development

How the autonomous AI pipeline develops, verifies, and evolves the codebase.

## Architecture

Everything is a test. Work flows through three stages:

```
Spec                    →    Test                    →    Structural test
*.spec.test.ts               *.test.ts                    __tests__/constraints/*.test.ts
test.skip                    active                       active + Constraint: JSDoc
"build this"                 "this is true"               "this must ALWAYS be true"
temporary                    permanent                    permanent, cross-cutting
```

- **Specs** — pending work. `test.skip` in `*.spec.test.ts`. The pipeline's backlog.
- **Tests** — graduated specs. Regular `.test.ts` files. Prevent regression on specific code.
- **Constraint tests** — tests promoted to cross-cutting rules. Live in `__tests__/constraints/` with `Constraint:` JSDoc headers. Enforce architectural patterns across the entire codebase.

Most specs graduate to regular tests. A spec only becomes a constraint test when the rule applies to ALL code of that type (e.g., "no component may import a store" — not just one component).

When two tests conflict (oscillating failures during verification), a **conflict resolution spec** is written in `__tests__/conflicts/` with `Conflict:` JSDoc referencing both tests. The pipeline resolves conflicts by reading both sides, applying priority (regulatory > architectural > cognitive > market > feature), and either narrowing one test's scope or finding a compatible implementation.

## Definitions

| Term | In this codebase | Example |
|---|---|---|
| **Spec** | A `test.skip` in a `*.spec.test.ts` file asserting what SHOULD be true about our code but isn't yet. The pipeline's work queue. | `test.skip('CreateTripScreen has at most 3 fields', () => {...})` |
| **Constraint** | An active test in `__tests__/constraints/` with a JSDoc header. Enforced automatically at `pnpm test`. Permanent. | `dependency-direction.test.ts` — DENY: components importing stores |
| **Decision** | A rejected alternative documented in a constraint test's JSDoc (`Decision:` / `Rejected:` fields). Explains WHY the code is the way it is. | `bare-react-native.test.ts` — "Rejected Expo because of native module access" |
| **Conflict resolution spec** | A `test.skip` in `__tests__/conflicts/` with `Conflict:` JSDoc referencing two contradicting tests. Pipeline reads both sides, applies priority, resolves. | `__tests__/conflicts/fast-load-vs-full-validation.spec.test.ts` |
| **External context** | A truth about the world outside our code. We can't change it. Prose in `.context/external/`. | "GDPR requires data minimization", "Japan portal has 47 fields" |
| **Folder CLAUDE.md** | A pointer file in source directories. `See:` links connect code to its governing constraints and types. | `src/stores/CLAUDE.md` → `See: __tests__/constraints/dependency-direction.test.ts` |

### What is NOT in this system

| Old term | Where it went |
|---|---|
| Knowledge files | Deleted. Constraints are tests. Models are types. |
| Beliefs | Renamed to specs. `test.skip` in `*.spec.test.ts`. |
| Facts | External → `.context/external/`. Internal → deleted (code IS the fact). |
| Policies | Absorbed into constraint test JSDoc headers. |
| Decisions | Absorbed into constraint test JSDoc (Decision/Rejected fields). |
| Stories/Epics | Eliminated. Specs replace stories. `test.skip` is the work queue. |
| Models | TypeScript types in `src/types/`. |

## Philosophy

**Knowledge is code.** Constraints are structural tests. Specs are skipped tests. Models are TypeScript types. Everything that CAN be code IS code — because code enforces itself and prose drifts.

What remains as prose (in `.context/`) is only what can't be code: government portal behavior, laws, human cognition, and rejected alternatives.

```
Source of truth hierarchy:

  Constraint tests (__tests__/constraints/)    ← constraints, enforced at pnpm test
  TypeScript types (src/types/)              ← models, enforced by compiler
  Spec tests (*.spec.test.ts)               ← pending work, tracked with JSDoc
  Folder CLAUDE.md (src/**/CLAUDE.md)        ← pointers to constraints + types
  External context (.context/external/)      ← things outside our control (prose)
```

## How work flows through the system

### 1. Work enters as skipped spec tests

Work comes from two sources:

**Human requests** → run `/plan` which writes `test.skip` spec tests:
```
User: "simplify trip creation"
/plan → reads CLAUDE.md, folder CLAUDE.md, identifies CreateTripScreen
     → writes __tests__/screens/trips/CreateTripScreen.spec.test.ts (test.skip)
```

**Audits** → write `test.skip` spec tests for violations found:

| Audit | Frequency | Discovers | Output |
|---|---|---|---|
| `/code-audit` | Daily | Code violating structural test constraints | `*.spec.test.ts` with `test.skip` |
| `/ux-audit` | Daily | UX gaps in user journeys | `*.spec.test.ts` with `test.skip` |
| `/test-audit` | Weekly | Junk tests needing rewrite | `*.spec.test.ts` with `test.skip` |
| `/context-audit` | Daily | Drift, staleness, spec lifecycle | Updates `.context/` and spec test JSDoc directly |

### 2. Spec test anatomy

```typescript
// __tests__/screens/trips/CreateTripScreen.spec.test.ts
/**
 * Spec: Trip creation should be lightweight — name + country only.
 *
 * Confirm: Trip creation completion rate > 90% after simplifying
 * Invalidate: Users need flight/accommodation at creation time
 */
test.skip('CreateTripScreen LegCard does not have flight detail fields', () => {
  const content = readFileSync(resolve(ROOT, 'src/screens/.../LegCard.tsx'), 'utf-8');
  expect(content).not.toMatch(/flightNumber/);
});
```

Key properties:
- **Colocated** — lives in `__tests__/` mirroring the source it tests, named `*.spec.test.ts`
- **Skipped** — `test.skip` means "this should be true but isn't yet." Commits cleanly.
- **Self-describing** — JSDoc has the what, confirm, and invalidate criteria
- **Asserting end state** — "has 3 fields" not "remove 9 fields"

### 3. Pipeline resolves skipped tests (`/pipeline`, hourly)

```
Step 1: Sync — git pull + cleanup stale PRs
Step 2: Find skipped tests — conflicts first, then specs, then constraints
Step 3: Read the skipped test's JSDoc — understand intent
        If Conflict: JSDoc → read both referenced tests, apply priority hierarchy
Step 4: Read folder CLAUDE.md → constraints → types — understand context
Step 5: Implement + unskip (test.skip → test) + graduate (.spec.test.ts → .test.ts)
Step 6: Verify — pnpm lint, typecheck, test (ALL tests must pass)
        If oscillating failures → conflict detected → write resolution spec
Step 7: Push, PR, merge
Step 8: Loop back to Step 2 if more skipped tests remain
Step 9: No skipped tests — run audits to discover new work
```

**Conflict priority hierarchy:** regulatory > architectural > cognitive > market > feature

`test.skip` = the work queue. Graduating to `.test.ts` = work done. Commit gate is never violated.

### 4. Two kinds of tests

**Spec tests** (`*.spec.test.ts`, colocated) — pending work:
```typescript
test.skip('CreateTripScreen has at most 3 required fields', () => { ... });
// Pipeline unskips → implements → graduates to .test.ts → merges
```

**Constraint tests** (`__tests__/constraints/`) — permanent architectural rules:
```typescript
/**
 * Constraint: Dependency Direction
 * DENY: components importing stores
 */
test('components never import stores', () => { ... });
```

### 5. Audits discover new work

| Audit | What it does |
|---|---|
| `/code-audit` | Walks folder CLAUDE.md → reads structural test JSDoc → checks code → writes `*.spec.test.ts` for violations |
| `/ux-audit` | Evaluates user journeys → writes `*.spec.test.ts` for UX gaps |
| `/test-audit` | Scores test quality → writes `*.spec.test.ts` for junk test rewrites |
| `/context-audit` | Drift detection, schema staleness, spec lifecycle (no tests written) |

## How the file change hook works

```
You work normally
  → PostToolUse hook silently appends changed src/ paths to .claude/dirty-files
  → Zero tokens, zero overhead — shell script with no stdout

.claude/dirty-files accumulates across conversations

/context-audit runs daily
  → Reads dirty-files + last-audit-hash
  → git diff <last-hash>..HEAD -- <dirty-files>
  → Greps .context/ and __tests__/constraints/ for references
  → Finds drift, updates context, clears dirty-files
```

## Where everything lives

```
.claude/
├── rules/                     # Auto-loaded every session (commit-gate, output-location)
├── skills/                    # Workflow orchestrators
├── hooks/post-tool-track.sh   # Silent file change tracking
└── settings.json              # Hook registration

.context/
├── external/
│   ├── countries/             # 15 country files — government portal behavior
│   ├── regulatory/            # 5 files — laws (GDPR, PII, ToS)
│   ├── cognitive/             # 6 files — human behavior (touch targets, reading)
│   ├── customer/              # 5 files — user behavior (borders, families)
│   ├── market/                # 3 files — competitive landscape
│   └── tools/                 # 7 files — library/OS/LLM properties
├── CLAUDE.md                  # What goes here and what doesn't
└── SYSTEM.md                  # This file

__tests__/constraints/           # Constraint tests (permanent architectural rules)
__tests__/conflicts/             # Conflict resolution specs (two tests contradict)
*.spec.test.ts                 # Specs as colocated test.skip (pending work)
src/**/CLAUDE.md               # Folder guardrails pointing to constraints + types
```

## Principles (codified, not prose)

These principles are embodied in the system, not written as separate files:

- **Constraints are code** — if it can be a test, it's a test. If it can be a type, it's a type. Prose is last resort.
- **Single source of truth** — the test IS the constraint AND the documentation. One file, zero drift.
- **Specs are pending work** — `test.skip` in `*.spec.test.ts` = "this should be true." Graduation to `.test.ts` = done.
- **External context is separate** — things we don't control live in `.context/`, not mixed with our code.
- **Learning is concrete** — "write a spec test" or "write a structural test", not "update knowledge."
- **Zero-token hooks** — file tracking costs nothing; LLM analysis is batched into daily audits.
- **Shell over LLM for deterministic work** — grep, git diff, file append don't need an AI agent.
