import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const SCHEMAS_DIR = resolve(ROOT, 'src/schemas');

/**
 * Spec: Every country schema that has an email/phone field should have
 * autoFillSource pointing to the profile.
 *
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 *
 * If a country form asks for email or phone, the schema must declare
 * autoFillSource so the form engine can auto-fill from the profile.
 * Fields without autoFillSource force manual entry every time.
 *
 * Confirm: All email/phone fields auto-fill after first entry
 * Invalidate: Some country's email/phone field has a different meaning than personal contact
 */
test.skip('all email fields in schemas have profile.email autoFillSource', () => {
  const schemas = readdirSync(SCHEMAS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'manifest.json');

  const missing: string[] = [];

  for (const file of schemas) {
    const schema = JSON.parse(readFileSync(resolve(SCHEMAS_DIR, file), 'utf-8'));
    const sections = schema.sections || [];
    for (const section of sections) {
      for (const field of section.fields || []) {
        if (field.id === 'email' || field.id === 'emailAddress' || field.label?.toLowerCase().includes('email')) {
          if (!field.autoFillSource?.startsWith('profile.email')) {
            missing.push(`${file}: ${field.id} (${field.label})`);
          }
        }
      }
    }
  }

  expect(missing).toEqual([]);
});

test.skip('all phone fields in schemas have profile.phoneNumber autoFillSource', () => {
  const schemas = readdirSync(SCHEMAS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'manifest.json');

  const missing: string[] = [];

  for (const file of schemas) {
    const schema = JSON.parse(readFileSync(resolve(SCHEMAS_DIR, file), 'utf-8'));
    const sections = schema.sections || [];
    for (const section of sections) {
      for (const field of section.fields || []) {
        if (field.id === 'phoneNumber' || field.id === 'phone' || field.label?.toLowerCase().includes('phone number')) {
          // Skip hotel/accommodation/emergency phone — those aren't personal
          if (field.id.includes('accommodation') || field.id.includes('hotel') || field.id.includes('emergency') || field.id.includes('employer')) continue;
          if (!field.autoFillSource?.match(/profile\.(phoneNumber|phone)/)) {
            missing.push(`${file}: ${field.id} (${field.label})`);
          }
        }
      }
    }
  }

  expect(missing).toEqual([]);
});
