# Policy: Agent Token Efficiency

## Scope
All systems, tools, and patterns that interact with AI agents (MCP servers, E2E frameworks, debugging tools, CI pipelines).

## Rules

### Design for zero context cost
- REQUIRE: any agent-facing process produces artifacts on disk, not inline in conversation
- REQUIRE: prefer file-based output (save to disk, read only when needed) over inline output (returned directly into context)
- REQUIRE: when inline output is unavoidable, minimize its size (compress images, truncate JSON, summarize)
- DENY: tools that return large payloads inline when a file-based alternative exists

### Source code is the cheapest context
- REQUIRE: derive element/screen/state knowledge from source code (testIDs.ts, component files) — not from runtime queries
- REQUIRE: read source files instead of dumping live state when the information is static
- DENY: runtime element dumps (list_elements, accessibility tree dumps) when the same info exists in code

### Overwrite, don't accumulate
- REQUIRE: repeated outputs (screenshots, logs, reports) use stable filenames that overwrite on each run
- DENY: timestamped or sequential filenames for debug artifacts that would accumulate without bound

### Cost awareness in tool selection
- REQUIRE: when evaluating a new tool or MCP server, assess its token cost profile (what goes into context, how large, how often)
- REQUIRE: if a tool has both a "return inline" and "save to file" mode, always use save-to-file
- REQUIRE: document the token-efficient usage pattern in `.claude/rules/` if the tool has a costly default
- DENY: adopting tools where the only interaction mode returns large payloads inline

### Shell over LLM for deterministic tasks
- REQUIRE: if a task can be done with shell commands (grep, git diff, file append), use a shell script — not an LLM agent
- REQUIRE: hooks that run on every tool use (PostToolUse) MUST produce zero stdout — any output costs tokens in the main context
- REQUIRE: data collection (tracking file changes, accumulating signals) happens in shell scripts with zero LLM involvement
- REQUIRE: LLM analysis of collected data is batched into scheduled runs (e.g., daily audit), never per-conversation
- DENY: spawning an LLM agent for work that grep + git diff can accomplish
- DENY: per-conversation LLM processing when the same work can be deferred to a scheduled skill

### Hooks must be token-invisible
- REQUIRE: PostToolUse hooks produce zero stdout (silent tracking only)
- REQUIRE: hook scripts write to disk files (.claude/dirty-files), never to conversation context
- REQUIRE: accumulated hook data is consumed by scheduled skills, not per-conversation agents
- DENY: Stop hooks that spawn LLM agents for routine bookkeeping
- DENY: hooks that inject context into every conversation via block/allow decisions

## Examples

| Bad (high token cost) | Good (zero/minimal cost) |
|---|---|
| `take_screenshot` → image inline | `save_screenshot` → file on disk |
| `list_elements` → 500-element JSON | Read `testIDs.ts` → 30 lines |
| Screenshot per debug step inline | Batch navigate, save to disk, read one if stuck |
| Sequential filenames (`step-01.jpg`, `step-02.jpg`) | Stable names (`portal-loaded.jpg`) that overwrite |
| Full element dump to find one button | `tapById('button-id')` using known testID from source |
| Stop hook spawns agent to analyze changes (21k tokens) | Shell hook appends file paths, daily audit reads them (0 tokens) |
| Per-conversation knowledge sync agent | Dirty-files accumulate, `/knowledge-audit` Step 0 batch-processes |
| LLM grep for knowledge references | `grep -rl "filename" .knowledge/` in bash (0 tokens) |

## Anti-patterns
- Choosing a tool because it's easy for humans, ignoring that agents pay per-token for every interaction
- Using runtime queries for information that's statically available in source code
- Returning full API responses into context when only a status code was needed
- Taking screenshots "just to confirm" a tap worked — trust the action, check only on failure
- Building a per-conversation LLM agent when a shell script + scheduled batch would achieve the same result at zero per-conversation cost
- Designing automated systems that "do it all now" instead of "collect now, process later"

## Enforcement
- `.claude/rules/mobile-mcp-usage.md` — enforces this for mobile-mcp specifically
- `.claude/hooks/post-tool-track.sh` — reference implementation of zero-token hook
- `.claude/skills/knowledge-audit/SKILL.md` Step 0 — reference implementation of batch consumption
- Code review: any new MCP integration must document its token cost profile
- Code review: any new hook must produce zero stdout

## Context
- `.context/external/tools/shell-beats-llm-for-deterministic-work.md`
- `.context/external/tools/hook-stdout-is-token-cost.md`
- `.context/external/tools/llm-analysis-is-batchable.md`
