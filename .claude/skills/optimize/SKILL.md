---
name: optimize
description: Resolve known gaps in the knowledge graph — add missing guidance, compress bloated files
argument-hint: "[--dry-run]"
---

# /optimize — Resolve Gaps and Compress Knowledge

Reads open GitHub issues for pending findings, resolves them by updating knowledge or flagging code fixes, and compresses files that have grown too long.

## Prerequisites

- On `master` branch with clean working tree
- `pnpm install` completed
- `gh` CLI authenticated

## Step 1: Read pending issues

```bash
REPO="johnnyohwishingtree/borderly"
gh issue list --repo $REPO --label "story" --label "pending" --state open --json number,title --jq '.[]'
```

If no pending issues → skip to Step 3.

## Step 2: Resolve findings

Before resolving, classify each finding:

### Knowledge updates

For knowledge-related issues:

1. Read the referenced `.context/` file or structural test (`__tests__/structure/`)
2. Determine: is this a missing constraint, or is it a changed belief?
   - **Missing guidance** → add to the relevant `.context/` file or structural test JSDoc
   - **Assumption proven wrong** → update the belief in `src/config/beliefs.ts`
3. Commit the fix and close the issue.

### Code fixes

Code fix issues are for the pipeline to handle via story implementation.
- If a fix story already exists → leave it
- If no fix story exists → create a GitHub issue with the test strategy in acceptance criteria. Every fix must have a test that prevents recurrence.

### Drift

Drift issues — fix the drift directly if it's a documentation/config issue. If it requires code changes, create a fix story.

## Step 3: Compress bloated files

Check file sizes:
```bash
for f in $(find .context -name "*.md" -not -name "README.md"); do
  LINES=$(wc -l < "$f" | tr -d ' ')
  if [ "$LINES" -gt 150 ]; then
    echo "BLOATED: $f ($LINES lines)"
  fi
done
```

For each bloated file, choose one of two strategies:

**Compress** (if content is cohesive — one topic with too many words):
1. Rewrite to be concise — keep all knowledge, remove redundancy, tighten examples
2. Target: under 100 lines

**Promote to directory** (if content has 3+ distinct sub-topics):
1. Create a directory with the same name: `policies/testing/`
2. Split into focused files: `core.md`, `mocking.md`, `e2e.md`
3. Each file should be independently useful — an agent reading one doesn't need the others
4. Delete the original file (or convert to a README.md in the new directory)

Choose promote over compress when different stories would need different parts of the file.

## Step 4: Close resolved issues

Close any GitHub issues that were resolved in this session:
```bash
gh issue close <number> --repo $REPO --comment "Resolved during optimize run."
```

## Step 5: Push

```bash
git push origin master
```

## Guardrails

- Don't resolve code fixes directly — create stories for them
- Don't close issues that still have unresolved work
