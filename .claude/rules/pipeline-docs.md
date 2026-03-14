# Pipeline Documentation

When modifying any GitHub Actions workflow file in `.github/workflows/`, you MUST also update `docs/pipeline-architecture.md` to reflect the change.

This includes:
- Adding, removing, or renaming workflows
- Changing triggers, conditions, or job flow
- Adding new edge cases or safety mechanisms
- Fixing bugs in the pipeline (add to "Edge Cases & Safety Mechanisms" section)

The architecture doc is the single source of truth for understanding how the autonomous pipeline works. If it's out of date, future debugging becomes much harder.
