import { CountryFormSchema } from '../../src/types/schema';
import { validateSchemaCompletely, loadSchema } from '../../src/services/schemas/schemaLoader';
import { getSchemaByCountryCode } from '../../src/schemas';
import GBR from '../../src/schemas/GBR.json';

describe('United Kingdom (GBR) Schema', () => {
  const schema = GBR as CountryFormSchema;

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('GBR');
    expect(schema.countryName).toBe('United Kingdom');
    expect(schema.portalName).toBe('UK Electronic Travel Authorisation (ETA)');
    expect(schema.schemaVersion).toBe('2.0.0');
  });

  test('portalUrl should point to gov.uk', () => {
    expect(schema.portalUrl).toContain('gov.uk');
    expect(schema.portalUrl).toBe('https://www.gov.uk/apply-electronic-travel-authorisation');
  });

  test('should have implementationStatus set to planned', () => {
    expect(schema.metadata).not.toBeUndefined();
    expect(schema.metadata.implementationStatus).toBe('planned');
  });

  test('supportedLanguages should contain en', () => {
    expect(schema.metadata.supportedLanguages).toContain('en');
  });

  test('should have metadata with expected fields', () => {
    const metadata = schema.metadata;
    expect(metadata.priority).toBe(6);
    expect(metadata.complexity).toBe('medium');
    expect(metadata.popularity).toBe(85);
    expect(metadata.maintenanceFrequency).toBe('quarterly');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).not.toBeUndefined();
    expect(schema.submission.earliestBeforeArrival).toBe('30d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('72h');
    expect(schema.submission.processingTime).toBe('72h');
  });

  test('changeDetection monitoredSelectors should be non-empty', () => {
    expect(schema.changeDetection).not.toBeUndefined();
    expect(Array.isArray(schema.changeDetection.monitoredSelectors)).toBe(true);
    expect(schema.changeDetection.monitoredSelectors.length).toBeGreaterThan(0);
  });

  test('changeDetection fallbackActions should reference gov_uk_update trigger', () => {
    const triggers = schema.changeDetection.fallbackActions.map(a => a.trigger);
    expect(triggers).toContain('gov_uk_update');
  });

  test('should have all required sections', () => {
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('security');
  });

  test('passport section should have required passport fields', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport');
    expect(passportSection).not.toBeUndefined();

    const fieldIds = passportSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportCountryOfIssue');
    expect(fieldIds).toContain('passportIssueDate');
    expect(fieldIds).toContain('passportExpiryDate');
  });

  test('passport fields should be required and have autoFillSource', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;

    const passportNumberField = passportSection.fields.find(f => f.id === 'passportNumber')!;
    expect(passportNumberField.required).toBe(true);
    expect(passportNumberField.autoFillSource).toBe('profile.passportNumber');

    const expiryField = passportSection.fields.find(f => f.id === 'passportExpiryDate')!;
    expect(expiryField.required).toBe(true);
    expect(expiryField.autoFillSource).toBe('profile.passportExpiry');
  });

  test('personal section should have required identity fields', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal');
    expect(personalSection).not.toBeUndefined();

    const fieldIds = personalSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('familyName');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('gender');
  });

  test('personal section name fields should auto-fill from profile', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;

    const givenNamesField = personalSection.fields.find(f => f.id === 'givenNames')!;
    expect(givenNamesField.required).toBe(true);
    expect(givenNamesField.autoFillSource).toBe('profile.givenNames');

    const familyNameField = personalSection.fields.find(f => f.id === 'familyName')!;
    expect(familyNameField.required).toBe(true);
    expect(familyNameField.autoFillSource).toBe('profile.surname');
  });

  test('travel section should have required travel fields', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).not.toBeUndefined();

    const fieldIds = travelSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('arrivalDate');
    expect(fieldIds).toContain('visitPurpose');
    expect(fieldIds).toContain('ukAddress');
  });

  test('arrivalDate should auto-fill from leg', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const arrivalDateField = travelSection.fields.find(f => f.id === 'arrivalDate')!;

    expect(arrivalDateField.required).toBe(true);
    expect(arrivalDateField.autoFillSource).toBe('leg.arrivalDate');
  });

  test('visitPurpose should be country-specific with options', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const visitPurposeField = travelSection.fields.find(f => f.id === 'visitPurpose')!;

    expect(visitPurposeField.countrySpecific).toBe(true);
    expect(visitPurposeField.type).toBe('searchable_select');
    const values = visitPurposeField.options!.map(o => o.value);
    expect(values).toContain('tourism');
    expect(values).toContain('business');
    expect(values).toContain('transit');
  });

  test('security section should have country-specific boolean fields', () => {
    const securitySection = schema.sections.find(s => s.id === 'security');
    expect(securitySection).not.toBeUndefined();

    const fieldIds = securitySection!.fields.map(f => f.id);
    expect(fieldIds).toContain('criminalRecord');
    expect(fieldIds).toContain('immigrationBreach');
    expect(fieldIds).toContain('ukRefusal');
    expect(fieldIds).toContain('terrorismAssociation');

    securitySection!.fields.forEach(field => {
      expect(field.type).toBe('boolean');
      expect(field.required).toBe(true);
      expect(field.countrySpecific).toBe(true);
    });
  });

  test('portalFlow should require an account', () => {
    expect(schema.portalFlow).not.toBeUndefined();
    expect(schema.portalFlow.requiresAccount).toBe(true);
  });

  test('should have a complete submission guide', () => {
    expect(schema.submissionGuide).not.toBeUndefined();
    expect(schema.submissionGuide.length).toBeGreaterThan(0);

    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles.some(t => t.toLowerCase().includes('account'))).toBe(true);
  });

  test('submission guide steps should have incrementing order', () => {
    const orders = schema.submissionGuide.map(s => s.order);
    orders.forEach((order, index) => {
      expect(order).toBe(index + 1);
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

  test('should have unique field IDs across all sections', () => {
    const allFieldIds = schema.sections.flatMap(s => s.fields.map(f => f.id));
    const duplicates = allFieldIds.filter((id, index) => allFieldIds.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
  });

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

  test('all fields should have required property as a boolean', () => {
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(typeof field.required).toBe('boolean');
      });
    });
  });

  test('should validate against schema structure', () => {
    expect(() => {
      const validatedSchema = loadSchema(schema, 'GBR');
      validateSchemaCompletely(validatedSchema);
    }).not.toThrow();
  });

  test('should be accessible via schema registry', async () => {
    const registrySchema = await getSchemaByCountryCode('GBR');
    expect(registrySchema).not.toBeUndefined();
    expect(registrySchema?.countryCode).toBe('GBR');
  });
});
