/**
 * Shared test helpers for country schema validation.
 *
 * These tests verify properties that every supported country schema must
 * satisfy. Import and call `runSharedSchemaTests` from each schema test
 * file to avoid duplication.
 */

import { CountryFormSchema } from '../../src/types/schema';

/**
 * Runs the subset of schema tests that are identical across all country
 * schemas. Call this inside the top-level `describe` block of each
 * `__tests__/schemas/<ISO>.test.ts` file.
 */
export function runSharedSchemaTests(schema: CountryFormSchema): void {
  test('auto-fill coverage should be >= 70% for non-country-specific fields', () => {
    // Non-country-specific fields represent universal profile/leg data
    // that the form engine should auto-fill from the traveler's stored profile.
    // At least 70% of these fields must have an autoFillSource mapping.
    const nonCountrySpecificFields = schema.sections.flatMap(s =>
      s.fields.filter(f => !f.countrySpecific)
    );
    const autoFilledFields = nonCountrySpecificFields.filter(f => !!f.autoFillSource);
    const coveragePct = (autoFilledFields.length / nonCountrySpecificFields.length) * 100;

    expect(nonCountrySpecificFields.length).toBeGreaterThan(0);
    expect(coveragePct).toBeGreaterThanOrEqual(70);
  });

  test('all fields should declare countrySpecific as a boolean', () => {
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(typeof field.countrySpecific).toBe('boolean');
      });
    });
  });
}
