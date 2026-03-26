/**
 * Tests for schemas/validation/schemaValidator
 */

import { schemaValidator } from '@/services/schemas/validation/schemaValidator';
import { CountryFormSchema } from '@/types/schema';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeMinimalSchema(overrides?: Partial<CountryFormSchema>): CountryFormSchema {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    schemaVersion: '1.0.0',
    lastUpdated: new Date().toISOString(),
    portalUrl: 'https://vjw-lp.digital.go.jp',
    portalName: 'Visit Japan Web',
    submission: {
      earliestBeforeArrival: '14d',
      latestBeforeArrival: '1d',
      recommended: '7d',
      processingTime: '24h',
    },
    sections: [
      {
        id: 'personal',
        title: 'Personal Info',
        fields: [
          { id: 'surname', label: 'Surname', type: 'text', required: true, countrySpecific: false },
        ],
      },
    ],
    submissionGuide: [
      { order: 1, title: 'Step 1', description: 'First step', fieldsOnThisScreen: ['surname'] },
    ],
    ...overrides,
  } as CountryFormSchema;
}

// ---------------------------------------------------------------------------
// validateSchema
// ---------------------------------------------------------------------------
describe('schemaValidator.validateSchema', () => {
  it('passes for a valid minimal schema', async () => {
    const result = await schemaValidator.validateSchema(makeMinimalSchema());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('errors when required fields are missing', async () => {
    const schema = makeMinimalSchema();
    delete (schema as unknown as Record<string, unknown>).countryCode;
    const result = await schemaValidator.validateSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes("'countryCode' is missing"))).toBe(true);
  });

  it('errors on invalid country code format', async () => {
    const schema = makeMinimalSchema({ countryCode: 'jp' } as never);
    const result = await schemaValidator.validateSchema(schema);
    expect(result.errors.some(e => e.message.includes('3-letter ISO'))).toBe(true);
  });

  it('errors on invalid semver schema version', async () => {
    const schema = makeMinimalSchema({ schemaVersion: 'bad' } as never);
    const result = await schemaValidator.validateSchema(schema);
    expect(result.errors.some(e => e.message.includes('semantic versioning'))).toBe(true);
  });

  it('errors on invalid timestamp format', async () => {
    const schema = makeMinimalSchema({ lastUpdated: 'not-a-date' } as never);
    const result = await schemaValidator.validateSchema(schema);
    expect(result.errors.some(e => e.message.includes('ISO 8601'))).toBe(true);
  });

  it('errors on invalid submission timing format', async () => {
    const schema = makeMinimalSchema({
      submission: {
        earliestBeforeArrival: 'two weeks',
        latestBeforeArrival: '1d',
        recommended: '7d',
        processingTime: '24h',
      },
    } as never);
    const result = await schemaValidator.validateSchema(schema);
    expect(result.errors.some(e => e.message.includes("'14d', '72h', '1w'"))).toBe(true);
  });

  it('warns when submissionGuide references non-existent field IDs', async () => {
    const schema = makeMinimalSchema({
      submissionGuide: [
        { order: 1, title: 'Step 1', description: 'Desc', fieldsOnThisScreen: ['nonExistentField'] },
      ],
    } as never);
    const result = await schemaValidator.validateSchema(schema);
    expect(result.warnings.some(w => w.message.includes('not found in schema'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateField
// ---------------------------------------------------------------------------
describe('schemaValidator.validateField', () => {
  it('passes for a valid field', async () => {
    const result = await schemaValidator.validateField({
      id: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      countrySpecific: false,
    });
    expect(result.valid).toBe(true);
  });

  it('errors on invalid field type', async () => {
    const result = await schemaValidator.validateField({
      id: 'f1',
      label: 'F',
      type: 'color' as never,
      required: false,
      countrySpecific: false,
    });
    expect(result.errors.some(e => e.message.includes('Invalid field type'))).toBe(true);
  });
});
