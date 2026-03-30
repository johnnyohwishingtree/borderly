---
name: refactor-design
description: Audit and fix architecture issues in the Borderly codebase
argument-hint: "[area to audit, e.g. 'stores', 'services', 'screens']"
---

# /refactor-design — Architecture Audit and Refactoring

Identify and fix architecture issues: dependency violations, oversized files, missing abstractions, and coupling problems.

## Prerequisites

- Project builds cleanly (`pnpm typecheck` and `pnpm test` pass)
- Architecture policies reviewed (dependency-direction, hook-conventions)
- Existing code in the target area has been read

## Usage
```
/refactor-design                   # Audit entire codebase
/refactor-design stores            # Focus on store layer
/refactor-design services/forms    # Focus on form engine services
```

## Steps

### Step 1: Load Architecture Rules

Read the enforced constraints:
- `__tests__/structure/dependency-direction.test.ts` — Screens -> Hooks -> Stores -> Services
- `__tests__/structure/hooks-barrel.test.ts` — Extract business logic into hooks
- `src/types/schema.ts` — Form engine types and smart component definitions
- `__tests__/structure/screen-folder-convention.test.ts` — Files under 500 lines

### Step 2: Scan for Violations

**Dependency direction violations:**
```
Screens -> Hooks -> Stores -> Services (correct)
```
Check for:
- Components importing stores directly (should use hooks)
- Services importing stores (should accept params)
- Stores importing other stores (cross-store coordination belongs in hooks)

**File size violations:**
- Source files over 500 lines need splitting
- Screens over 300 lines likely have extractable hooks

**Missing abstractions:**
- Hooks importing 4+ services from the same domain (need a facade)
- Duplicated logic across multiple screens (needs a shared hook)
- Inline JS scripts in screens (should be in services)

**Coupling issues:**
- Business logic in screen render functions
- State management mixed with UI code
- Storage boundary violations — check `__tests__/structure/storage-boundary.test.ts` for storage boundary rules

### Step 3: Plan Refactoring

For each issue found, plan the fix:
1. What to extract/move
2. New file paths
3. Import updates needed
4. Tests to update

Present the plan before implementing if it touches 5+ files.

### Step 4: Implement (One File at a Time)

Follow `the fix-strategy rules: fix one file at a time, run typecheck after each, never use `any``.

**When splitting files:**
- New subdirectory gets a barrel `index.ts`
- Update all imports from the old file
- Verify no direct imports of the old file remain

### Step 5: Verify

Follow `the verification rules: run `pnpm lint`, `pnpm typecheck`, `pnpm test` in order; up to 6 attempts`.

### Step 6: Summary

Report:
- Violations found and fixed
- Files created, moved, or split
- Dependency graph improvements
- Remaining issues (if any) with rationale

## Guardrails

- Present plan before implementing if 5+ files touched
- Don't refactor without running tests
