/**
 * Constraint: Hooks Barrel Completeness (from Hook Conventions + File Boundaries)
 *
 * Scope: src/hooks/
 *
 * REQUIRE: all hooks exported from src/hooks/index.ts barrel
 * REQUIRE: hook naming: use<Domain><Action> (e.g., useTripCreation)
 * REQUIRE: screens with 3+ related useState — extract to custom hook
 * REQUIRE: hooks own state + effects, return values AND callbacks
 * DENY:    business logic in screen render functions
 * DENY:    useState for derived data — compute inline or useMemo
 * DENY:    hooks that return 10+ values — split or group into named objects
 *
 * Exceptions:
 * - Modal visibility state (2-3 useState for show/hide) can stay in screens
 * - Simple UI state (search text, tab selection) can stay in screens if < 3
 *
 * Anti-patterns:
 * - Hook not in barrel — unusable via `from '@/hooks'`
 * - Hook file not starting with `use` prefix
 * - 9 useState calls in a screen file
 *
 * Why: The barrel ensures all hooks are discoverable via a single import path.
 *      Consistent naming makes hooks greppable and predictable.
 */

import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const HOOKS_DIR = resolve(ROOT, 'src/hooks');

describe('Hooks barrel exports', () => {
  it('every hook file is exported from index.ts', () => {
    const hookFiles = readdirSync(HOOKS_DIR)
      .filter(f => f.endsWith('.ts') && f !== 'index.ts' && !f.endsWith('.test.ts'))
      .map(f => f.replace('.ts', ''));

    const indexContent = readFileSync(resolve(HOOKS_DIR, 'index.ts'), 'utf-8');

    const missing = hookFiles.filter(hook => {
      // Check if the hook is exported (either directly or as re-export)
      return !indexContent.includes(`./${hook}`) && !indexContent.includes(`'${hook}'`);
    });

    expect(missing).toEqual([]);
  });

  it('hook files follow use<Domain><Action> naming', () => {
    const hookFiles = readdirSync(HOOKS_DIR)
      .filter(f => f.endsWith('.ts') && f !== 'index.ts' && !f.includes('Types') && !f.includes('Helpers'));

    const violations = hookFiles.filter(f => {
      const name = f.replace('.ts', '');
      return !name.startsWith('use');
    });

    expect(violations).toEqual([]);
  });
});
