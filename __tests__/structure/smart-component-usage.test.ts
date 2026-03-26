import * as fs from 'fs';
import * as path from 'path';

/**
 * Structural test: enforce that smart components are used where appropriate.
 *
 * When a specialized component exists (e.g., AccommodationAutocomplete for hotel
 * names, AddressAutocomplete for addresses), screens must use it instead of a
 * plain Input. Using plain Input loses autocomplete, platform autofill hints,
 * and API-powered suggestions.
 *
 * See: .knowledge/policies/ui/styling.md
 */

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
