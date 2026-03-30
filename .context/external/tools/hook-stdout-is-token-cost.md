# Fact: Any Hook stdout Becomes Token Cost in the Main Conversation Context

Claude Code hooks that produce stdout inject that output into the active conversation context. PostToolUse hooks fire on every tool call — stdout from these hooks is multiplied by every Edit, Write, and Bash invocation in a session. Zero stdout = zero token cost regardless of how often the hook fires.
