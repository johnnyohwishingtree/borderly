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
2. **Follow each `See:` link** — read the referenced structural test or `.context/` file
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
- Source files over 500 lines (per `__tests__/structure/screen-folder-convention.test.ts`)

### Drift
- testIDs referenced in E2E tests that don't exist in source
- `.context/` or `__tests__/structure/` or `.claude/` path references pointing to files that don't exist
- README commands that don't match actual CLI behavior

## Step 4: Classify each finding

For every violation, decide what type of finding it is:

**Code violation?** The policy is correct but code doesn't follow it.
→ Create a GitHub issue for the code fix.

**Knowledge stale?** The code is intentionally different and the policy needs updating.
→ Create a GitHub issue for the knowledge update.

**Assumption invalidated?** The audit found evidence that contradicts a belief in `src/config/beliefs.ts`.
→ Update the belief entry in `src/config/beliefs.ts` (lower certainty or add counter-evidence).

**New constraint discovered?** A pattern appeared across multiple violations that should be a permanent rule.
→ Create a new policy with enforcement test (existing behavior — unchanged).

Don't blindly flag violations — understand whether reality or documentation is wrong, and whether the finding is transient (fix it) or permanent (capture it in the graph).

## Step 5: Capture knowledge

Before creating stories, capture what you discovered:

1. **Invalidated assumptions** → update beliefs in `src/config/beliefs.ts`
2. **New constraints** → create policies with structural tests
3. **Code violations** → these are gaps between existing policies and how code actually is

Every finding should trace to a policy or belief (what SHOULD BE) vs the current code (what IS). The gap between them is the story.

## Step 6: Create fix stories from gaps (if not --dry-run)

Group findings by category. For each group with 2+ items, create a GitHub issue:

```bash
REPO="johnnyohwishingtree/borderly"
DATE=$(date +%Y-%m-%d)

gh issue create --repo $REPO \
  --title "Story: Fix <category> issues from $DATE code-audit" \
  --label "story,pending" \
  --body "$(cat <<'EOF'
## Description
<describe the policy violations found>

## Acceptance Criteria
- [ ] All violations fixed
- [ ] Tests pass
- [ ] No new violations introduced
EOF
)"
```

## Step 7: Verify and commit

Follow `the verification rules: run `pnpm lint`, `pnpm typecheck`, `pnpm test` in order; up to 6 attempts` if code was changed.

```bash
git add <changed files>
git diff --cached --quiet || git commit -m "chore: code-audit findings ($DATE)" && git push origin master
```

## Guardrails
- Don't hardcode folder-specific checks — read them from policies
- Don't flag violations that already have an open GitHub issue
- Don't flag design guidelines that can't be mechanically verified
