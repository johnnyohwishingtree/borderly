---
name: refactor
description: Restructure code across multiple files — move, split, scaffold, migrate tests and pointers
argument-hint: "[area or spec test]"
---

# /refactor — Multi-File Restructuring

For changes that go beyond a single spec test: moving files between directories, splitting large files, creating new screen flows, migrating tests. Use this when `/implement` is too small.

## Prerequisites

- Project builds cleanly (`pnpm test` passes)
- The restructuring is driven by one or more `*.spec.test.ts` files, or by architectural issues found during `/code-audit`

## Usage
```
/refactor screens/trips       # restructure the trip creation flow
/refactor services/forms       # split the form engine
/refactor                      # find and fix the biggest architectural issue
```

## Step 1: Understand scope

Read the spec tests or audit findings driving this refactor. Read the folder CLAUDE.md files for all affected directories. Read the structural test JSDoc for constraints that apply.

List every file that will be created, moved, renamed, or deleted.

## Step 2: Scaffold new directories

For each new directory under `src/`:
1. Create the directory
2. Create a `CLAUDE.md` with `See:` links to relevant structural tests and types
3. Create a barrel `index.ts` if it will have multiple exports

## Step 3: Move and split files

One file at a time. After each move:
1. Update all imports (grep for the old path)
2. Run `pnpm typecheck` to verify
3. If a test file exists for the moved file, move the test too (maintaining `__tests__/` mirror)

When splitting a file over 500 lines:
1. Extract into new file in the same directory
2. Re-export from the original (or update barrel)
3. Update imports

## Step 4: Migrate tests

For each moved/renamed source file:
1. Move its test to mirror the new location in `__tests__/`
2. Update `import` paths in the test
3. If a `*.spec.test.ts` exists for the file, move it too
4. Update any structural test JSDoc that references specific file paths

## Step 5: Resolve spec tests

If spec tests drove this refactor:
1. Unskip them (`test.skip` → `test`)
2. Graduate: cross-cutting → `__tests__/constraints/`, otherwise merge into `.test.ts` or rename

## Step 6: Verify

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Up to 6 attempts. ALL tests must pass.

Also verify:
- No broken `See:` links in any CLAUDE.md (`pnpm test -- __tests__/constraints/system-integrity`)
- No orphaned test files pointing to deleted source files
- New directories all have CLAUDE.md

## Guardrails

- One file move at a time — typecheck after each
- Never delete a file without grepping for all references first
- Always create CLAUDE.md for new directories
- Always move tests alongside source files
- If the refactor touches 10+ files, present the plan before implementing
