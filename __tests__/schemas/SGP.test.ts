import { validateSchemaCompletely, loadSchema } from '../../src/services/schemas/schemaLoader';
import { getSchemaByCountryCode } from '../../src/schemas';
import SGP from '../../src/schemas/SGP.json';

describe('Singapore (SGP) Schema', () => {
  const schema = SGP;

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('SGP');
    expect(schema.countryName).toBe('Singapore');
    expect(schema.portalName).toBe('SG Arrival Card');
    expect(schema.portalUrl).toBe('https://eservices.ica.gov.sg/sgarrivalcard');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).toBeDefined();
    expect(schema.submission.earliestBeforeArrival).toBe('3d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('24h');
  });

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(5);

    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('health_declarations');
    expect(sectionIds).toContain('customs_declarations');
  });

  test('travel section should have Singapore-specific fields', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).toBeDefined();

    const fieldIds = travelSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('arrivalTime');
    expect(fieldIds).toContain('departureCity');
  });

  test('accommodation should have type selection', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation');
    expect(accommodationSection).toBeDefined();

    const typeField = accommodationSection!.fields.find(f => f.id === 'accommodationType');
    expect(typeField).toBeDefined();
    expect(typeField!.countrySpecific).toBe(true);

    const types = (typeField as any).options!.map((o: any) => o.value);
    expect(types).toContain('hotel');
    expect(types).toContain('friends_family');
    expect(types).toContain('serviced_apartment');
  });

  test('health declarations should be comprehensive', () => {
    const healthSection = schema.sections.find(s => s.id === 'health_declarations');
    expect(healthSection).toBeDefined();

    const fieldIds = healthSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('feverSymptoms');
    expect(fieldIds).toContain('infectiousDisease');
    expect(fieldIds).toContain('visitedOutbreakArea');
    expect(fieldIds).toContain('contactWithInfected');

    // All health fields should be country-specific
    healthSection!.fields.forEach(field => {
      expect(field.countrySpecific).toBe(true);
    });
  });

  test('customs declarations should have Singapore-specific thresholds', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs_declarations');
    expect(customsSection).toBeDefined();

    const cashField = customsSection!.fields.find(f => f.id === 'carryingCash');
    expect(cashField).toBeDefined();
    expect(cashField!.label).toContain('S$20,000');
    expect((cashField as any).helpText).toContain('Singapore Dollars');

    const allowanceField = customsSection!.fields.find(f => f.id === 'exceedsAllowance');
    expect(allowanceField).toBeDefined();
    expect((allowanceField as any).helpText).toContain('chocolate');
    expect((allowanceField as any).helpText).toContain('S$150');
  });

  test('purpose of visit should have comprehensive options', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    const purposeField = travelSection!.fields.find(f => f.id === 'purposeOfVisit');

    expect(purposeField).toBeDefined();
    expect(purposeField!.countrySpecific).toBe(true);

    const purposes = (purposeField as any).options!.map((o: any) => o.value);
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('employment');
    expect(purposes).toContain('conference');
    expect(purposes.length).toBeGreaterThan(7);
  });

  test('should have complete submission guide with 7 steps', () => {
    expect(schema.submissionGuide).toHaveLength(7);

    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Access SG Arrival Card');
    expect(stepTitles).toContain('Submit and Save Confirmation');
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

  test('intended length of stay should have validation', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    const lengthField = travelSection!.fields.find(f => f.id === 'intendedLengthOfStay');

    expect(lengthField).toBeDefined();
    expect((lengthField as any).validation).toBeDefined();
    expect((lengthField as any).validation!.min).toBe(1);
    expect((lengthField as any).validation!.max).toBe(90);
  });

  test('should require passport expiry date', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal');
    const expiryField = personalSection!.fields.find(f => f.id === 'passportExpiry');

    expect(expiryField).toBeDefined();
    expect(expiryField!.required).toBe(true);
    expect((expiryField as any).autoFillSource).toBe('profile.passportExpiry');
  });

  test('should validate against schema structure', () => {
    expect(() => {
      const validatedSchema = loadSchema(schema, 'SGP');
      validateSchemaCompletely(validatedSchema);
    }).not.toThrow();
  });

  test('should be accessible via schema registry', () => {
    const registrySchema = getSchemaByCountryCode('SGP');
    expect(registrySchema).toBeDefined();
    expect(registrySchema?.countryCode).toBe('SGP');
  });

  test('should have unique field IDs across all sections', () => {
    const allFieldIds = new Set<string>();

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(allFieldIds.has(field.id)).toBe(false);
        allFieldIds.add(field.id);
      });
    });
  });

  test('email and phone should be required in personal section', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;

    const emailField = personalSection.fields.find(f => f.id === 'email')!;
    expect(emailField.required).toBe(true);
    expect((emailField as any).validation!.pattern).toContain('@');

    const phoneField = personalSection.fields.find(f => f.id === 'phoneNumber')!;
    expect(phoneField.required).toBe(true);
    expect((phoneField as any).helpText).toContain('country code');
  });

  test('accommodation address should be textarea type', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const addressField = accommodationSection.fields.find(f => f.id === 'accommodationAddress')!;

    expect(addressField.type).toBe('textarea');
    expect((addressField as any).helpText).toContain('postal code');
  });
});
