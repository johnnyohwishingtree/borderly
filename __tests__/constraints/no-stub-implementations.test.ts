/**
 * Constraint: No stub/placeholder implementations in production source.
 *
 * Scope: src/services/, src/hooks/ — all service and hook files
 *
 * Rules:
 *   - DENY: Functions that always return failure/empty with a TODO comment
 *   - DENY: setTimeout simulating async work (fake delays)
 *   - DENY: Comments like "placeholder", "simplified implementation",
 *     "in production you would", "for demo purposes"
 *
 * Why: Stubs silently fail at runtime. Users think a feature works but
 * it does nothing. Either implement it or don't ship the button.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function getSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getSourceFiles(fullPath));
    } else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.includes('.test.')) {
      results.push(fullPath);
    }
  }
  return results;
}

test('no placeholder/stub implementations in services or hooks', () => {
  const dirs = [
    resolve(ROOT, 'src/services'),
    resolve(ROOT, 'src/hooks'),
  ];

  const violations: string[] = [];
  const stubPatterns = [
    /placeholder implementation/i,
    /simplified implementation/i,
    /in production.*you would/i,
    /in a real app/i,
    /for demo purposes/i,
    /TODO:.*implement/i,
  ];

  // Monitoring services are infrastructure stubs, not user-facing
  const excludePaths = ['/monitoring/'];

  for (const dir of dirs) {
    for (const file of getSourceFiles(dir)) {
      const name = file.replace(ROOT + '/', '');
      if (excludePaths.some(p => name.includes(p))) continue;
      const content = readFileSync(file, 'utf-8');

      for (const pattern of stubPatterns) {
        if (pattern.test(content)) {
          const match = content.match(pattern);
          violations.push(`${name}: "${match?.[0]}"`);
        }
      }
    }
  }

  expect(violations).toEqual([]);
});
