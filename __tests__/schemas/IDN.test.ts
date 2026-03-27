import { CountryFormSchema } from '../../src/types/schema';
import { getSchemaByCountryCode } from '../../src/schemas';
import IDN from '../../src/schemas/IDN.json';

describe('Indonesia (IDN) Schema', () => {
  const schema = IDN as CountryFormSchema;

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('IDN');
    expect(schema.countryName).toBe('Indonesia');
    expect(schema.portalName).toBe('Indonesia Electronic Customs Declaration (e-CD)');
    expect(schema.portalUrl).toBe('https://ecd.beacukai.go.id');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).not.toBeUndefined();
    expect(schema.submission.earliestBeforeArrival).toBe('7d');
    expect(schema.submission.recommended).toBe('24h');
  });

  test('latestBeforeArrival should be 0h — can be submitted upon arrival', () => {
    expect(schema.submission.latestBeforeArrival).toBe('0h');
  });

  test('portalFlow should not require account registration', () => {
    expect(schema.portalFlow).not.toBeUndefined();
    expect(schema.portalFlow.requiresAccount).toBe(false);
  });

  test('portalFlow should support family declarations', () => {
    expect(schema.portalFlow.familyPolicy).not.toBeUndefined();
    expect(schema.portalFlow.familyPolicy!.type).toBe('family');
  });

  test('implementation status should be complete', () => {
    expect(schema.metadata).not.toBeUndefined();
    expect(schema.metadata.implementationStatus).toBe('complete');
  });

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(6);

    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('flight');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('customs');
    expect(sectionIds).toContain('contact');
  });

  test('personal section should include Indonesia-specific occupation field', () => {
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
    expect(occupationField!.type).toBe('searchable_select');
  });

  test('occupation field should have autoFillMapping', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const occupationField = personalSection.fields.find(f => f.id === 'occupation')!;

    expect((occupationField as any).autoFillMapping).not.toBeUndefined();
    expect((occupationField as any).autoFillMapping._default).toBe('other');
    expect((occupationField as any).autoFillMapping.Student).toBe('student');
  });

  test('passport section should have required passport fields', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport');
    expect(passportSection).not.toBeUndefined();

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

  test('flight section should have Indonesia-specific port of arrival', () => {
    const flightSection = schema.sections.find(s => s.id === 'flight');
    expect(flightSection).not.toBeUndefined();

    const portField = flightSection!.fields.find(f => f.id === 'portOfArrival');
    expect(portField).not.toBeUndefined();
    expect(portField!.countrySpecific).toBe(true);

    const portCodes = portField!.options?.map(o => o.value) ?? [];
    expect(portCodes).toContain('CGK');
    expect(portCodes).toContain('DPS');
    expect(portCodes).toContain('SUB');
  });

  test('accommodation section should have Indonesia city selector', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation');
    expect(accommodationSection).not.toBeUndefined();

    const cityField = accommodationSection!.fields.find(f => f.id === 'cityOfStay');
    expect(cityField).not.toBeUndefined();
    expect(cityField!.countrySpecific).toBe(true);

    const cities = cityField!.options?.map(o => o.value) ?? [];
    expect(cities).toContain('jakarta');
    expect(cities).toContain('bali');
    expect(cities).toContain('yogyakarta');
  });

  test('stay duration should have validation limits matching visa on arrival max', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const durationField = accommodationSection.fields.find(f => f.id === 'stayDuration')!;

    expect(durationField).not.toBeUndefined();
    expect((durationField as any).validation).not.toBeUndefined();
    expect((durationField as any).validation.min).toBe(1);
    expect((durationField as any).validation.max).toBe(30);
  });

  test('customs section should have currency and goods declaration fields', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs');
    expect(customsSection).not.toBeUndefined();

    const fieldIds = customsSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('carryingCurrency');
    expect(fieldIds).toContain('carryingGoods');
    expect(fieldIds).toContain('carryingAnimalsPlants');
    expect(fieldIds).toContain('carryingNarcotics');
    expect(fieldIds).toContain('carryingCommercialGoods');

    const narcoField = customsSection!.fields.find(f => f.id === 'carryingNarcotics')!;
    expect(narcoField.type).toBe('boolean');
    expect(narcoField.countrySpecific).toBe(true);
  });

  test('customs should have alcohol and tobacco quantity fields', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs')!;

    const alcoholField = customsSection.fields.find(f => f.id === 'alcoholQuantity');
    expect(alcoholField).not.toBeUndefined();
    expect(alcoholField!.type).toBe('number');

    const tobaccoField = customsSection.fields.find(f => f.id === 'tobaccoQuantity');
    expect(tobaccoField).not.toBeUndefined();
    expect(tobaccoField!.type).toBe('number');
  });

  test('contact section should have email with validation', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact');
    expect(contactSection).not.toBeUndefined();

    const emailField = contactSection!.fields.find(f => f.id === 'email')!;
    expect((emailField as any).validation).not.toBeUndefined();
    expect((emailField as any).validation.pattern).toContain('@');
  });

  test('should have complete submission guide with 8 steps', () => {
    expect(schema.submissionGuide).toHaveLength(8);

    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Access Indonesia e-CD Portal');
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
    const registrySchema = await getSchemaByCountryCode('IDN');
    expect(registrySchema).not.toBeUndefined();
    expect(registrySchema?.countryCode).toBe('IDN');
  });

  test('portalFlow should support multi-step but not save progress', () => {
    expect(schema.portalFlow.multiStep).toBe(true);
    expect(schema.portalFlow.canSaveProgress).toBe(false);
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
