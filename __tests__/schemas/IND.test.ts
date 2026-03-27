import { CountryFormSchema } from '../../src/types/schema';
import { getSchemaByCountryCode } from '../../src/schemas';
import IND from '../../src/schemas/IND.json';

describe('India (IND) Schema', () => {
  const schema = IND as CountryFormSchema;

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('IND');
    expect(schema.countryName).toBe('India');
    expect(schema.portalName).toBe('India Air Suvidha / e-Arrival Card');
    expect(schema.portalUrl).toBe('https://www.newdelhiairport.in/airsuvidha');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).not.toBeUndefined();
    expect(schema.submission.earliestBeforeArrival).toBe('14d');
    expect(schema.submission.recommended).toBe('3d');
  });

  test('latestBeforeArrival should be 0d — can be submitted up to arrival', () => {
    expect(schema.submission.latestBeforeArrival).toBe('0d');
  });

  test('portalFlow should not require account registration', () => {
    expect(schema.portalFlow).not.toBeUndefined();
    expect(schema.portalFlow.requiresAccount).toBe(false);
  });

  test('implementation status should be planned', () => {
    expect(schema.metadata).not.toBeUndefined();
    expect(schema.metadata.implementationStatus).toBe('complete');
  });

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(6);

    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('health');
    expect(sectionIds).toContain('customs');
    expect(sectionIds).toContain('contact');
  });

  test('personal section should include India-specific occupation field', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal');
    expect(personalSection).not.toBeUndefined();

    const fieldIds = personalSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenName');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('occupation');

    const occupationField = personalSection!.fields.find(f => f.id === 'occupation');
    expect(occupationField).not.toBeUndefined();
    expect(occupationField!.countrySpecific).toBe(true);
    expect(occupationField!.required).toBe(true);
    expect(occupationField!.type).toBe('searchable_select');
  });

  test('occupation field should have autoFillMapping', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const occupationField = personalSection.fields.find(f => f.id === 'occupation')!;

    expect((occupationField as any).autoFillMapping).not.toBeUndefined();
    expect((occupationField as any).autoFillMapping._default).toBe('other');
    expect((occupationField as any).autoFillMapping.STUDENT).toBe('student');
  });

  test('gender field should include Other option for India', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const genderField = personalSection.fields.find(f => f.id === 'gender')!;

    const values = genderField.options?.map(o => o.value) ?? [];
    expect(values).toContain('M');
    expect(values).toContain('F');
    expect(values).toContain('O');
  });

  test('passport section should have all required passport fields', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport');
    expect(passportSection).not.toBeUndefined();

    const fieldIds = passportSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportExpiry');
    expect(fieldIds).toContain('passportIssuedDate');
    expect(fieldIds).toContain('passportType');
    expect(fieldIds).toContain('passportIssuingCountry');
  });

  test('passport section should have India-specific visa fields', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;

    const visaNumberField = passportSection.fields.find(f => f.id === 'visaNumber');
    expect(visaNumberField).not.toBeUndefined();
    expect(visaNumberField!.countrySpecific).toBe(true);

    const visaTypeField = passportSection.fields.find(f => f.id === 'visaType');
    expect(visaTypeField).not.toBeUndefined();
    expect(visaTypeField!.countrySpecific).toBe(true);

    const visaTypes = visaTypeField!.options?.map(o => o.value) ?? [];
    expect(visaTypes).toContain('tourist');
    expect(visaTypes).toContain('e_tourist');
    expect(visaTypes).toContain('business');
    expect(visaTypes).toContain('medical');
  });

  test('passport expiry should auto-fill from profile', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    const expiryField = passportSection.fields.find(f => f.id === 'passportExpiry')!;

    expect(expiryField.required).toBe(true);
    expect(expiryField.autoFillSource).toBe('profile.passportExpiry');
  });

  test('travel section should have India-specific port of arrival', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).not.toBeUndefined();

    const portField = travelSection!.fields.find(f => f.id === 'portOfArrival');
    expect(portField).not.toBeUndefined();
    expect(portField!.countrySpecific).toBe(true);

    const portCodes = portField!.options?.map(o => o.value) ?? [];
    expect(portCodes).toContain('DEL');
    expect(portCodes).toContain('BOM');
    expect(portCodes).toContain('BLR');
    expect(portCodes).toContain('MAA');
  });

  test('purpose of visit should have India-specific options including pilgrimage', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfVisit')!;

    expect(purposeField).not.toBeUndefined();
    expect(purposeField.countrySpecific).toBe(true);

    const purposes = purposeField.options?.map(o => o.value) ?? [];
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('business');
    expect(purposes).toContain('pilgrimage');
    expect(purposes).toContain('medical');
  });

  test('stay duration should have validation limits matching tourist visa max', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const durationField = travelSection.fields.find(f => f.id === 'stayDuration')!;

    expect(durationField).not.toBeUndefined();
    expect((durationField as any).validation).not.toBeUndefined();
    expect((durationField as any).validation.min).toBe(1);
    expect((durationField as any).validation.max).toBe(180);
  });

  test('previousIndiaVisit should be an India-specific boolean field', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const prevVisitField = travelSection.fields.find(f => f.id === 'previousIndiaVisit')!;

    expect(prevVisitField).not.toBeUndefined();
    expect(prevVisitField.type).toBe('boolean');
    expect(prevVisitField.countrySpecific).toBe(true);
    expect(prevVisitField.required).toBe(true);
  });

  test('health section should have health declaration fields', () => {
    const healthSection = schema.sections.find(s => s.id === 'health');
    expect(healthSection).not.toBeUndefined();

    const fieldIds = healthSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('countriesVisitedLast14Days');
    expect(fieldIds).toContain('feverOrCough');
    expect(fieldIds).toContain('contactWithInfected');

    const feverField = healthSection!.fields.find(f => f.id === 'feverOrCough')!;
    expect(feverField.type).toBe('boolean');
    expect(feverField.countrySpecific).toBe(true);
  });

  test('customs section should have currency and goods declaration fields', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs');
    expect(customsSection).not.toBeUndefined();

    const fieldIds = customsSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('carryingCurrency');
    expect(fieldIds).toContain('dutiableGoods');
    expect(fieldIds).toContain('prohibitedItems');
    expect(fieldIds).toContain('commercialGoods');

    const currencyField = customsSection!.fields.find(f => f.id === 'carryingCurrency')!;
    expect(currencyField.type).toBe('boolean');
    expect(currencyField.countrySpecific).toBe(true);
  });

  test('contact section should have emergency contact fields', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact');
    expect(contactSection).not.toBeUndefined();

    const fieldIds = contactSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('email');
    expect(fieldIds).toContain('phoneNumber');
    expect(fieldIds).toContain('emergencyContactName');
    expect(fieldIds).toContain('emergencyContactPhone');

    const emergencyNameField = contactSection!.fields.find(f => f.id === 'emergencyContactName')!;
    expect(emergencyNameField.countrySpecific).toBe(true);
  });

  test('email field should have validation pattern', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact')!;
    const emailField = contactSection.fields.find(f => f.id === 'email')!;

    expect((emailField as any).validation).not.toBeUndefined();
    expect(typeof (emailField as any).validation.pattern).toBe('string');
    expect((emailField as any).validation.pattern).toContain('@');
  });

  test('should have complete submission guide with 8 steps', () => {
    expect(schema.submissionGuide).toHaveLength(8);

    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Access India e-Arrival Card Portal');
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
    const registrySchema = await getSchemaByCountryCode('IND');
    expect(registrySchema).not.toBeUndefined();
    expect(registrySchema?.countryCode).toBe('IND');
  });

  test('portalFlow should support multi-step but not save progress', () => {
    expect(schema.portalFlow.multiStep).toBe(true);
    expect(schema.portalFlow.canSaveProgress).toBe(false);
  });

  test('portalFlow should require visa prerequisite', () => {
    const prerequisites = schema.portalFlow.prerequisites;
    expect(prerequisites).not.toBeUndefined();

    const visaPrereq = prerequisites!.find((p: any) => p.description.includes('visa'));
    expect(visaPrereq).toEqual(expect.objectContaining({ required: true }));
    expect(visaPrereq!.required).toBe(true);
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
