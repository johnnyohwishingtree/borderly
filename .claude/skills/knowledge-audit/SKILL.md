---
name: knowledge-audit
description: Audit code against .knowledge/ conventions — find violations, evaluate fixes, propose test strategies
argument-hint: "[--dry-run] [layer: services|stores|components|hooks|screens|schemas]"
---

# /knowledge-audit — Code vs Knowledge Compliance Audit

Checks whether code in each folder actually follows the rules declared in its CLAUDE.md and linked `.knowledge/` files. For each violation, evaluates whether to fix the code or update the knowledge, and proposes a test strategy to prevent regression.

Differs from `/audit` (which checks drift, dead code, and index sync). This skill focuses specifically on whether the code conforms to the documented conventions.

## Step 1: For each folder CLAUDE.md, read the rules

For each folder with a CLAUDE.md:
1. Read the CLAUDE.md
2. Read all linked `.knowledge/` files (the `See:` references)
3. Extract the concrete rules (both "do this" and "anti-patterns")

## Step 2: Check code against rules

For each rule, run the appropriate check:

For each policy file in `.knowledge/policies/`, read its SCOPE and RULES sections, then check the scoped directories:

- Read the **SCOPE** to know which directories to scan
- Read each **RULE** (ALLOW/DENY/REQUIRE) and grep/parse the scoped files
- Check **EXCEPTIONS** — don't flag legitimate exceptions
- Verify **ENFORCEMENT** test exists and passes

Policy files are organized by scope:
- `policies/architecture/` — dependency direction, file boundaries, local-first
- `policies/data/` — storage tiers, PII boundary, schema fields
- `policies/ui/` — styling, typography, motion, accessibility, ux-writing
- `policies/state/` — hook conventions, store boundaries
- `policies/testing/` — test conventions, e2e testability, drift detection
- `policies/platform/` — native modules, navigation

Also check `.knowledge/models/` for invariant violations in business logic.

## Step 3: Check knowledge test coverage

For each `.knowledge/conventions/` file, verify a structural test exists that enforces it. Compare against `__tests__/structure/`:

| Convention | Expected test |
|---|---|
| `dependency-direction.md` | `dependency-direction.test.ts` |
| `e2e-testability.md` | `maestro-registry-sync.test.ts` + `component-testids.test.ts` |
| `security-boundary.md` | `pii-boundary.test.ts` |
| `styling.md` | `no-space-x.test.ts` + `smart-component-usage.test.ts` |
| `state-management.md` | `hooks-barrel.test.ts` |
| `navigation.md` | `screen-folder-convention.test.ts` |
| `native-modules.md` | `native-module-mocks.test.ts` |
| `accessibility/` | `accessibility-props.test.ts` |
| `testing.md` | (meta — testing conventions aren't structurally testable) |
| `typography.md` | (design guideline — not structurally testable) |
| `motion.md` | (design guideline — not structurally testable) |
| `ux-writing.md` | (design guideline — not structurally testable) |

For any policy **without** a structural test:
1. Read its ENFORCEMENT section — does it reference a test?
2. If no test exists → write one and add it to `__tests__/structure/`
3. If the policy is a design guideline (typography, motion, ux-writing) → skip but note it
4. Add new policies to `knowledge-test-coverage.test.ts` mapping

Also check `.knowledge/models/` — model invariants may need validation tests.

**New knowledge files added since last audit** should be flagged if not mapped in `knowledge-test-coverage.test.ts`.

## Step 4: Evaluate each finding

For every violation, decide:

**Code is wrong** → the convention is correct, code needs fixing
**Knowledge is stale** → the code is intentionally different, update the knowledge

## Step 5: Propose test strategy for each code fix

Every fix needs a test to prevent regression. For each violation, specify:

| Violation type | Test strategy |
|---|---|
| Dependency direction | Structural test: grep imports at `pnpm test` time (already exists in screen-folder-convention tests) |
| Store in component | Add to existing dependency-direction structural test |
| Missing testID | Add to `maestro-registry-sync.test.ts` — registers the testID in screenRegistry |
| PII in wrong storage | Unit test: verify `stripPIIFromFormData` strips the field |
| Schema field type wrong | Schema validation test in `__tests__/schemas/` |
| Hooks barrel missing export | Structural test: compare files to exports |
| Screen naming | Already covered by `screen-folder-convention.test.ts` |

If no existing test covers the violation, create one. The test should run at `pnpm test` time (< 1 second) so it catches drift immediately.

## Step 6: Check knowledge consistency

Scan for contradictions between knowledge files. Two files should never give opposite instructions about the same topic.

### How to check:

**1. Extract rules by topic.** For each knowledge file, list the concrete rules as topic + instruction:
```
styling.md:       [inline-styles] → AVOID (prefer className)
e2e-testability.md: [inline-styles] → OK (for computed values)
```

**2. Cluster by shared topics.** Find files that mention the same concepts (e.g., "testID", "Keychain", "inline styles", "barrel export", "autoFillSource"). These are the files that could contradict.

**3. Compare instructions.** For each shared topic, check if the files agree:
- **Consistent**: both say the same thing, or one is a scoped exception of the other (e.g., "avoid inline styles" + "inline styles OK for animations" — the exception is scoped)
- **Contradictory**: one says "always do X" and another says "never do X" with no scoping — this is a conflict that needs resolving

### Common conflict patterns:
- Anti-pattern in file A is a recommendation in file B (without scoping)
- Two files define different rules for the same field/component/pattern
- A folder CLAUDE.md links to two knowledge files that disagree
- A convention was updated but files that reference it still describe the old rule

### When a conflict is found:
- Determine which file is authoritative (usually the more specific one)
- Update the other file to reference the authoritative rule or add explicit scoping
- Add to gaps.md under `## Knowledge updates`

## Step 7: Write all findings to gaps.md

Write findings to `.knowledge/gaps.md` with the test strategy included:

```markdown
## Code fixes
- `src/components/guide/CopyableField.tsx` — copy button missing testID. Test: add to screenRegistry + maestro-registry-sync catches it. (knowledge-audit-YYYY-MM-DD)
```

## Step 8: Fix or create stories (if not --dry-run)

- **Quick fixes** (< 5 minutes): fix inline and commit
- **Larger fixes**: create a story with the test strategy in the acceptance criteria

## What NOT to flag
- Inline styles that are acceptable per `.knowledge/conventions/styling.md` exceptions
- Fields without `autoFillSource` that are `countrySpecific: true`
- Empty `.knowledge/` directories
