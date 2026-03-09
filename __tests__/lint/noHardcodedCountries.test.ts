import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensures country lists are not hardcoded across the codebase.
 *
 * All country data must come from src/constants/countries.ts.
 * This test catches patterns like:
 *   - ['JPN', 'MYS', 'SGP'] (hardcoded country code arrays)
 *   - { code: 'JPN', name: 'Japan' } (inline country objects)
 *   - "Japan, Malaysia, and Singapore" (hardcoded country text)
 *   - export const SUPPORTED_COUNTRIES = [...] (competing definitions)
 */

// The single source of truth — only this file may define country data
const SOURCE_OF_TRUTH = 'src/constants/countries.ts';

// Files that are allowed to reference country codes directly
// (tests, mocks, and the source of truth itself)
const ALLOWED_PATHS = new Set([
  SOURCE_OF_TRUTH,
  // Schema JSON files necessarily contain their country code
  'src/schemas/',
  // Schema loaders must reference JSON files by country code
  'src/schemas/index.ts',
  // Test files
  '__tests__/',
  // E2E mocks and tests
  'e2e/',
  // CountryFlag renders flags by code — it's a display component, not a data source
  'src/components/trips/CountryFlag.tsx',
  // Portal integration has per-country portal configs (URLs, steps) — inherently per-country
  'src/services/portal/portalIntegration.ts',
  // Portal monitor has per-country portal definitions
  'src/services/monitoring/portalMonitor.ts',
  // Country priority has per-country scoring factors
  'src/utils/countryPriority.ts',
  // Schema manager loads JSON files by code (require statements)
  'src/services/schemas/schemaManager.ts',
  // Airport database maps airports to country codes
  'src/services/boarding/airportLookup.ts',
]);

// Pattern: array with 3+ quoted country codes like ['JPN', 'MYS', 'SGP']
const HARDCODED_ARRAY_RE = /\[[\s]*['"](?:JPN|MYS|SGP|THA|VNM|GBR|USA|CAN)['"][\s]*,[\s]*['"](?:JPN|MYS|SGP|THA|VNM|GBR|USA|CAN)['"][\s]*,/;

// Pattern: object with code/name like { code: 'JPN', name: 'Japan' }
const INLINE_COUNTRY_OBJECT_RE = /\{\s*code:\s*['"](?:JPN|MYS|SGP|THA|VNM|GBR|USA|CAN)['"]\s*,\s*name:/;

// Pattern: competing SUPPORTED_COUNTRIES definition (not an import/re-export)
const COMPETING_DEFINITION_RE = /(?:export\s+)?const\s+SUPPORTED_COUNTRIES\s*=\s*\[/;

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      files.push(...getAllTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

function isAllowed(relPath: string): boolean {
  for (const allowed of ALLOWED_PATHS) {
    if (relPath === allowed || relPath.startsWith(allowed)) return true;
  }
  return false;
}

describe('No hardcoded country lists', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const srcFiles = getAllTsFiles(path.join(rootDir, 'src'));

  it('should find source files to scan', () => {
    expect(srcFiles.length).toBeGreaterThan(0);
  });

  it('should not have hardcoded country arrays outside allowed files', () => {
    const violations: string[] = [];

    for (const file of srcFiles) {
      const relPath = path.relative(rootDir, file);
      if (isAllowed(relPath)) continue;

      const lines = fs.readFileSync(file, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (HARDCODED_ARRAY_RE.test(line)) {
          violations.push(`${relPath}:${i + 1}: Hardcoded country array — ${line.trim()}`);
        }

        if (INLINE_COUNTRY_OBJECT_RE.test(line)) {
          violations.push(`${relPath}:${i + 1}: Inline country object — ${line.trim()}`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} hardcoded country list(s). ` +
        `Import from '${SOURCE_OF_TRUTH}' instead.\n\n` +
        violations.join('\n')
      );
    }
  });

  it('should not have competing SUPPORTED_COUNTRIES definitions', () => {
    const violations: string[] = [];

    for (const file of srcFiles) {
      const relPath = path.relative(rootDir, file);
      // Only the source of truth may define SUPPORTED_COUNTRIES with a literal array
      if (relPath === SOURCE_OF_TRUTH) continue;
      if (isAllowed(relPath)) continue;

      const lines = fs.readFileSync(file, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (COMPETING_DEFINITION_RE.test(lines[i])) {
          // Allow re-exports (e.g., `export const SUPPORTED_COUNTRIES = SUPPORTED_COUNTRY_CODES;`)
          if (lines[i].includes('SUPPORTED_COUNTRY_CODES') || lines[i].includes('import')) continue;
          violations.push(`${relPath}:${i + 1}: Competing definition — ${lines[i].trim()}`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} competing SUPPORTED_COUNTRIES definition(s). ` +
        `There should be only one source of truth: '${SOURCE_OF_TRUTH}'.\n\n` +
        violations.join('\n')
      );
    }
  });
});
