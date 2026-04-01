/**
 * Constraint: All city fields in schemas must have an autoFillSource.
 *
 * Scope: src/schemas/*.json — all country schema files
 *
 * Rules:
 *   - Every field with "city" in its ID (case-insensitive) must have autoFillSource
 *   - Home city fields → profile.homeAddress.city
 *   - Departure city fields → leg.departureAirportCity (derived from airport)
 *   - City of stay / accommodation city → leg.accommodation.address.city
 *
 * Why: City fields are tedious to type and error-prone. The data is already
 * available from the profile, trip leg, or accommodation — leaving them
 * blank when we have the answer wastes the user's time.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const SCHEMAS_DIR = resolve(ROOT, 'src/schemas');

function getSchemaFiles(): string[] {
  return readdirSync(SCHEMAS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'manifest.json')
    .map(f => resolve(SCHEMAS_DIR, f));
}

interface SchemaField {
  id: string;
  label: string;
  type: string;
  autoFillSource?: string;
}

interface SchemaSection {
  fields: SchemaField[];
}

interface Schema {
  sections: SchemaSection[];
}

test('all city fields in schemas have an autoFillSource', () => {
  const schemaFiles = getSchemaFiles();
  const violations: string[] = [];

  for (const file of schemaFiles) {
    const schema: Schema = JSON.parse(readFileSync(file, 'utf-8'));
    const filename = file.replace(ROOT + '/', '');

    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.id.toLowerCase().includes('city') && !field.autoFillSource) {
          violations.push(`${filename}: field "${field.id}" (${field.label}) has no autoFillSource`);
        }
      }
    }
  }

  expect(violations).toEqual([]);
});
