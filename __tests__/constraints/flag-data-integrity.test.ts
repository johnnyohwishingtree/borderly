import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Flag SVG data must match the source package exactly.
 *
 * flagData.ts is auto-generated from country-flag-icons/3x2/*.svg.
 * If someone hand-edits it (truncating SVGs, removing paths), the
 * flags render incorrectly (e.g., US flag with 4 stars instead of 12).
 *
 * This test reads the source SVGs from node_modules and verifies each
 * flag in flagData.ts matches byte-for-byte.
 *
 * Scope: src/components/trips/flagData.ts
 * Rules:
 *   - Every flag SVG must match the source in country-flag-icons/3x2/
 *   - Every supported country must have a flag entry
 */

const ALPHA2_CODES = ['JP', 'MY', 'SG', 'TH', 'VN', 'GB', 'US', 'CA', 'AU', 'NZ', 'KR', 'IN', 'ID', 'PH'];

test('flagData.ts SVGs match country-flag-icons source', () => {
  const flagDataContent = readFileSync(
    resolve(ROOT, 'src/components/trips/flagData.ts'),
    'utf-8',
  );

  const violations: string[] = [];

  for (const code of ALPHA2_CODES) {
    const sourcePath = resolve(ROOT, `node_modules/country-flag-icons/3x2/${code}.svg`);
    let sourceSvg: string;
    try {
      sourceSvg = readFileSync(sourcePath, 'utf-8').replace(/\n/g, ' ').trim();
    } catch {
      violations.push(`${code}: source SVG not found at ${sourcePath}`);
      continue;
    }

    if (!flagDataContent.includes(sourceSvg)) {
      // Check if any version of this flag exists
      if (flagDataContent.includes(`${code}:`)) {
        violations.push(`${code}: SVG in flagData.ts does not match source — possibly truncated or hand-edited`);
      } else {
        violations.push(`${code}: missing from flagData.ts entirely`);
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Flag data integrity check failed:\n\n` +
      violations.join('\n') +
      '\n\nRegenerate flagData.ts from country-flag-icons: read the SVGs from node_modules/country-flag-icons/3x2/*.svg',
    );
  }
});
