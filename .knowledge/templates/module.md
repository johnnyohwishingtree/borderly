# Module Template

New source modules follow this structure. Customized for Borderly's React Native + TypeScript stack.

**Matching rubric:** `.claude/rubrics/code-quality.md`

## Structure

```typescript
/**
 * <Module name> — <one-line purpose>
 */

import { <named imports> } from 'react';              // React first
import { <named imports> } from 'react-native';       // React Native second
import { <named imports> } from '<dependency>';        // External deps third
import { <named imports> } from './<sibling>';         // Local imports last
import type { <type imports> } from '../../types/<domain>';  // Type-only imports separate

/**
 * <What this function does.>
 *
 * @param paramName - <what it is>
 * @returns <what the caller gets back>
 */
export function doSomething(paramName: ParamType): ReturnType {
  // Implementation
}
```

## Rules

- One concern per module
- No `any` types — explicit parameter and return types
- No side effects at module level
- Errors thrown with descriptive messages
- Use NativeWind `className` for styling, not inline styles
- Use components from `src/components/ui/` before creating new ones
- Dependency direction: Screens -> Hooks -> Stores -> Services

## Matching test

Every module must have a corresponding test file. See `.claude/templates/test.md`.
