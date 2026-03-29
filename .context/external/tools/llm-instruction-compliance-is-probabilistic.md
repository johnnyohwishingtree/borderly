# Fact: LLM Instruction Compliance Is Probabilistic

LLM agents (Claude Code, pipeline tasks) do not deterministically follow all instructions. Compliance depends on salience — how prominent and relevant the instruction appears in context. Instructions can be missed, especially process-level rules during focused implementation.

Enforcement reliability hierarchy (highest to lowest):
1. **Structural tests** — mechanical, fail the commit gate, can't be ignored
2. **`.claude/rules/`** — auto-loaded every session, always in context
3. **Root `CLAUDE.md`** — loaded at conversation start, high visibility
4. **Folder `CLAUDE.md`** — injected when files in that directory are read
5. **`.knowledge/` policies** — only loaded on-demand via `See:` links

Design critical constraints as structural tests, not as instructions. Use policies for guidance that tolerates occasional misses.
