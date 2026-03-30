---
name: apply-knowledge
description: Scan codebase and fix violations against a structural test or .context/ file
argument-hint: "<constraint-file> [--dry-run] [--scope src/components]"
---

# /apply-knowledge — Scan and Fix Against a Constraint File

Takes a single structural test (`__tests__/structure/*.test.ts`) or `.context/` file, scans the relevant codebase for violations, and fixes them. Unlike `/knowledge-audit` (which audits ALL knowledge but only reports), this skill focuses on ONE constraint source and actively implements fixes.

## Prerequisites

- Project builds cleanly (`pnpm typecheck` and `pnpm test` pass)
- Knowledge graph engine available (`scripts/knowledge-graph.ts`)
- The target constraint file exists and has concrete rules

## Usage
```
/apply-knowledge styling.test.ts                    # Fix styling violations everywhere
/apply-knowledge component-testids.test.ts          # Add missing testIDs
/apply-knowledge dependency-direction.test.ts       # Fix import boundary violations
/apply-knowledge storage-boundary.test.ts --scope src/hooks       # Only scan hooks directory
/apply-knowledge form-engine.test.ts --dry-run      # Report only, don't fix
```

## Step 1: Load the constraint file and check assumptions

Read the specified structural test or `.context/` file. Extract:
- **Rules**: concrete "do this" statements (from JSDoc headers in structural tests, or from `.context/` file content)
- **Anti-patterns**: concrete "never do this" statements
- **Scope**: which directories/file types the rules apply to (infer from the content or use `--scope`)

If the file is a **structural test** (`__tests__/structure/`), read its JSDoc header — it declares the constraints being enforced and the scope of directories to scan. Also check if any referenced beliefs in `src/config/beliefs.ts` are hypotheses. If a constraint is justified by an unconfirmed belief, note this before mass-fixing code against it.

If the file is a **`.context/` file**, read its content for patterns, decisions, or external context that inform the rules.

## Step 2: Determine what to scan

Read the constraint file's scope — for structural tests, the JSDoc header or test assertions indicate which directories are covered. For `.context/` files, infer from the content.

If `--scope` provided, use that override instead.

If the file has no clear scope, infer from its content — which directories do its rules apply to?

## Step 3: Scan for violations

For each rule and anti-pattern in the constraint file, scan the scope:

- **Grep-based rules** ("never import X", "always use Y") → grep and collect violations
- **Structural rules** ("files must follow pattern X") → list files and check
- **Content rules** ("use searchable_select for dropdowns") → parse files and validate

Collect all violations with file path, line number, and the specific rule violated.

## Step 4: Fix violations (if not --dry-run)

Follow the fix-strategy rules: fix one file at a time, run typecheck after each, never use `any`.
If a fix requires judgment (not mechanical), skip and create a GitHub issue for it.

### Fix patterns by knowledge type:

**Import boundary violations** → update the import to use the correct path/service
**Missing testID** → add `testID` prop to the interactive element
**Wrong field type in schema** → change the type, add options if needed
**Missing barrel export** → add the export to index.ts
**Anti-pattern usage** → refactor to the recommended pattern

## Step 5: Cascade — check files that reference this knowledge

Use the graph engine to find cascade effects:

```bash
npx tsx scripts/knowledge-graph.ts impact <the-file-you-changed>
```

For each affected node:
1. Read the file
2. Verify it's still consistent with the updated content
3. If a referenced fact changed (e.g., store list, field type), update it

Then regenerate the architecture diagram:
```bash
npx tsx scripts/generate-knowledge-diagram.ts
```

## Step 6: Write tests for fixes

For each fix, check if a structural test already catches it:
- If yes → verify the test passes with the fix
- If no → create or update the structural test in `__tests__/structure/`

Every fix must have a test per `__tests__/structure/knowledge-test-coverage.test.ts`.

## Step 7: Verify

Follow the verification rules: run `pnpm lint`, `pnpm typecheck`, `pnpm test` in order; up to 6 attempts.

## Step 8: Report

Summary of what was done:
- Files scanned
- Violations found (by rule)
- Violations fixed
- Violations skipped (needs judgment — created GitHub issues)
- Tests created/updated

## Guardrails
- Design guideline violations (typography, motion, ux-writing) that require subjective judgment — report them but let a human decide
- Violations in generated files (`e2e/screenshots/`) — regenerate by running E2E test
- Violations that would break other code — create a GitHub issue for a story
