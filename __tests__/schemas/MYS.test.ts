import { validateSchemaCompletely, loadSchema } from '../../src/services/schemas/schemaLoader';
import { getSchemaByCountryCode } from '../../src/schemas';
import MYS from '../../src/schemas/MYS.json';

describe('Malaysia (MYS) Schema', () => {
  const schema = MYS;

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('MYS');
    expect(schema.countryName).toBe('Malaysia');
    expect(schema.portalName).toBe('Malaysia Digital Arrival Card (MDAC)');
    expect(schema.portalUrl).toBe('https://imigresen-online.imi.gov.my/mdac/main');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).toBeDefined();
    expect(schema.submission.earliestBeforeArrival).toBe('3d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('24h');
  });

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(4);

    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('health_declarations');
  });

  test('personal information section should include email and phone', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal');
    expect(personalSection).toBeDefined();

    const fieldIds = personalSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('email');
    expect(fieldIds).toContain('phoneNumber');
    expect(fieldIds).toContain('passportExpiry');
  });

  test('travel section should have Malaysia-specific ports of entry', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).toBeDefined();

    const airportField = travelSection!.fields.find(f => f.id === 'arrivalAirport');
    expect(airportField).toBeDefined();
    expect(airportField!.countrySpecific).toBe(true);
    expect((airportField as any).options!.length).toBeGreaterThan(5);

    const airportCodes = (airportField as any).options!.map((o: any) => o.value);
    expect(airportCodes).toContain('KUL');
    expect(airportCodes).toContain('KUA');
    expect(airportCodes).toContain('PEN');
  });

  test('purpose of visit should have Malaysia-specific options', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    const purposeField = travelSection!.fields.find(f => f.id === 'purposeOfVisit');

    expect(purposeField).toBeDefined();
    expect(purposeField!.countrySpecific).toBe(true);

    const purposes = (purposeField as any).options!.map((o: any) => o.value);
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('visiting_family');
    expect(purposes).toContain('medical');
  });

  test('should have health declaration section', () => {
    const healthSection = schema.sections.find(s => s.id === 'health_declarations');
    expect(healthSection).toBeDefined();

    const fieldIds = healthSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('healthCondition');
    expect(fieldIds).toContain('visitedHighRiskCountries');
  });

  test('currency declaration should have Malaysia-specific threshold', () => {
    const healthSection = schema.sections.find(s => s.id === 'health_declarations');
    const currencyField = healthSection!.fields.find(f => f.id === 'carryingCurrency');

    expect(currencyField).toBeDefined();
    expect(currencyField!.label).toContain('RM10,000');
    expect((currencyField as any).helpText).toContain('Malaysian Ringgit');
  });

  test('duration of stay should have validation limits', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    const durationField = travelSection!.fields.find(f => f.id === 'durationOfStay');

    expect(durationField).toBeDefined();
    expect((durationField as any).validation).toBeDefined();
    expect((durationField as any).validation!.min).toBe(1);
    expect((durationField as any).validation!.max).toBe(90);
  });

  test('should have complete submission guide', () => {
    expect(schema.submissionGuide).toHaveLength(6);

    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Access MDAC Portal');
    expect(stepTitles).toContain('Submit and Save');
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

  test('email field should have validation pattern', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const emailField = personalSection.fields.find(f => f.id === 'email')!;

    expect((emailField as any).validation).toBeDefined();
    expect((emailField as any).validation!.pattern).toBeDefined();
    expect((emailField as any).validation!.pattern).toContain('@');
  });

  test('should validate against schema structure', () => {
    expect(() => {
      const validatedSchema = loadSchema(schema, 'MYS');
      validateSchemaCompletely(validatedSchema);
    }).not.toThrow();
  });

  test('should be accessible via schema registry', () => {
    const registrySchema = getSchemaByCountryCode('MYS');
    expect(registrySchema).toBeDefined();
    expect(registrySchema?.countryCode).toBe('MYS');
  });

  test('health fields should be country-specific', () => {
    const healthSection = schema.sections.find(s => s.id === 'health_declarations')!;

    const healthField = healthSection.fields.find(f => f.id === 'healthCondition')!;
    expect(healthField.countrySpecific).toBe(true);

    const riskField = healthSection.fields.find(f => f.id === 'visitedHighRiskCountries')!;
    expect(riskField.countrySpecific).toBe(true);
  });

  test('accommodation should support textarea for address', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const addressField = accommodationSection.fields.find(f => f.id === 'hotelAddress')!;

    expect(addressField.type).toBe('textarea');
  });
});
