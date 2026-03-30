---
name: code-audit
description: Scan code against policies declared in folder CLAUDE.md files — finds violations, drift, and dead code
argument-hint: "[--dry-run] [--scope src/stores]"
---

# /code-audit — Code vs Policy Compliance

Dynamically reads each folder's CLAUDE.md, follows its `See:` links to load policies, then checks code in that folder against the policy RULES. No hardcoded checks — if a policy changes or a new one is added, the audit automatically covers it.

Also detects drift (stale references) and dead code.

**Scheduled task prompt:**
```
Read CLAUDE.md for project context.
Read .claude/skills/code-audit/SKILL.md and follow every step.
```

## Prerequisites
- Project builds cleanly (`pnpm typecheck` passes)
- `gh` CLI authenticated (for creating fix stories)
- On `master` branch with latest changes pulled

## Step 1: Discover folders to audit

Find all folder CLAUDE.md files:
```bash
find src __tests__ e2e -name "CLAUDE.md" 2>/dev/null
```

If `--scope` provided, filter to that directory only.

## Step 2: For each folder, load policies and check code

For each folder CLAUDE.md:

1. **Read the CLAUDE.md** — note the one-line description
2. **Follow each `See:` link** — read the referenced structural test or `.context/` file. When the `See:` link points to a structural test (`__tests__/constraints/*.test.ts`), read the JSDoc `Constraint:` header at the top — it contains the Scope, Rules, Exceptions, and Anti-patterns that govern that folder's code.
3. **For each policy loaded**, read its `## Rules` section
4. **For each RULE**, check the folder's code:
   - `DENY: import X` → grep folder files for the forbidden pattern
   - `REQUIRE: files follow X` → list files and check
   - `REQUIRE: all exported from barrel` → compare directory to exports
   - `DENY: style={{` → grep for the pattern
5. **Check EXCEPTIONS** — don't flag things the policy explicitly allows
6. **Check ANTI-PATTERNS** — scan for known bad patterns listed in the policy

Also check general CLAUDE.md health:
- Every `See:` link resolves to an existing file
- CLAUDE.md is 5 lines or fewer (content belongs in structural test JSDoc or `.context/`)

## Step 3: Structural checks

### Dead code
- Exports that nothing imports
- Modules with no corresponding test file

### Architecture violations
- Source files over 500 lines (per `__tests__/constraints/screen-folder-convention.test.ts`)

### Drift
- testIDs referenced in E2E tests that don't exist in source
- `.context/` or `__tests__/constraints/` or `.claude/` path references pointing to files that don't exist
- README commands that don't match actual CLI behavior

## Step 4: Discover unenforced patterns

Look for "every X has a Y" patterns in the codebase that aren't covered by structural tests:

- Every screen directory has a CLAUDE.md → is this enforced?
- Every hook is exported from its barrel → is this enforced?
- Every store has a types file → is this enforced?
- Every new entity (screen, service, store) follows the same structure → is this enforced?

For each discovered pattern, check if a structural test in `__tests__/constraints/` already covers it. If not, and the pattern holds across 3+ instances, write a new structural test with a `Constraint:` JSDoc header. The test IS the recipe — next time someone adds a screen without a CLAUDE.md, the test fails and tells them what's missing.

This is how design patterns become permanent constraints: the audit discovers them from existing code, writes the test, and the test prevents deviation going forward.

## Step 5: Classify each finding

For every violation, decide what type of finding it is:

**Code violation?** The policy is correct but code doesn't follow it.
→ Create a GitHub issue for the code fix.

**Constraint stale?** The code is intentionally different and the constraint JSDoc needs updating.
→ Update the structural test's JSDoc header in `__tests__/constraints/`.

**Spec invalidated?** The audit found evidence that contradicts an existing spec.
→ Write a `.spec.test.ts` with `test.skip` asserting the correct state.

**New constraint discovered?** The same type of violation appeared in 3+ files, or this violation was already fixed by a previous spec and regressed.
→ Don't write a spec (it would just get resolved and regress again). Write a permanent structural test in `__tests__/constraints/` with a `Constraint:` JSDoc header. This is how specs get promoted to constraints — repeated violations prove the rule needs permanent enforcement.

Don't blindly flag violations — understand whether reality or the constraint is wrong.

## Step 6: Capture learnings

1. **Invalidated specs** → write a colocated `*.spec.test.ts` with `test.skip` asserting the correct state
2. **New constraints** → write structural test with Constraint JSDoc header
3. **External discoveries** → add to `.context/external/`
4. **Anti-patterns** → add to relevant structural test's JSDoc Anti-patterns section

Every finding traces to a constraint (what SHOULD BE) vs current code (what IS). The gap becomes a failing test.

## Step 7: Write failing tests for violations (if not --dry-run)

**First, check for pending conflicts:**
```bash
ls __tests__/conflicts/*.spec.test.ts 2>/dev/null
```
If a conflict resolution spec already references the same constraint or area, don't write another spec that hits the same conflict — wait for the resolution.

For each violation found, write a failing test that asserts the correct state:

- **Constraint violations** → add assertions to the existing structural test, or write a new one in `__tests__/constraints/`
- **Spec violations** → write a colocated `*.spec.test.ts` with JSDoc explaining the spec
- **Pattern violations** → write a colocated `*.spec.test.ts` asserting the expected code structure

Use `test.skip` so the test commits cleanly. The pipeline will find it, unskip it, implement the fix, and merge.

Example:
```typescript
// __tests__/components/trips/TripCard.spec.test.ts
/**
 * Spec: Components should receive data via props, not import stores.
 * Found by code-audit: src/components/trips/TripCard.tsx imports useTripStore.
 */
test.skip('TripCard does not import stores', () => {
  const content = readFileSync('src/components/trips/TripCard.tsx', 'utf-8');
  expect(content).not.toMatch(/import.*from.*stores/);
});
```

## Step 8: Verify and commit

Follow `the verification rules: run `pnpm lint`, `pnpm typecheck`, `pnpm test` in order; up to 6 attempts` if code was changed.

```bash
git add <changed files>
git diff --cached --quiet || git commit -m "chore: code-audit findings ($DATE)" && git push origin master
```

## Guardrails
- Don't hardcode folder-specific checks — read them from policies
- Don't flag violations that already have an open GitHub issue
- Don't flag design guidelines that can't be mechanically verified
