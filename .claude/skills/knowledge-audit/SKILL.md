---
name: knowledge-audit
description: Audit code against .knowledge/ policies — find violations, evaluate fixes, propose test strategies
argument-hint: "[--dry-run] [layer]"
---

# /knowledge-audit — Code vs Knowledge Compliance Audit

Checks whether code follows the policies declared in `.knowledge/policies/`, verifies test coverage, checks for graph integrity issues, and proposes test strategies for each violation.

Uses the knowledge graph engine (`scripts/knowledge-graph.ts`) for structural queries.

## Step 1: Graph health check

Run the graph engine queries to find structural issues:

```bash
npx tsx scripts/knowledge-graph.ts orphans       # nodes with no connections
npx tsx scripts/knowledge-graph.ts unreferenced   # policies no CLAUDE.md loads
npx tsx scripts/knowledge-graph.ts unenforced     # policies with no structural test
```

Fix any issues found:
- **Orphans** → wire into a folder CLAUDE.md or delete if obsolete
- **Unreferenced** → add `See:` link to the relevant folder CLAUDE.md
- **Unenforced** → write the structural test or mark as design guideline

## Step 2: Check code against policies

For each policy in `.knowledge/policies/`:
1. Read its **SCOPE** to know which directories to scan
2. Read each **RULE** (ALLOW/DENY/REQUIRE) and grep/parse the scoped files
3. Check **EXCEPTIONS** — don't flag legitimate exceptions
4. Verify **ENFORCEMENT** test exists and passes

## Step 3: Check knowledge test coverage

Run `pnpm test -- knowledge-test-coverage` to verify all policies are mapped.

For any policy without a structural test:
1. Read its ENFORCEMENT section — does it reference a test?
2. If no test exists → write one and add it to `__tests__/structure/`
3. If design guideline → skip but note it
4. Add new policies to `knowledge-test-coverage.test.ts` mapping

## Step 4: Evaluate each finding

For every violation, decide:

**Code is wrong** → the policy is correct, code needs fixing
**Knowledge is stale** → the code is intentionally different, update the policy

## Step 5: Propose test strategy for each code fix

Every fix needs a test to prevent regression. Specify the test type, location, and what it asserts.

If no existing test covers the violation, create one that runs in < 1 second.

## Step 6: Check knowledge consistency

Scan for contradictions between knowledge files:

```bash
npx tsx scripts/knowledge-graph.ts impact <file>  # see what a change affects
```

For files that share topics, verify they agree:
- **Consistent**: same rule, or one is a scoped exception
- **Contradictory**: opposite instructions with no scoping → resolve

When a conflict is found:
- Determine which file is authoritative (usually the more specific one)
- Update the other file to reference the authoritative rule
- Add to gaps.md under `## Knowledge updates`

## Step 7: Regenerate architecture diagram

```bash
npx tsx scripts/generate-knowledge-diagram.ts
```

Commit if the diagram changed — keeps the view in sync.

## Step 8: Write all findings to gaps.md

Each gap entry includes: what's wrong, where, test strategy to prevent recurrence.

## Step 9: Fix or create stories (if not --dry-run)

- **Quick fixes** (< 5 minutes): fix inline and commit
- **Larger fixes**: create a story with the test strategy in acceptance criteria

## What NOT to flag
- Violations already listed in `gaps.md`
- Design guidelines that can't be structurally tested (note them, don't flag)
- Empty directories
