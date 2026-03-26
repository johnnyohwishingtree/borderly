---
name: apply-knowledge
description: Scan codebase and fix violations against a specific .knowledge/ file
argument-hint: "<knowledge-file> [--dry-run] [--scope src/components]"
---

# /apply-knowledge — Scan and Fix Against a Knowledge File

Takes a single `.knowledge/` file, scans the relevant codebase for violations, and fixes them. Unlike `/knowledge-audit` (which audits ALL knowledge but only reports), this skill focuses on ONE knowledge file and actively implements fixes.

## Usage
```
/apply-knowledge styling.md                    # Fix styling violations everywhere
/apply-knowledge e2e-testability.md             # Add missing testIDs
/apply-knowledge dependency-direction.md        # Fix import boundary violations
/apply-knowledge storage.md --scope src/hooks   # Only scan hooks directory
/apply-knowledge form-engine.md --dry-run       # Report only, don't fix
```

## Step 1: Load the knowledge file

Read the specified `.knowledge/` file. Extract:
- **Rules**: concrete "do this" statements
- **Anti-patterns**: concrete "never do this" statements
- **Scope**: which directories/file types the rules apply to (infer from the content or use `--scope`)

If the file is in `conventions/`, it applies to source code.
If the file is in `concepts/`, it applies to architecture/structure.
If the file is in `domain/`, it applies to schemas/business logic.

## Step 2: Determine what to scan

Map the knowledge file to the directories it governs:

| Knowledge file | Default scan scope |
|---|---|
| `styling.md` | `src/components/`, `src/screens/` |
| `state-management.md` | `src/hooks/`, `src/screens/` |
| `dependency-direction.md` | `src/stores/`, `src/services/`, `src/components/`, `src/hooks/` |
| `e2e-testability.md` | `src/components/`, `maestro/` |
| `storage.md` | `src/services/`, `src/hooks/` |
| `native-modules.md` | `ios/`, `e2e/mocks/`, `jest.setup.js` |
| `testing.md` | `__tests__/` |
| `form-engine.md` | `src/schemas/`, `src/services/forms/`, `src/components/forms/` |
| `typography.md` | `src/components/ui/`, `src/screens/` |
| `motion.md` | `src/components/ui/` |
| `ux-writing.md` | `src/screens/`, `src/components/` |
| `accessibility/*` | `src/components/` |

Override with `--scope` if provided.

## Step 3: Scan for violations

For each rule and anti-pattern in the knowledge file, scan the scope:

- **Grep-based rules** ("never import X", "always use Y") → grep and collect violations
- **Structural rules** ("files must follow pattern X") → list files and check
- **Content rules** ("use searchable_select for dropdowns") → parse files and validate

Collect all violations with file path, line number, and the specific rule violated.

## Step 4: Fix violations (if not --dry-run)

For each violation, apply the fix:
- One file at a time (per `.claude/rules/fix-strategy.md`)
- Run `pnpm typecheck` after each file to catch breakage
- If a fix requires judgment (not mechanical), skip and add to gaps.md

### Fix patterns by knowledge type:

**Import boundary violations** → update the import to use the correct path/service
**Missing testID** → add `testID` prop to the interactive element
**Wrong field type in schema** → change the type, add options if needed
**Missing barrel export** → add the export to index.ts
**Anti-pattern usage** → refactor to the recommended pattern

## Step 5: Write tests for fixes

For each fix, check if a structural test already catches it:
- If yes → verify the test passes with the fix
- If no → create or update the structural test in `__tests__/structure/`

Every fix must have a test. See `.claude/rules/knowledge-must-have-tests.md`.

## Step 6: Verify

```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Step 7: Report

Summary of what was done:
- Files scanned
- Violations found (by rule)
- Violations fixed
- Violations skipped (needs judgment — added to gaps.md)
- Tests created/updated

## What NOT to fix
- Design guideline violations (typography, motion, ux-writing) that require subjective judgment — report them but let a human decide
- Violations in generated files (`maestro/flows/generated/`) — regenerate instead
- Violations that would break other code — add to gaps.md for a story
