---
name: local-pipeline
description: Autonomous pipeline for local environments (Claude Desktop / CLI) — same as /pipeline but invoked manually
argument-hint: "[--issue N]"
---

# /local-pipeline — Local Autonomous Pipeline

Same as `/pipeline` but designed for Claude Desktop or Claude CLI running on the user's machine. Uses `gh` CLI and `git push` — requires local filesystem access and GitHub authentication.

Use this when Claude Code scheduled tasks aren't available (e.g., Claude Desktop, Cowork, or local CLI sessions).

**Scheduled task prompt (Claude Desktop):**
```
Read CLAUDE.md for project context.
Read .claude/skills/local-pipeline/SKILL.md and follow every step.
```

## Step 1: Merge open PRs

```bash
REPO="johnnyohwishingtree/borderly"  # CUSTOMIZE
gh pr list --repo $REPO --state open --json number,title,headRefName --jq '.[]'
```

For each open PR: review the diff, merge if clean, fix if not.

```bash
git checkout master && git pull origin master
```

## Step 2: Find next story

```bash
gh issue list --repo $REPO --label "story" --label "pending" --state open --json number,title --jq '.[0]'
```

If no pending stories → skip to **Step 8**.

**Important:** Only pick up stories labeled `pending`. Never pick up `in-progress` stories — another session owns them.

## Step 3: Implement

```bash
NUMBER=<issue number>
gh issue edit $NUMBER --repo $REPO --remove-label "pending" --add-label "in-progress"
git fetch origin master && git checkout -b story/issue-$NUMBER origin/master
```

Read the story body. Implementation order:
1. Read the **Knowledge** section — these `.knowledge/` files give you context
2. Read the **Tasks** section — each task references a template or pattern to follow
3. Read the **Context** section — the minimum source files to read
4. Implement each task following the referenced `.knowledge/` file

## Step 4: Verify (up to 6 attempts)

Run verification commands (from CLAUDE.md):
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

**If you changed screen UI:** Follow `.knowledge/conventions/e2e-testability.md` — update screenRegistry, run `pnpm maestro:generate`.

If checks fail → fix → rerun. Up to 6 attempts.

If still failing after 6 attempts → push WIP branch, create draft PR, reset story to `pending`, stop.

**Failure discipline:**
- If the same failure repeats after a fix attempt, try a different approach — don't retry the same fix
- If a failure is pre-existing (exists on master too), fix it now or add it to `.knowledge/gaps.md`
- If you created a test, run it individually before committing
- Run verification in the foreground — never spawn background processes
- Clean up any processes you started before moving to the next step

## Step 5: Learn — update the knowledge graph

After verify passes, reflect on each task you implemented:

1. **Did you have to figure something out not covered by any `.knowledge/` file?**
   → Add an entry to `.knowledge/gaps.md` with a test strategy:
   ```markdown
   ## Knowledge updates
   - `.knowledge/<file>.md` missing guidance on <topic>. Test: <how to catch this>. (#$NUMBER)
   ```

2. **New concept?** → Create `.knowledge/concepts/<name>.md`
3. **New convention?** → Create `.knowledge/conventions/<name>.md` + structural test
4. **New domain knowledge?** → Create or update `.knowledge/domain/<name>.md`
5. **Directory-specific convention?** → Create folder CLAUDE.md pointer

## Step 6: Self-review against rubrics

Review your diff against:
- `.knowledge/rubrics/code-quality.md` — for source files
- `.knowledge/rubrics/test-quality.md` — for test files
- `.knowledge/rubrics/skill-quality.md` — for skill files

**Fix immediately:** `any` types, unused imports, empty catches, missing tests, anti-patterns.
**Add to gaps.md:** architectural questions needing human input.

Re-run verification after fixes.

## Step 7: Push, PR, merge

```bash
git add <specific files>
git commit -m "<descriptive message>

Closes #$NUMBER"
git push -u origin story/issue-$NUMBER

TITLE=$(gh issue view $NUMBER --repo $REPO --json title --jq .title)
gh pr create --repo $REPO --head story/issue-$NUMBER --base master --title "$TITLE" \
  --body "Closes #$NUMBER — implemented by local-pipeline."
PR_NUM=$(gh pr list --repo $REPO --head story/issue-$NUMBER --json number --jq '.[0].number')
gh pr merge $PR_NUM --repo $REPO --squash
```

Close story and auto-close epic if all stories done:
```bash
gh issue edit $NUMBER --repo $REPO --remove-label "in-progress" --add-label "completed"
gh issue close $NUMBER --repo $REPO

EPIC_LABEL=$(gh issue view $NUMBER --repo $REPO --json labels --jq '[.labels[].name | select(startswith("epic:"))] | .[0]')
if [ -n "$EPIC_LABEL" ] && [ "$EPIC_LABEL" != "null" ]; then
  OPEN=$(gh issue list --repo $REPO --state open --json labels --jq "[.[] | select(.labels | map(.name) | any(. == \"$EPIC_LABEL\"))] | length")
  if [ "$OPEN" -eq 0 ]; then
    EPIC_NUM=$(gh issue list --repo $REPO --label "epic,$EPIC_LABEL" --state open --json number --jq '.[0].number')
    [ -n "$EPIC_NUM" ] && [ "$EPIC_NUM" != "null" ] && gh issue close "$EPIC_NUM" --repo $REPO --comment "All stories completed."
  fi
fi
```

## Step 8: Optimize (when queue is empty)

Read and follow `.claude/skills/optimize/SKILL.md`.

## Step 9: Plan next epic (when queue is empty and optimization is done)

Read the codebase and `.knowledge/` knowledge graph. Identify the highest-impact improvement. Create an epic with stories following `.knowledge/templates/epic.md` and `.knowledge/templates/story.md`.
