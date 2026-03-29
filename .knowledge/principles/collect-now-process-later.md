# Principle: Collect Now, Process Later

Separate deterministic data collection (zero-cost shell hooks) from LLM analysis (scheduled batch runs). Collection happens at the point of change; analysis happens when the accumulated signals justify the token cost.

## Derives from
- `facts/craft/shell-beats-llm-for-deterministic-work.md`
- `facts/craft/hook-stdout-is-token-cost.md`
- `facts/craft/llm-analysis-is-batchable.md`

## Implemented by
- `policies/architecture/agent-token-efficiency.md`
