import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: All exported hooks should be imported somewhere in the codebase.
 * Found by code-audit: useBoardingPassScanner and useMRZScanner are exported
 * from the hooks barrel but never imported by any screen or component.
 *
 * Confirm: These hooks are used after a feature is wired up
 * Invalidate: These hooks are intentionally kept for future use
 */
test.skip('no dead hook exports in barrel', () => {
  const barrel = readFileSync(
    resolve(ROOT, 'src/hooks/index.ts'),
    'utf-8',
  );

  // Extract all exported hook names from barrel
  const hookNames = [...barrel.matchAll(/as\s+(use\w+)/g)].map(m => m[1]);

  // For each hook, check if it's imported anywhere in src/ (excluding hooks/ itself)
  const deadExports: string[] = [];
  for (const hook of hookNames) {
    const result = execSync(
      `grep -rl "${hook}" src/screens/ src/components/ 2>/dev/null || true`,
      { cwd: ROOT, encoding: 'utf-8' },
    ).trim();
    if (!result) {
      deadExports.push(hook);
    }
  }

  expect(deadExports).toEqual([]);
});
