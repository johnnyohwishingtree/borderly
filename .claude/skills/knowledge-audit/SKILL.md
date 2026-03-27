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

## Step 2: Test coverage

Run `pnpm jest --ci __tests__/structure/knowledge-test-coverage.test.ts` to verify all policies are mapped.

For any policy without a structural test:
1. Read its ENFORCEMENT section — does it reference a test?
2. If no test exists and the rule is structurally testable → write one
3. If design guideline → skip but note it
4. Add new policies to `knowledge-test-coverage.test.ts` mapping

## Step 3: Consistency check

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

## Step 4: Index sync

Compare `.knowledge/index.md` against what exists on disk:
- Skills listed that don't exist (deleted but not removed from index)
- Skills that exist but aren't listed
- Policy scopes on disk but not in index
- Fix mismatches directly — don't add to gaps

## Step 5: Regenerate diagram

```bash
npx tsx scripts/generate-knowledge-diagram.ts
```

Commit if the diagram changed.

## Step 6: Write findings to gaps.md

Each entry includes: what's wrong, where, and test strategy to prevent recurrence.

## Step 7: Fix or create stories (if not --dry-run)

- **Quick fixes** (< 5 minutes): fix inline following `.knowledge/policies/workflow/fix-strategy.md`
- **Larger fixes**: create a story with test strategy in acceptance criteria

## Step 8: Verify

Follow `.knowledge/policies/workflow/verification.md`.
Follow `.knowledge/policies/workflow/learning.md`.

## Guardrails
- Don't check code against policies — that's `/code-audit`
- Don't flag violations already listed in `gaps.md`
- Don't flag design guidelines that can't be structurally tested (note them)
- Don't flag empty `.knowledge/` directories
