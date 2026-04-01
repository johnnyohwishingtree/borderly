import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Jest mocks for native modules must export all symbols
 * that the real module exports, especially named exports used in source.
 *
 * When a native module mock in jest.setup.js is missing a named export
 * (e.g., SvgXml from react-native-svg), any component that imports it
 * gets `undefined` and crashes at render time. The test error message
 * ("Element type is invalid: got undefined") gives no clue which export
 * is missing — it can take hours to debug.
 *
 * This test scans source code for `import { X } from 'module'` and
 * verifies each X appears in the corresponding jest.mock() block.
 *
 * Scope: jest.setup.js mock blocks vs src/ imports
 * Rules:
 *   - Every named import from a mocked native module must appear in
 *     the jest.mock factory for that module
 * Anti-patterns:
 *   - Adding SvgXml import to a component but not to the svg mock
 *   - Two mock files for the same module with different exports
 */

/** Extract named imports from source for a given module */
function findNamedImports(sourceDir: string, moduleName: string): Set<string> {
  const imports = new Set<string>();
  const { execSync } = require('child_process');

  try {
    // Find all files importing from this module
    const files = execSync(
      `grep -rl "from '${moduleName}'" ${sourceDir} 2>/dev/null || true`,
      { encoding: 'utf-8' },
    ).trim().split('\n').filter(Boolean);

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      // Match: import { X, Y, Z } from 'module'
      const re = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
      let match;
      while ((match = re.exec(content)) !== null) {
        match[1].split(',').forEach(name => {
          const clean = name.trim().split(' as ')[0].trim();
          if (clean && !clean.startsWith('type ')) imports.add(clean);
        });
      }
    }
  } catch { /* grep may fail */ }
  return imports;
}

/** Extract export names from a jest.mock factory block in jest.setup.js */
function findMockExports(setupContent: string, moduleName: string): Set<string> {
  const exports = new Set<string>();
  // Find the jest.mock block for this module
  const escapedName = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`jest\\.mock\\('${escapedName}'[\\s\\S]*?\\}\\);`, 'g');
  const match = re.exec(setupContent);
  if (!match) return exports;

  const block = match[0];
  // Find all property names in the return object
  // Matches: SvgXml: ..., or SvgXml, or 'SvgXml': ...
  const propRe = /\b(\w+)\s*[:]/g;
  let propMatch;
  while ((propMatch = propRe.exec(block)) !== null) {
    exports.add(propMatch[1]);
  }
  return exports;
}

const NATIVE_MODULES_TO_CHECK = [
  'react-native-svg',
  'react-native-keychain',
  'react-native-mmkv',
  'react-native-webview',
];

test('jest.setup.js mocks export all symbols imported by source code', () => {
  const setupContent = readFileSync(resolve(ROOT, 'jest.setup.js'), 'utf-8');
  const srcDir = resolve(ROOT, 'src');
  const violations: string[] = [];

  for (const moduleName of NATIVE_MODULES_TO_CHECK) {
    const usedImports = findNamedImports(srcDir, moduleName);
    if (usedImports.size === 0) continue;

    const mockExports = findMockExports(setupContent, moduleName);
    if (mockExports.size === 0) continue; // no mock block found

    for (const imp of usedImports) {
      if (!mockExports.has(imp)) {
        violations.push(
          `"${moduleName}" mock in jest.setup.js is missing export "${imp}" ` +
          `(used in src/ imports)`,
        );
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `${violations.length} missing mock export(s):\n\n` +
      violations.join('\n') +
      '\n\nAdd the missing exports to the jest.mock() block in jest.setup.js.',
    );
  }
});
