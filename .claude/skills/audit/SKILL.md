---
name: audit
description: Audit codebase for drift, dead code, and architecture violations — adds gaps to knowledge graph
argument-hint: "[--dry-run]"
---

# /audit — Codebase Health Audit

Checks that code follows folder-level CLAUDE.md conventions, detects drift, dead code, and architecture violations. Writes all findings to `.knowledge/gaps.md` and creates fix stories.

**Scheduled task prompt:**
```
Read CLAUDE.md for project context.
Read .claude/skills/audit/SKILL.md and follow every step.
```

## Step 1: Convention compliance

For each folder CLAUDE.md file, read it and all its `See:` linked `.knowledge/` files. Then check whether the code in that folder actually follows the stated rules.

### What to check per folder

**`src/stores/`** — "Stores never import other stores or hooks"
- Grep store files for imports from `../hooks/` or other store files

**`src/components/`** — "Never import stores directly"
- Grep component files for imports from `../stores/` or `useProfileStore`, `useTripStore`, etc.

**`src/services/`** — "never import stores or hooks"
- Grep service files for imports from `../stores/` or `../hooks/`

**`src/hooks/`** — "All exported from index.ts"
- Compare hook files in the directory to exports in `index.ts`

**`src/screens/`** — "Thin render layers, business logic in hooks"
- Flag screens with 5+ `useState` calls (candidates for hook extraction)

**`src/components/`** — "NativeWind tokens, not inline styles"
- Grep for `style={{` or inline hex colors (`#[0-9a-fA-F]{3,8}`)

**General (all folders with CLAUDE.md)**
- Verify every `See:` link points to an existing `.knowledge/` file
- Verify folder CLAUDE.md is 5 lines or fewer (content belongs in `.knowledge/`)

Add more checks as new folder CLAUDE.md files are created — read the rules, then verify them.

## Step 2: Structural checks

### Dead code
- Exports that nothing imports
- Modules with no corresponding test file

### Architecture violations
- Wrong dependency direction (see `.knowledge/concepts/dependency-direction.md`)
- Source files over 500 lines

### Drift
- testIDs referenced in Maestro flows that don't exist in source
- `.knowledge/` or `.claude/` path references pointing to files that don't exist
- README commands that don't match actual CLI behavior

### Index sync (`.knowledge/index.md`)
Compare the index against what actually exists on disk. Fix any mismatches directly (don't add to gaps — just update the file):
- Skills listed that don't exist (deleted but not removed from index)
- Skills that exist but aren't listed
- `.knowledge/` directories or files added but not listed in the knowledge table
- Run: `ls .claude/skills/` and `ls .knowledge/*/` and diff against index.md

## Step 3: Evaluate each finding

For every violation found, decide:

**Is the code wrong?** The convention is correct but code doesn't follow it.
- Add to `gaps.md` as a code fix
- Example: a component imports a store directly — the component should use props

**Is the knowledge stale?** The code is intentionally doing something different and the convention needs updating.
- Add to `gaps.md` as a knowledge update
- Example: a convention says "use pattern X" but the codebase has moved to pattern Y everywhere

This evaluation is critical. Don't blindly flag violations — understand whether reality or documentation is wrong.

## Step 4: Write findings to gaps.md

Write all findings to `.knowledge/gaps.md`. Each entry includes: what's wrong, where, and whether to fix code or update knowledge.

Each gap entry must include a **test strategy** — how to prevent this from recurring:

```markdown
# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes
- `src/components/trips/TripCard.tsx` imports `useTripStore` directly — should receive data via props. Test: add dependency-direction structural test. (audit-YYYY-MM-DD)
- `src/screens/Profile/Profile.tsx` has 7 useState calls — extract to `useProfile` hook. Test: hook unit tests + screen stays under 500 lines. (audit-YYYY-MM-DD)

## Knowledge updates
- `.knowledge/conventions/styling.md` says no inline styles but `StatusBadge` uses `style={{}}` for dynamic opacity — add exception for computed styles. (audit-YYYY-MM-DD)

## Drift
- Maestro flow references `id:submit-form-button` but source uses `id:submit-declaration-button`. Test: maestro-registry-sync.test.ts catches this. (audit-YYYY-MM-DD)
```

If `gaps.md` already exists, **merge** new findings — don't duplicate entries that are already there.

## Step 5: Create fix stories (if not --dry-run)

Group findings by category. For each group with 2+ items, create a story.

```bash
REPO="johnnyohwishingtree/borderly"  # CUSTOMIZE
DATE=$(date +%Y-%m-%d)

gh issue create --repo $REPO \
  --title "Story: Fix <category> issues from $DATE audit" \
  --label "story,pending" \
  --body "<follow .knowledge/templates/story.md>

After completing fixes, remove resolved entries from .knowledge/gaps.md."
```

Always add the reminder to remove resolved entries from `gaps.md` in the story body.

## Step 6: Commit and push

```bash
git add .knowledge/gaps.md
git diff --cached --quiet || git commit -m "chore: audit findings ($DATE)" && git push origin master
```

## What NOT to flag
- Empty `.knowledge/` directories (they fill up over time)
- Missing domain knowledge files (created when needed)
- Violations already listed in `gaps.md` (don't duplicate)
