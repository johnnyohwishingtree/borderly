import { CountryFormSchema } from '../../src/types/schema';
import { validateSchemaCompletely, loadSchema } from '../../src/services/schemas/schemaLoader';
import { getSchemaByCountryCode } from '../../src/schemas';
import USA from '../../src/schemas/USA.json';

describe('United States (USA) Schema', () => {
  const schema = USA as CountryFormSchema;

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('USA');
    expect(schema.countryName).toBe('United States');
    expect(schema.portalName).toBe('CBP One (Customs Declaration)');
    expect(schema.schemaVersion).toBe('2.1.0');
  });

  test('portalUrl should point to CBP One portal', () => {
    expect(schema.portalUrl).toBe('https://cbpone.cbp.dhs.gov/');
  });

  test('should have implementationStatus set to planned', () => {
    expect(schema.metadata).toBeDefined();
    expect(schema.metadata.implementationStatus).toBe('planned');
  });

  test('complexity should be high per metadata', () => {
    expect(schema.metadata.complexity).toBe('high');
  });

  test('supportedLanguages should include en and es', () => {
    expect(schema.metadata.supportedLanguages).toContain('en');
    expect(schema.metadata.supportedLanguages).toContain('es');
  });

  test('should have metadata with expected fields', () => {
    const metadata = schema.metadata;
    expect(metadata.priority).toBe(5);
    expect(metadata.popularity).toBe(95);
    expect(metadata.maintenanceFrequency).toBe('monthly');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).toBeDefined();
    expect(schema.submission.earliestBeforeArrival).toBe('730d');
    expect(schema.submission.latestBeforeArrival).toBe('72h');
    expect(schema.submission.recommended).toBe('14d');
    expect(schema.submission.processingTime).toBe('72h');
  });

  test('changeDetection monitoredSelectors should be non-empty', () => {
    expect(schema.changeDetection).toBeDefined();
    expect(schema.changeDetection.monitoredSelectors).toBeDefined();
    expect(schema.changeDetection.monitoredSelectors.length).toBeGreaterThan(0);
  });

  test('changeDetection fallbackAction trigger should be cbp_system_update', () => {
    const triggers = schema.changeDetection.fallbackActions.map(a => a.trigger);
    expect(triggers).toContain('cbp_system_update');
  });

  test('should have all required sections', () => {
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('applicant');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('eligibility');
  });

  test('applicant section should have required CBP One declaration fields', () => {
    const applicantSection = schema.sections.find(s => s.id === 'applicant');
    expect(applicantSection).toBeDefined();

    const fieldIds = applicantSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('firstName');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('countryOfBirth');
    expect(fieldIds).toContain('gender');
  });

  test('surname field should auto-fill from profile and be required', () => {
    const applicantSection = schema.sections.find(s => s.id === 'applicant')!;
    const surnameField = applicantSection.fields.find(f => f.id === 'surname')!;

    expect(surnameField.required).toBe(true);
    expect(surnameField.autoFillSource).toBe('profile.surname');
  });

  test('firstName (givenName) field should auto-fill from profile and be required', () => {
    const applicantSection = schema.sections.find(s => s.id === 'applicant')!;
    const firstNameField = applicantSection.fields.find(f => f.id === 'firstName')!;

    expect(firstNameField.required).toBe(true);
    expect(firstNameField.autoFillSource).toBe('profile.givenNames');
  });

  test('passport section should have required passportNumber field', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport');
    expect(passportSection).toBeDefined();

    const fieldIds = passportSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportCountry');
    expect(fieldIds).toContain('passportIssueDate');
    expect(fieldIds).toContain('passportExpirationDate');
  });

  test('passportNumber field should be required and auto-fill from profile', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    const passportNumberField = passportSection.fields.find(f => f.id === 'passportNumber')!;

    expect(passportNumberField.required).toBe(true);
    expect(passportNumberField.autoFillSource).toBe('profile.passportNumber');
  });

  test('travel section should have CBP One travel fields', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).toBeDefined();

    const fieldIds = travelSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('purposeOfTravel');
    expect(fieldIds).toContain('addressInUS');
  });

  test('eligibility section should have required declaration answer fields', () => {
    const eligibilitySection = schema.sections.find(s => s.id === 'eligibility');
    expect(eligibilitySection).toBeDefined();

    const fieldIds = eligibilitySection!.fields.map(f => f.id);
    expect(fieldIds).toContain('drugConviction');
    expect(fieldIds).toContain('terrorism');
    expect(fieldIds).toContain('visaRefusal');

    // All eligibility fields should be boolean, required, and country-specific
    eligibilitySection!.fields.forEach(field => {
      expect(field.type).toBe('boolean');
      expect(field.required).toBe(true);
      expect(field.countrySpecific).toBe(true);
    });
  });

  test('portalFlow should require an account', () => {
    expect(schema.portalFlow).toBeDefined();
    expect(schema.portalFlow.requiresAccount).toBe(true);
  });

  test('portalFlow familyPolicy should be companion type', () => {
    const portalFlow = schema.portalFlow;
    expect(portalFlow.familyPolicy).toBeDefined();
    expect(portalFlow.familyPolicy!.type).toBe('companion');
  });

  test('should have a complete submission guide', () => {
    expect(schema.submissionGuide).toBeDefined();
    expect(schema.submissionGuide.length).toBeGreaterThan(0);

    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles.some(t => t.includes('CBP One'))).toBe(true);
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
    const allFieldIds = new Set<string>();

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(allFieldIds.has(field.id)).toBe(false);
        allFieldIds.add(field.id);
      });
    });
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
      const validatedSchema = loadSchema(schema, 'USA');
      validateSchemaCompletely(validatedSchema);
    }).not.toThrow();
  });

  test('should be accessible via schema registry', async () => {
    const registrySchema = await getSchemaByCountryCode('USA');
    expect(registrySchema).toBeDefined();
    expect(registrySchema?.countryCode).toBe('USA');
  });
});
