---
name: qa
description: Walk through the application like a real user and document every bug found
---

# QA

Walk through the application's functionality like a real user would. Document every bug, UX issue, and inconsistency found.

## Steps

1. **Read CLAUDE.md** to understand the application
2. **Read `maestro/generator/screenRegistry.ts`** for per-screen metadata: fields (with required/optional status), alerts, action buttons, and navigation targets. This tells you what each screen should contain and what interactions are possible.
3. **Read `maestro/generator/componentCatalog.ts`** for component interaction patterns: how each component type works (modal vs inline, keyboard behavior, sub-testIDs).
4. **List all user-facing features** and create a test plan
5. **Walk through each feature**, checking:
   - Does it work as expected?
   - Are error states handled?
   - Is the UI/output consistent?
   - Are edge cases handled?
4. **Document bugs** with reproduction steps
5. **Fix critical bugs** immediately
6. **Create issues** for non-critical bugs
