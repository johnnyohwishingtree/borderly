---
name: knowledge-audit
description: Audit knowledge graph health — orphans, consistency, test coverage, index sync
argument-hint: "[--dry-run]"
---

# /knowledge-audit — Knowledge Graph Health

Checks the health of the knowledge system: graph integrity, policy consistency, test coverage, and index sync. Unlike `/code-audit` (which checks code against policies), this skill checks the knowledge graph itself.

## Prerequisites
- Knowledge graph engine available (`scripts/knowledge-graph.ts`)
- On `master` branch with latest changes pulled

## Step 0: Drift detection from tracked file changes

Follow `.knowledge/policies/architecture/agent-token-efficiency.md` — the hook system is designed for zero per-conversation token cost.

A PostToolUse hook silently tracks source file changes in `.claude/dirty-files` across all conversations. This accumulates between audit runs. Combined with a saved commit hash, it gives you focused diffs of exactly what changed since the last audit.

**Read the signals:**
```bash
cat .claude/dirty-files 2>/dev/null
cat .claude/last-audit-hash 2>/dev/null
```

If dirty-files is non-empty:

1. **Get focused diffs** — what actually changed in each file:
   ```bash
   LAST_HASH=$(cat .claude/last-audit-hash 2>/dev/null || git rev-list --max-parents=0 HEAD)
   git diff "$LAST_HASH"..HEAD -- $(cat .claude/dirty-files | tr '\n' ' ')
   ```
   Also check for uncommitted changes:
   ```bash
   git diff -- $(cat .claude/dirty-files | tr '\n' ' ')
   ```

2. **Find affected knowledge** — which knowledge files reference these dirty files:
   ```bash
   for f in $(cat .claude/dirty-files); do
     echo "--- $f ---"
     grep -rl "$(basename "$f")" .knowledge/ 2>/dev/null || echo "(no references)"
   done
   ```

3. **Assess drift** — for each affected knowledge file, compare the diff against what the knowledge file claims. Common drift patterns:
   - **Models**: new exports/actions not listed in entity inventory
   - **Temporal facts**: schema field count changed
   - **Policies**: new patterns that violate or extend existing rules
   - **Country domain files**: schema fields added/removed

4. **Prioritize** — check the affected knowledge files first in Steps 1-8 below. Drift from actual code changes is higher priority than general graph health.

If dirty-files is empty or missing, proceed normally — the remaining steps cover full graph health regardless.

**Cleanup** (after Step 9 completes):
```bash
git rev-parse HEAD > .claude/last-audit-hash
> .claude/dirty-files
```

## Step 1: Graph health check

Run the graph engine queries:

```bash
npx tsx scripts/knowledge-graph.ts stats          # overall health
npx tsx scripts/knowledge-graph.ts orphans         # nodes with no connections
npx tsx scripts/knowledge-graph.ts unreferenced    # policies no CLAUDE.md or skill loads
npx tsx scripts/knowledge-graph.ts unenforced      # policies with no structural test
```

Fix any issues found:
- **Orphans** → wire into a folder CLAUDE.md or delete if obsolete
- **Unreferenced** → add `See:` link to the relevant folder CLAUDE.md
- **Unenforced** → write the structural test or mark as design guideline

## Step 2: Schema temporal health

Check every country schema for staleness by comparing `metadata.lastVerified` against `metadata.maintenanceFrequency`:

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

For each stale schema:
1. Check if the portal URL still resolves (HEAD request or manual check)
2. Add to `gaps.md` under `## Drift` with: which schema, how many days overdue, what to verify
3. If the portal URL fails, create a story to investigate and update the schema

Also check `.knowledge/beliefs/` for staleness:
- Read each belief file
- If a belief has status `Hypothesis` and no evidence updates in 60+ days, flag it for review
- Add to `gaps.md` under `## Knowledge updates`

## Step 3: Test coverage

Run `pnpm jest --ci __tests__/structure/knowledge-test-coverage.test.ts` to verify all policies are mapped.

For any policy without a structural test:
1. Read its ENFORCEMENT section — does it reference a test?
2. If no test exists and the rule is structurally testable → write one
3. If design guideline → skip but note it
4. Add new policies to `knowledge-test-coverage.test.ts` mapping

## Step 4: Knowledge coherence (self-healing)

Check that existing knowledge conforms to the facts-first pattern:

1. **Policies without facts**: Every policy should have `Derives From` referencing facts. Scan for policies missing this section — create the missing facts.
2. **Facts vs beliefs**: Scan `facts/` for entries that are actually beliefs (design opinions, hypotheses, "should" statements). Reclassify as beliefs.
3. **Beliefs vs facts**: Scan `beliefs/` for entries that are actually measurable truths. Reclassify as facts.
4. **Stale facts**: Facts with measurable claims (numbers, counts, file paths) — verify against current code. Update if stale.
5. **Stories without gaps**: Check open GitHub issues with `story` label — do they reference facts and beliefs? Flag those that don't.

This step heals the knowledge graph incrementally. Each audit run cleans a few more entries, converging toward full coherence over time.

## Step 5: Consistency check

Scan for contradictions between knowledge files:

```bash
npx tsx scripts/knowledge-graph.ts impact <file>   # see what a change affects
npx tsx scripts/knowledge-graph.ts deps <file>     # see dependencies
```

For files that share topics, verify they agree:
- **Consistent**: same rule, or one is a scoped exception
- **Contradictory**: opposite instructions with no scoping → resolve

When a conflict is found:
- Determine which file is authoritative (usually the more specific one)
- Update the other file to reference the authoritative rule
- Add to gaps.md under `## Knowledge updates`

## Step 6: Index sync

Compare `.knowledge/index.md` against what exists on disk:
- Skills listed that don't exist (deleted but not removed from index)
- Skills that exist but aren't listed
- Policy scopes on disk but not in index
- Beliefs directory and files indexed
- Fix mismatches directly — don't add to gaps

## Step 7: Regenerate diagram

```bash
npx tsx scripts/generate-knowledge-diagram.ts
```

Commit if the diagram changed.

## Step 8: Write findings to gaps.md

Each entry includes: what's wrong, where, and test strategy to prevent recurrence.

## Step 9: Fix or create stories from gaps (if not --dry-run)

- **Quick fixes** (< 5 minutes): fix inline following `.knowledge/policies/workflow/fix-strategy.md`
- **Larger fixes**: create a story with test strategy in acceptance criteria

## Step 10: Verify

Follow `.knowledge/policies/workflow/verification.md`.
Follow `.knowledge/policies/workflow/learning.md`.

## Guardrails
- Don't check code against policies — that's `/code-audit`
- Don't flag violations already listed in `gaps.md`
- Don't flag design guidelines that can't be structurally tested (note them)
- Don't flag empty `.knowledge/` directories
