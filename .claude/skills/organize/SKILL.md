---
name: organize
description: Reorganize file structure so tests mirror source layout
---

# /organize — Reorganize File Structure

Ensure the test directory mirrors the source structure and files are in their correct domain locations.

## Usage
```
/organize              # Full reorganization audit
```

## Steps

### Step 1: Map Source to Test Structure

The project convention is:

| Source path | Test path |
|------------|-----------|
| `src/services/<domain>/<file>.ts` | `__tests__/services/<domain>/<file>.test.ts` |
| `src/components/<domain>/<Component>.tsx` | `__tests__/components/<domain>/<Component>.test.tsx` |
| `src/hooks/<hook>.ts` | `__tests__/hooks/<hook>.test.ts` |
| `src/stores/<store>.ts` | `__tests__/stores/<store>.test.ts` |
| `src/utils/<util>.ts` | `__tests__/utils/<util>.test.ts` |
| `src/screens/<domain>/<Screen>.tsx` | `__tests__/screens/<domain>/<Screen>.test.tsx` |
| `src/components/<domain>/<C>.tsx` (a11y) | `__tests__/components/<domain>/<C>.a11y.test.tsx` |

Scan for:
- Test files in flat directories that should be in subdirectories
- Test files whose source file moved but the test didn't follow
- Duplicate test files (same source, two test locations)

### Step 2: Check Domain Placement

Source files should be in their correct domain:
- Storage services in `src/services/storage/`
- Form engine in `src/services/forms/`
- Submission logic in `src/services/submission/`
- Error handling in `src/services/error/`
- Monitoring in `src/services/monitoring/`
- Navigation in `src/app/navigation/`

Look for files in `src/utils/` that belong in a service domain.

### Step 3: Move Files

Use `git mv` to preserve history:
```bash
git mv old/path/file.ts new/path/file.ts
```

After each move, follow `.knowledge/policies/workflow/fix-strategy.md` — update imports, barrels, typecheck after each file.

### Step 4: Remove Duplicates

If duplicate test files exist (same tests, different locations):
1. Keep the one at the correct path
2. Delete the other with `git rm`
3. Run `pnpm test` to verify

### Step 5: Verify

Follow `.knowledge/policies/workflow/verification.md`.

### Step 6: Summary

Report:
- Files moved (old path -> new path)
- Duplicates removed
- Import updates made
- Test count before/after (should be equal — reorganizing, not deleting)
