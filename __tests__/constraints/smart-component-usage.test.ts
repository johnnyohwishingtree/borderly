/**
 * Constraint: Smart Component Usage (from Styling policy)
 *
 * Scope: src/components/, src/screens/
 *
 * REQUIRE: use specialized components where they exist (AccommodationAutocomplete,
 *          AddressAutocomplete) instead of plain Input
 * DENY:    plain Input for accommodation name fields — use AccommodationAutocomplete
 * DENY:    plain Input for address fields — use AddressAutocomplete
 * DENY:    mixing StyleSheet with NativeWind in same component
 * DENY:    fixed widths (w-[320px]) — use responsive classes
 *
 * Exceptions:
 * - Lucide icon color prop accepts inline hex — component library requirement
 * - CountryFlag.tsx — pixel-precise SVG flag rendering requires inline styles
 *
 * Anti-patterns:
 * - Plain <Input> with testID "accommodation-name" — use AccommodationAutocomplete
 * - Plain <Input> with testID "address-line1" — use AddressAutocomplete
 *
 * Why: Smart components provide autocomplete, platform autofill hints, and
 *      API-powered suggestions. Plain Input loses all of these.
 *      Smart components (AccommodationAutocomplete, AddressAutocomplete) provide consistent UX.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');

function readFileContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Collect all .tsx files in a directory recursively.
 */
function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Smart component rules.
 *
 * Each rule defines:
 * - contextPattern: regex matching the surrounding context (e.g., accommodation section)
 * - forbiddenPattern: regex matching plain Input usage in that context
 * - requiredImport: the smart component that should be imported instead
 * - message: human-readable description of the violation
 */
interface SmartComponentRule {
  name: string;
  /** Files where this rule applies (glob-like path match) */
  filePattern: RegExp;
  /** The smart component that must be used */
  requiredComponent: string;
  /** Pattern that indicates a plain Input is used for this field type.
   *  Matches testID or placeholder patterns that identify accommodation name fields. */
  violationPattern: RegExp;
  /** Multiline: set true if the pattern spans lines */
  multiline?: boolean;
  message: string;
}

const RULES: SmartComponentRule[] = [
  {
    name: 'accommodation-name-must-use-AccommodationAutocomplete',
    filePattern: /screens\/.*\.tsx$/,
    requiredComponent: 'AccommodationAutocomplete',
    // Matches: <Input ... testID="...-accommodation-name" or placeholder containing hotel/accommodation
    violationPattern: /<Input[^>]*(?:accommodation-name|Park Hyatt|hotel name)[^>]*\/>/i,
    message:
      'Accommodation name fields must use <AccommodationAutocomplete> (not plain <Input>). ' +
      'AccommodationAutocomplete provides Google Places lodging suggestions.',
  },
  {
    name: 'address-must-use-AddressAutocomplete',
    filePattern: /screens\/.*\.tsx$/,
    requiredComponent: 'AddressAutocomplete',
    // Matches: multiple plain Input fields for address sub-fields (line1, city, postal code)
    // without AddressAutocomplete being imported
    violationPattern: /<Input[^>]*(?:address-line1|Start typing an address)[^>]*\/>/i,
    message:
      'Address fields must use <AddressAutocomplete> (not individual plain <Input> fields). ' +
      'AddressAutocomplete provides Google Places address suggestions and structured parsing.',
  },
];

describe('smart component usage', () => {
  const screenFiles = collectTsxFiles(path.join(SRC_DIR, 'screens'));

  it('should find screen files to check', () => {
    expect(screenFiles.length).toBeGreaterThan(0);
  });

  for (const rule of RULES) {
    it(`${rule.name}`, () => {
      const violations: Array<{ file: string; line: number; text: string }> = [];

      for (const filePath of screenFiles) {
        if (!rule.filePattern.test(filePath)) continue;

        const content = readFileContent(filePath);
        if (!content) continue;

        // Skip files that already import the required component
        if (content.includes(rule.requiredComponent)) {
          // File imports the smart component — check if it ALSO has violations
          // (importing but not using for all instances)
        }

        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          rule.violationPattern.lastIndex = 0;
          if (rule.violationPattern.test(lines[i])) {
            violations.push({
              file: path.relative(SRC_DIR, filePath),
              line: i + 1,
              text: lines[i].trim(),
            });
          }
        }
      }

      if (violations.length > 0) {
        const report = violations
          .map((v) => `  ${v.file}:${v.line} — ${v.text}`)
          .join('\n');
        throw new Error(
          `${rule.message}\n\nFound ${violations.length} violation(s):\n\n${report}`
        );
      }
    });
  }
});
