/**
 * Structural test: dependency direction enforcement.
 *
 * Verifies the architecture rule:
 *   Screens → Hooks → Stores → Services
 *   Components → Props only (no stores, no hooks with side effects)
 *
 * Catches violations at `pnpm test` time (< 1 second).
 * See: .knowledge/policies/architecture/dependency-direction.md
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

function getFiles(dir: string, ext: string): string[] {
  const absDir = resolve(ROOT, dir);
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '__tests__' || entry === '__screenshots__') continue;
        walk(full);
      } else if (entry.endsWith(ext)) {
        files.push(full);
      }
    }
  }
  walk(absDir);
  return files;
}

function getImports(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8');
  const imports: string[] = [];
  const pattern = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

describe('Dependency direction', () => {
  it('stores never import from hooks', () => {
    const violations: string[] = [];
    for (const file of getFiles('src/stores', '.ts')) {
      const imports = getImports(file);
      for (const imp of imports) {
        if (imp.includes('/hooks/') || imp.includes('@/hooks')) {
          violations.push(`${file}: imports ${imp}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('stores never import from other stores (except barrel)', () => {
    const violations: string[] = [];
    for (const file of getFiles('src/stores', '.ts')) {
      const fileName = file.split('/').pop() ?? '';
      // Skip barrel index — legitimately re-exports all stores
      if (fileName === 'index.ts') continue;
      // Allow same-directory relative imports (helpers, types, slices)
      const imports = getImports(file).filter(imp => !imp.startsWith('./'));
      for (const imp of imports) {
        if (imp.includes('/stores/') || imp.includes('@/stores')) {
          violations.push(`${file}: imports ${imp}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('components never import stores directly', () => {
    const violations: string[] = [];
    for (const file of getFiles('src/components', '.tsx')) {
      const content = readFileSync(file, 'utf-8');
      // Check for runtime store imports (not type-only)
      if (/import\s+\{[^}]*\}\s+from\s+['"].*\/stores\//.test(content)) {
        // Exclude type-only imports
        if (!/import\s+type\s+\{/.test(content.match(/import\s+\{[^}]*\}\s+from\s+['"].*\/stores\//)?.[0] ?? '')) {
          violations.push(file);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('services never import stores or hooks', () => {
    const violations: string[] = [];
    for (const file of getFiles('src/services', '.ts')) {
      const imports = getImports(file);
      for (const imp of imports) {
        if (imp.includes('/stores/') || imp.includes('@/stores')) {
          violations.push(`${file}: imports store ${imp}`);
        }
        if (imp.includes('/hooks/') || imp.includes('@/hooks')) {
          violations.push(`${file}: imports hook ${imp}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
