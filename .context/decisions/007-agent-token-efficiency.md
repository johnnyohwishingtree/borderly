# Decision: Agent Token Efficiency

**Status:** Accepted

All agent-facing processes must produce artifacts on disk, not inline in conversation. Shell scripts over LLM agents for deterministic tasks. Hooks must produce zero stdout. Data collection in shell, LLM analysis batched into scheduled runs.

**Rejected:** Per-conversation LLM agents for knowledge sync (21k tokens per conversation). Inline memory injection (auto-memory style, adds tokens every session). Runtime element dumps when static source code has the same info.

**Key rules:**
- REQUIRE: hooks produce zero stdout (any output = token cost)
- REQUIRE: shell scripts for deterministic tasks (grep, git diff, file append)
- REQUIRE: LLM analysis batched into scheduled skills, not per-conversation
- DENY: spawning LLM agents for work that grep can accomplish
- DENY: tools that return large payloads inline when file-based alternative exists
- REQUIRE: prefer source code (testIDs.ts, component files) over runtime queries

**Reference implementation:** `.claude/hooks/post-tool-track.sh` (zero-token hook)

**Why:** `.context/external/tools/shell-beats-llm-for-deterministic-work.md`,
`.context/external/tools/hook-stdout-is-token-cost.md`,
`.context/external/tools/llm-analysis-is-batchable.md`
