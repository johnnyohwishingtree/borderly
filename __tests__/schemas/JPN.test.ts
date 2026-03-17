import { validateSchemaCompletely, loadSchema } from '../../src/services/schemas/schemaLoader';
import { getSchemaByCountryCode } from '../../src/schemas';
import JPN from '../../src/schemas/JPN.json';

describe('Japan (JPN) Schema', () => {
  const schema = JPN;

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('JPN');
    expect(schema.countryName).toBe('Japan');
    expect(schema.portalName).toBe('Visit Japan Web');
    expect(schema.portalUrl).toBe('https://vjw-lp.digital.go.jp/en/registration/');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).toBeDefined();
    expect(schema.submission.earliestBeforeArrival).toBe('14d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('72h');
  });

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(5);

    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('basic_info');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('customs_declarations');
  });

  test('passport section should have required fields matching VJW portal', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport');
    expect(passportSection).toBeDefined();

    const fieldIds = passportSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('passportExpiry');
  });

  test('nationality field should be a searchable select with countries source', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    const nationalityField = passportSection.fields.find(f => f.id === 'nationality')!;

    expect(nationalityField.type).toBe('searchable_select');
    expect((nationalityField as any).optionsSource).toBe('countries');
    expect(nationalityField.label).toBe('Nationality or citizenship');
  });

  test('basic info section should have occupation and home address fields', () => {
    const basicInfoSection = schema.sections.find(s => s.id === 'basic_info');
    expect(basicInfoSection).toBeDefined();

    const fieldIds = basicInfoSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('occupation');
    expect(fieldIds).toContain('homeCountry');
    expect(fieldIds).toContain('homeCity');
  });

  test('home country field should be a searchable select', () => {
    const basicInfoSection = schema.sections.find(s => s.id === 'basic_info')!;
    const homeCountryField = basicInfoSection.fields.find(f => f.id === 'homeCountry')!;

    expect(homeCountryField.type).toBe('searchable_select');
    expect((homeCountryField as any).optionsSource).toBe('countries');
  });

  test('travel section should have Japan-specific fields', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).toBeDefined();

    const purposeField = travelSection!.fields.find(f => f.id === 'purposeOfVisit') as any;
    expect(purposeField).toBeDefined();
    expect(purposeField.countrySpecific).toBe(true);
    expect(purposeField.options).toHaveLength(5);
    expect(purposeField.options.map((o: any) => o.value)).toContain('tourism');
    expect(purposeField.options.map((o: any) => o.value)).toContain('business');
  });

  test('customs declarations should have Japan-specific currency threshold', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs_declarations');
    expect(customsSection).toBeDefined();

    const currencyField = customsSection!.fields.find(f => f.id === 'currencyOver1M');
    expect(currencyField).toBeDefined();
    expect(currencyField!.countrySpecific).toBe(true);
    expect(currencyField!.label).toContain('¥1,000,000');
    expect((currencyField as any).helpText).toContain('Japan-specific threshold');
  });

  test('should have meat products prohibition field', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs_declarations');
    const meatField = customsSection!.fields.find(f => f.id === 'meatProducts');

    expect(meatField).toBeDefined();
    expect(meatField!.countrySpecific).toBe(true);
    expect((meatField as any).helpText).toContain('strictly prohibits all meat products');
  });

  test('should have complete submission guide', () => {
    expect(schema.submissionGuide).toHaveLength(7);

    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Create Account on Visit Japan Web');
    expect(stepTitles).toContain('Register Your Passport Details');
    expect(stepTitles).toContain('Enter Basic Information');
    expect(stepTitles).toContain('Get Your QR Code');
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

  test('should have auto-fill mappings for common fields', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;

    const surnameField = passportSection.fields.find(f => f.id === 'surname')!;
    expect(surnameField.autoFillSource).toBe('profile.surname');
    expect(surnameField.countrySpecific).toBe(false);

    const passportField = passportSection.fields.find(f => f.id === 'passportNumber')!;
    expect(passportField.autoFillSource).toBe('profile.passportNumber');
    expect(passportField.countrySpecific).toBe(false);

    const expiryField = passportSection.fields.find(f => f.id === 'passportExpiry')!;
    expect(expiryField.autoFillSource).toBe('profile.passportExpiry');
  });

  test('should validate against schema structure', () => {
    expect(() => {
      const validatedSchema = loadSchema(schema, 'JPN');
      validateSchemaCompletely(validatedSchema);
    }).not.toThrow();
  });

  test('should be accessible via schema registry', async () => {
    const registrySchema = await getSchemaByCountryCode('JPN');
    expect(registrySchema).toBeDefined();
    expect(registrySchema?.countryCode).toBe('JPN');
  });

  test('should have unique field IDs within each section', () => {
    const allFieldIds = new Set<string>();

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(allFieldIds.has(field.id)).toBe(false);
        allFieldIds.add(field.id);
      });
    });
  });

  test('required fields should be marked correctly', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    passportSection.fields.forEach(field => {
      expect(field.required).toBe(true);
    });

    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const phoneField = accommodationSection.fields.find(f => f.id === 'hotelPhone')!;
    expect(phoneField.required).toBe(false);

    const basicInfoSection = schema.sections.find(s => s.id === 'basic_info')!;
    const occupationField = basicInfoSection.fields.find(f => f.id === 'occupation')!;
    expect(occupationField.required).toBe(false);
    const homeCountryField = basicInfoSection.fields.find(f => f.id === 'homeCountry')!;
    expect(homeCountryField.required).toBe(false);
    const homeCityField = basicInfoSection.fields.find(f => f.id === 'homeCity')!;
    expect(homeCityField.required).toBe(false);
    const genderField = basicInfoSection.fields.find(f => f.id === 'gender')!;
    expect(genderField.required).toBe(true);
  });

  test('passport fields should have help text matching VJW portal', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;

    const passportField = passportSection.fields.find(f => f.id === 'passportNumber')!;
    expect((passportField as any).helpText).toContain('AB1234567');

    const surnameField = passportSection.fields.find(f => f.id === 'surname')!;
    expect((surnameField as any).helpText).toContain('DIGITAL');

    const givenNameField = passportSection.fields.find(f => f.id === 'givenNames')!;
    expect((givenNameField as any).helpText).toContain('HANAKO');
  });
});
