---
name: context-audit
description: Audit system health — drift detection, schema staleness, belief lifecycle, constraint coverage
argument-hint: "[--dry-run]"
---

# /context-audit — System Health

Checks that code, constraints, beliefs, and external context stay in sync.
Unlike `/code-audit` (which checks code against constraints), this skill
checks the system's meta-health.

## Prerequisites
- On `master` branch with latest changes pulled

## Step 1: Drift detection from tracked file changes

The PostToolUse hook tracks source file changes in `.claude/dirty-files` (zero token cost — see `.context/decisions/007-agent-token-efficiency.md`).

```bash
cat .claude/dirty-files 2>/dev/null
cat .claude/last-audit-hash 2>/dev/null
```

If dirty-files is non-empty:

1. **Get focused diffs:**
   ```bash
   LAST_HASH=$(cat .claude/last-audit-hash 2>/dev/null || git rev-list --max-parents=0 HEAD)
   git diff "$LAST_HASH"..HEAD -- $(cat .claude/dirty-files | tr '\n' ' ')
   ```

2. **Find affected context/constraints:**
   ```bash
   for f in $(cat .claude/dirty-files); do
     echo "--- $f ---"
     grep -rl "$(basename "$f")" .context/ __tests__/structure/ 2>/dev/null || echo "(no references)"
   done
   ```

3. **Check which constraints govern the dirty files' directories:**
   ```bash
   # Also check which constraints govern the dirty files' directories
   for f in $(cat .claude/dirty-files); do
     dir=$(dirname "$f")
     if [ -f "$dir/CLAUDE.md" ]; then
       echo "--- $dir/CLAUDE.md ---"
       grep "See:" "$dir/CLAUDE.md" 2>/dev/null
     fi
   done
   ```

4. **Assess drift** — compare diffs against what context files and constraint JSDoc claim:
   - Structural test JSDoc lists rules that code may now violate or extend
   - Country files may have stale field counts
   - Beliefs in `src/config/beliefs.ts` may be confirmed or invalidated

5. **Prioritize** — drift from actual code changes first, then general health.

If dirty-files is empty, skip to Step 2.

**Cleanup** (after Step 7):
```bash
git rev-parse HEAD > .claude/last-audit-hash
> .claude/dirty-files
```

## Step 2: Schema temporal health

Check every country schema for staleness:

```bash
node -e "
const fs = require('fs');
const now = new Date();
const freqDays = { weekly: 7, monthly: 30, quarterly: 90, annually: 365, as_needed: 180 };
const schemas = fs.readdirSync('src/schemas').filter(f => f.endsWith('.json') && f !== 'manifest.json');
let stale = [];
schemas.forEach(f => {
  const s = JSON.parse(fs.readFileSync('src/schemas/' + f, 'utf8'));
  const verified = new Date(s.metadata?.lastVerified || s.lastUpdated);
  const freq = s.metadata?.maintenanceFrequency || 'monthly';
  const maxDays = freqDays[freq] || 30;
  const daysSince = Math.floor((now - verified) / 86400000);
  if (daysSince > maxDays) {
    stale.push(f.replace('.json','') + ' | ' + daysSince + ' days since verified (max ' + maxDays + ' for ' + freq + ')');
  }
});
if (stale.length) { console.log('STALE SCHEMAS:'); stale.forEach(s => console.log('  - ' + s)); }
else { console.log('All schemas within maintenance window.'); }
"
```

For stale schemas: create a GitHub issue noting which schema is overdue.

## Step 3: Belief lifecycle

Read `src/config/beliefs.ts`. For each belief:
- `hypothesis` status older than 60 days → flag for re-evaluation
- Code changes that confirm or invalidate a `working` belief → update status
- Beliefs with status `confirmed` → check if a structural test enforces them (if not, write one)
- Beliefs no longer referenced by any code → flag for removal

## Step 5: Constraint coverage

Run `pnpm jest --ci __tests__/structure/knowledge-test-coverage.test.ts`.

Check that every structural test has a `Constraint:` JSDoc header. If a new test was added without one, add it.

## Step 5: Cross-reference integrity

Run `pnpm jest --ci __tests__/structure/system-integrity.test.ts __tests__/structure/knowledge-graph-integrity.test.ts`.

These verify:
- All folder CLAUDE.md `See:` links resolve
- All `.context/` cross-references resolve
- All skill `.context/` references resolve

Fix any broken references directly.

## Step 6: CLAUDE.md inventory sync

- Skills in `.claude/skills/` not mentioned in `CLAUDE.md` → add them
- `.context/` files not referenced by any folder CLAUDE.md or skill → flag as orphaned
- Fix mismatches directly

## Step 7: Fix or create stories (if not --dry-run)

- **Quick fixes** (< 5 minutes): fix inline
- **Larger fixes**: create a GitHub issue

## Step 8: Verify

Run `pnpm lint`, `pnpm typecheck`, `pnpm test` in order.

If 5+ files changed, check if any structural test JSDoc or `src/config/beliefs.ts` needs updating.

## Guardrails
- Don't check code against constraints — that's `/code-audit`
- Don't flag violations that already have an open GitHub issue
- Don't flag design guidelines that can't be structurally tested
