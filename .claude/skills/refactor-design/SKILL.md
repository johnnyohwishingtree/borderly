---
name: refactor-design
description: Audit and fix architecture issues in the Borderly codebase
argument-hint: "[area to audit, e.g. 'stores', 'services', 'screens']"
---

# /refactor-design — Architecture Audit and Refactoring

Identify and fix architecture issues: dependency violations, oversized files, missing abstractions, and coupling problems.

## Usage
```
/refactor-design                   # Audit entire codebase
/refactor-design stores            # Focus on store layer
/refactor-design services/forms    # Focus on form engine services
```

## Steps

### Step 1: Load Architecture Rules

Read the enforced constraints:
- `.knowledge/policies/architecture/dependency-direction.md` — Screens -> Hooks -> Stores -> Services
- `.knowledge/policies/state/hook-conventions.md` — Extract business logic into hooks
- `.knowledge/models/form-engine.md` — Smart components for specialized fields
- `.claude/rules/file-size-limits.md` — Files under 500 lines

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
- Direct OS Keychain access outside `src/services/storage/`

### Step 3: Plan Refactoring

For each issue found, plan the fix:
1. What to extract/move
2. New file paths
3. Import updates needed
4. Tests to update

Present the plan before implementing if it touches 5+ files.

### Step 4: Implement (One File at a Time)

Follow `.claude/rules/fix-strategy.md`:
1. Fix one file
2. Run `pnpm typecheck` — verify error count didn't increase
3. Fix any new errors before moving on
4. Repeat

**When splitting files:**
- New subdirectory gets a barrel `index.ts`
- Update all imports from the old file
- Verify no direct imports of the old file remain
- Run `pnpm test` after all splits

### Step 5: Verify

```bash
pnpm lint && pnpm typecheck && pnpm test
```

### Step 6: Summary

Report:
- Violations found and fixed
- Files created, moved, or split
- Dependency graph improvements
- Remaining issues (if any) with rationale
