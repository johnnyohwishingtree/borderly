# Policy: Story Implementation

## Scope
Pipeline skills that implement GitHub issues/stories.

## Rules
- REQUIRE: read the story body before writing any code
- REQUIRE: follow this reading order:
  1. **Knowledge section** — read all linked `.knowledge/` files for context
  2. **Tasks section** — each task references a template or pattern to follow
  3. **Context section** — minimum source files to understand before implementing
  4. **Implement** — follow the referenced `.knowledge/` file for each task
- REQUIRE: label story `in-progress` before starting, never pick up `in-progress` stories
- REQUIRE: if all stories are `in-progress` or `blocked`, treat as "no pending stories"
- DENY: implementing without reading the knowledge section first
- DENY: picking up a story another pipeline session owns (check labels)
- DENY: guessing requirements — if unclear, add to gaps.md and skip

## Anti-patterns
- Starting to code before reading the linked knowledge files
- Picking up `in-progress` stories (another pipeline owns them)
- Implementing based on the title alone without reading the full story body
- Ignoring the Context section and reading random files

## Enforcement
Built into pipeline Step 3 and local-pipeline Step 3

## Derives From
- `principles/knowledge-is-living-documentation.md`
- `facts/organizational.md#f:org:policies-over-rules`
