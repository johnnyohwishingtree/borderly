import { CountryFormSchema } from '../../src/types/schema';
import { getSchemaByCountryCode } from '../../src/schemas';
import PHL from '../../src/schemas/PHL.json';

describe('Philippines (PHL) Schema', () => {
  const schema = PHL as CountryFormSchema;

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('PHL');
    expect(schema.countryName).toBe('Philippines');
    expect(schema.portalName).toBe('Philippines eTravel');
    expect(schema.portalUrl).toBe('https://etravel.gov.ph');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).toBeDefined();
    expect(schema.submission.earliestBeforeArrival).toBe('3d');
    expect(schema.submission.recommended).toBe('24h');
  });

  test('latestBeforeArrival should be 0h — can register up to arrival', () => {
    expect(schema.submission.latestBeforeArrival).toBe('0h');
  });

  test('portalFlow should require account registration', () => {
    expect(schema.portalFlow).toBeDefined();
    expect(schema.portalFlow.requiresAccount).toBe(true);
  });

  test('portalFlow should support group registration for families', () => {
    expect(schema.portalFlow.familyPolicy).toBeDefined();
    expect(schema.portalFlow.familyPolicy!.type).toBe('group');
  });

  test('portalFlow should allow saving progress', () => {
    expect(schema.portalFlow.canSaveProgress).toBe(true);
  });

  test('implementation status should be planned', () => {
    expect(schema.metadata).toBeDefined();
    expect(schema.metadata.implementationStatus).toBe('planned');
  });

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(5);

    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('health');
    expect(sectionIds).toContain('contact');
  });

  test('personal section should include Philippines-specific occupation field', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal');
    expect(personalSection).toBeDefined();

    const fieldIds = personalSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenName');
    expect(fieldIds).toContain('middleName');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('occupation');

    const occupationField = personalSection!.fields.find(f => f.id === 'occupation');
    expect(occupationField).toBeDefined();
    expect(occupationField!.countrySpecific).toBe(true);
    expect(occupationField!.type).toBe('searchable_select');
  });

  test('occupation field should include OFW option', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const occupationField = personalSection.fields.find(f => f.id === 'occupation')!;

    const values = occupationField.options?.map(o => o.value) ?? [];
    expect(values).toContain('ofw');
    expect(values).toContain('employee');
    expect(values).toContain('student');
  });

  test('occupation field should have autoFillMapping', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const occupationField = personalSection.fields.find(f => f.id === 'occupation')!;

    expect((occupationField as any).autoFillMapping).toBeDefined();
    expect((occupationField as any).autoFillMapping._default).toBe('other');
  });

  test('passport section should have required passport fields', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport');
    expect(passportSection).toBeDefined();

    const fieldIds = passportSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportExpiry');
    expect(fieldIds).toContain('passportIssuedDate');
    expect(fieldIds).toContain('passportIssuingCountry');
  });

  test('passport expiry should auto-fill from profile', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    const expiryField = passportSection.fields.find(f => f.id === 'passportExpiry')!;

    expect(expiryField.required).toBe(true);
    expect(expiryField.autoFillSource).toBe('profile.passportExpiry');
  });

  test('travel section should have Philippines-specific port of arrival', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).toBeDefined();

    const portField = travelSection!.fields.find(f => f.id === 'portOfArrival');
    expect(portField).toBeDefined();
    expect(portField!.countrySpecific).toBe(true);

    const portCodes = portField!.options?.map(o => o.value) ?? [];
    expect(portCodes).toContain('MNL');
    expect(portCodes).toContain('CEB');
    expect(portCodes).toContain('CRK');
    expect(portCodes).toContain('KLO');
  });

  test('purpose of travel should include Balikbayan option', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfTravel')!;

    expect(purposeField).toBeDefined();
    expect(purposeField.countrySpecific).toBe(true);

    const purposes = purposeField.options?.map(o => o.value) ?? [];
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('business');
    expect(purposes).toContain('balikbayan');
  });

  test('stay duration should have validation limits', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const durationField = travelSection.fields.find(f => f.id === 'stayDuration')!;

    expect(durationField).toBeDefined();
    expect((durationField as any).validation).toBeDefined();
    expect((durationField as any).validation.min).toBe(1);
    expect((durationField as any).validation.max).toBe(30);
  });

  test('travel section should have Philippines-specific contact number field', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const contactField = travelSection.fields.find(f => f.id === 'contactNumberInPhilippines');
    expect(contactField).toBeDefined();
    expect(contactField!.countrySpecific).toBe(true);
  });

  test('health section should have symptom and contact fields', () => {
    const healthSection = schema.sections.find(s => s.id === 'health');
    expect(healthSection).toBeDefined();

    const fieldIds = healthSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('countriesVisitedLast30Days');
    expect(fieldIds).toContain('havingSymptoms');
    expect(fieldIds).toContain('contactWithSick');

    const symptomsField = healthSection!.fields.find(f => f.id === 'havingSymptoms')!;
    expect(symptomsField.type).toBe('boolean');
    expect(symptomsField.countrySpecific).toBe(true);
  });

  test('contact section should have email with validation', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact');
    expect(contactSection).toBeDefined();

    const emailField = contactSection!.fields.find(f => f.id === 'email')!;
    expect((emailField as any).validation).toBeDefined();
    expect((emailField as any).validation.pattern).toContain('@');
  });

  test('should have complete submission guide with 7 steps', () => {
    expect(schema.submissionGuide).toHaveLength(7);

    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Create eTravel Account');
    expect(stepTitles).toContain('Review and Submit');
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

  test('should have unique field IDs across all sections', () => {
    const allFieldIds = new Set<string>();

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(allFieldIds.has(field.id)).toBe(false);
        allFieldIds.add(field.id);
      });
    });
  });

  test('should be accessible via schema registry', async () => {
    const registrySchema = await getSchemaByCountryCode('PHL');
    expect(registrySchema).toBeDefined();
    expect(registrySchema?.countryCode).toBe('PHL');
  });

  test('portalFlow should support multi-step with save progress', () => {
    expect(schema.portalFlow.multiStep).toBe(true);
    expect(schema.portalFlow.canSaveProgress).toBe(true);
  });

  test('all fields should have autoFillSource or be countrySpecific', () => {
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        const hasAutoFill = !!field.autoFillSource;
        const isCountrySpecific = !!field.countrySpecific;
        expect(hasAutoFill || isCountrySpecific).toBe(true);
      });
    });
  });

  test('all date fields should use type date', () => {
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.id.toLowerCase().includes('date') && field.type !== 'text') {
          expect(field.type).toBe('date');
        }
      });
    });
  });
});
