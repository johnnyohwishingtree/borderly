---
name: update-architecture
description: Update architecture diagrams and documentation after code changes
---

# /update-architecture — Update Architecture Docs

Update architecture documentation to reflect the current state of the codebase. Run this after navigation changes, new screens, or storage layer modifications.

## Usage
```
/update-architecture               # Update all docs
```

## Steps

### Step 1: Identify What Changed

```bash
# Check recent commits for structural changes
git log --oneline -10
git diff HEAD~5 --name-only | grep -E '(navigation|types\.ts|Navigator|Screen\.tsx|stores/|services/)' | head -20
```

Look for:
- New/removed screens in `src/screens/`
- Navigation changes in `src/app/navigation/`
- New stores or store field changes
- New services or service reorganization
- New hooks

### Step 2: Update CLAUDE.md

Read `CLAUDE.md` and update these sections if affected:

**Project Structure** — if directories or files were added/removed/moved:
```
src/
├── screens/
│   └── <new-domain>/    # Add new screen domains
├── services/
│   └── <new-service>/   # Add new service domains
```

**Implementation Status** — if a new sprint or feature was completed, add a new sprint section following the existing format.

**Accessibility Standards** — if new a11y test files were created, add them to the "Existing a11y test files" list.

### Step 3: Update docs/mvp-proposal.md

Read `docs/mvp-proposal.md` and update if:
- New user-facing features were added
- Storage architecture changed
- Security model changed
- New screens affect the user flow diagrams

### Step 4: Update .claude/index.md

If any `.claude/` files were added, removed, or renamed:
- Update the Rules table
- Update the Skills table
- Update the Templates/Rubrics table

### Step 5: Regenerate Flow Graph

If navigation structure changed:
```bash
npx tsx e2e/scripts/generate-flow-graph.ts
```

Verify the output at `e2e/screenshots/flow-graph.json`.

### Step 6: Verify

```bash
pnpm typecheck
```

Documentation changes don't need full test runs, but verify type definitions if `types.ts` was updated.

### Step 7: Summary

Report:
- Docs updated (with specific sections changed)
- Flow graph regenerated (if applicable)
- Stale documentation identified but not updated (if any)
