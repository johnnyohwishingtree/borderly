/**
 * Shared test helpers for country schema validation.
 *
 * These tests verify properties that every supported country schema must
 * satisfy. Import and call `runSharedSchemaTests` from each schema test
 * file to avoid duplication.
 */

import { CountryFormSchema } from '../../src/types/schema';
import { validateSchemaCompletely, loadSchema } from '../../src/services/schemas/schemaLoader';
import { getSchemaByCountryCode } from '../../src/schemas';

/**
 * Runs the subset of schema tests that are identical across all country
 * schemas. Call this inside the top-level `describe` block of each
 * `__tests__/schemas/<ISO>.test.ts` file.
 *
 * @param schema - The parsed country form schema JSON
 * @param countryCode - ISO 3166-1 alpha-3 code (e.g. 'JPN')
 */
export function runSharedSchemaTests(schema: CountryFormSchema, countryCode?: string): void {
  const code = countryCode ?? schema.countryCode;

  // ── Auto-fill coverage ────────────────────────────────────────────────────

  test('auto-fill coverage should be >= 70% for non-country-specific fields', () => {
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

  // ── Submission guide integrity ────────────────────────────────────────────

  test('submission guide steps should have incrementing order', () => {
    const orders = schema.submissionGuide.map(s => s.order);
    orders.forEach((order, index) => {
      expect(order).toBe(index + 1);
    });
  });

  test('each submission guide step should have non-empty title and description', () => {
    schema.submissionGuide.forEach(step => {
      expect(step.title).toEqual(expect.stringMatching(/\S/));
      expect(step.description).toEqual(expect.stringMatching(/\S/));
    });
  });

  test('submission guide should reference valid field IDs', () => {
    const allFieldIds = new Set<string>();
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        allFieldIds.add(field.id);
      });
    });

    schema.submissionGuide.forEach(step => {
      step.fieldsOnThisScreen.forEach(fieldId => {
        expect(allFieldIds.has(fieldId)).toBe(true);
      });
    });
  });

  // ── Field ID uniqueness ───────────────────────────────────────────────────

  test('should have unique field IDs across all sections', () => {
    const allFieldIds = new Set<string>();

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(allFieldIds.has(field.id)).toBe(false);
        allFieldIds.add(field.id);
      });
    });
  });

  // ── autoFillSource validity ───────────────────────────────────────────────

  test('fields with autoFillSource should reference valid profile or leg paths', () => {
    const validPrefixes = ['profile.', 'leg.'];

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        const autoFill = field.autoFillSource;
        if (autoFill) {
          const hasValidPrefix = validPrefixes.some(prefix => autoFill.startsWith(prefix));
          expect(hasValidPrefix).toBe(true);
        }
      });
    });
  });

  test('all fields should have a boolean required property', () => {
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(typeof field.required).toBe('boolean');
      });
    });
  });

  // ── Schema validation & registry ──────────────────────────────────────────

  test('should validate against schema structure', () => {
    expect(() => {
      const validatedSchema = loadSchema(schema, code);
      validateSchemaCompletely(validatedSchema);
    }).not.toThrow();
  });

  test('should be accessible via schema registry', async () => {
    const registrySchema = await getSchemaByCountryCode(code);
    expect(registrySchema).not.toBeUndefined();
    expect(registrySchema?.countryCode).toBe(code);
  });

  // ── changeDetection ───────────────────────────────────────────────────────

  test('should have changeDetection with non-empty monitoredSelectors', () => {
    expect(schema.changeDetection).not.toBeUndefined();
    expect(Array.isArray(schema.changeDetection.monitoredSelectors)).toBe(true);
    expect(schema.changeDetection.monitoredSelectors.length).toBeGreaterThan(0);
  });
}
