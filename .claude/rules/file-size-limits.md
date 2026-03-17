# File Size Limits

Keep source files under 500 lines. When a file exceeds this threshold, split it.

## How to split:

### Utility files with multiple independent classes/functions
Split each class or logical group into its own file under a subdirectory with a barrel `index.ts`.

Example: `utils/automationHelpers.ts` (6 classes, 900 lines)
```
utils/automation/
  selectorBuilder.ts
  dataTransformer.ts
  elementUtils.ts
  errorHandling.ts
  performanceMonitor.ts
  automationPatterns.ts
  index.ts           # barrel re-exports all
```

### Files with types + a single class
Extract type definitions into a separate `*Types.ts` file.

Example: `utils/portalDetection.ts` (types + class, 965 lines)
```
utils/portal/
  portalTypes.ts     # all interfaces and type aliases
  portalDetector.ts  # class imports types from portalTypes
  index.ts           # barrel re-exports class + types
```

### Screens with complex business logic
Extract logic into custom hooks under `src/hooks/` (see hook-extraction.md).

## Rules:
- New subdirectory gets a barrel `index.ts` that re-exports everything
- Update any barrel that previously imported the monolithic file
- Verify no direct imports of the old file exist before deleting it
- Run `pnpm typecheck` after each split to catch breakage immediately
- Run `pnpm test` after all splits to confirm no regressions
