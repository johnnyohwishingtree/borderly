/**
 * Structural test: hooks barrel export completeness.
 *
 * Every hook file in src/hooks/ must be exported from src/hooks/index.ts.
 * Missing exports mean hooks are unusable via the standard import path.
 *
 * See: .knowledge/conventions/state-management.md
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
