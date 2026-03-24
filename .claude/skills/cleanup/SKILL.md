---
name: cleanup
description: Find and remove unused, temporary, or accidentally committed files
---

# /cleanup — Remove Unused Files

Find and remove unused source files, dead imports, temporary artifacts, and accidentally committed files.

## Usage
```
/cleanup                # Full cleanup scan
```

## Steps

### Step 1: Check for Accidentally Committed Files

Scan for files that should be in `.gitignore`:
- `node_modules/` anywhere in the tree
- `ios/Pods/`, `ios/build/`, `android/build/`
- Coverage reports (`coverage/`, `*.lcov`)
- Build artifacts (`dist/`, `*.tsbuildinfo`)
- OS files (`.DS_Store`, `Thumbs.db`)
- Temp files (`*.tmp`, `*.bak`, `*.orig`)

```bash
git ls-files | grep -E '(node_modules|\.DS_Store|Pods/|build/|coverage/|dist/|\.tmp$|\.bak$)'
```

### Step 2: Find Unused Source Files

For each source file in `src/`, check if it's imported anywhere:
```bash
# For a file src/utils/foo.ts, check if any other file imports it
grep -r "from.*foo" src/ --include="*.ts" --include="*.tsx" -l
```

Common locations for dead code:
- `src/utils/` — utility files that were replaced but not deleted
- `src/services/` — services that were superseded by facades
- `src/components/` — components replaced by newer versions

**Do not delete** files that are:
- Only imported in tests (the test is their consumer)
- Re-exported from barrel `index.ts` files (check transitive consumers)
- Schema files (`src/schemas/*.json`) — referenced dynamically

### Step 3: Find Unused Test Files

Tests for deleted source files:
```bash
# Find test files whose source counterpart doesn't exist
find __tests__ -name "*.test.ts" -o -name "*.test.tsx" | while read test; do
  source=$(echo "$test" | sed 's|__tests__/|src/|' | sed 's|\.test\.\(ts\|tsx\)|\.\1|')
  [ ! -f "$source" ] && echo "Orphaned test: $test"
done
```

### Step 4: Update .gitignore

If files were found that should be ignored, add patterns to `.gitignore`:
```bash
echo "pattern" >> .gitignore
```

### Step 5: Remove Identified Files

Use `git rm` for tracked files:
```bash
git rm <file>              # For tracked files
rm <file>                  # For untracked files
```

### Step 6: Verify

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Ensure no imports broke from the removals.

### Step 7: Summary

Report:
- Files removed (with rationale for each)
- `.gitignore` patterns added
- Disk space recovered
