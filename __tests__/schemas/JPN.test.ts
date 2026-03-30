import JPN from '../../src/schemas/JPN.json';
import { CountryFormSchema } from '../../src/types/schema';
import { OCCUPATIONS, PURPOSES_OF_VISIT } from '../../src/constants/enums';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('Japan (JPN) Schema', () => {
  const schema = JPN as unknown as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'JPN');

  // ── Country metadata ──────────────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('JPN');
    expect(schema.countryName).toBe('Japan');
    expect(schema.portalName).toBe('Visit Japan Web');
    expect(schema.portalUrl).toBe('https://vjw-lp.digital.go.jp/en/registration/');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.earliestBeforeArrival).toBe('14d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('72h');
  });

  test('should have submission deadline metadata', () => {
    expect(schema.submissionDeadlineHours).toBe(24);
    expect(schema.recommendedLeadTimeHours).toBe(72);
    expect(schema.submissionWindowNote).toBe('Submit 24-72 h before arrival');
  });

  // ── Sections ──────────────────────────────────────────────────────────────

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
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    const fieldIds = passportSection.fields.map(f => f.id);
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

  test('travel section should have Japan-specific fields', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfVisit') as any;
    expect(purposeField.countrySpecific).toBe(true);
    expect(purposeField.options).toHaveLength(5);
    expect(purposeField.options.map((o: any) => o.value)).toContain('tourism');
    expect(purposeField.options.map((o: any) => o.value)).toContain('business');
  });

  test('customs declarations should have Japan-specific currency threshold', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs_declarations')!;
    const currencyField = customsSection.fields.find(f => f.id === 'currencyOver1M')!;
    expect(currencyField.countrySpecific).toBe(true);
    expect(currencyField.label).toContain('¥1,000,000');
    expect((currencyField as any).helpText).toContain('Japan-specific threshold');
  });

  test('should have meat products prohibition field', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs_declarations')!;
    const meatField = customsSection.fields.find(f => f.id === 'meatProducts')!;
    expect(meatField.countrySpecific).toBe(true);
    expect((meatField as any).helpText).toContain('strictly prohibits all meat products');
  });

  // ── Auto-fill mappings ────────────────────────────────────────────────────

  test('should have auto-fill mappings for common fields', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    expect(passportSection.fields.find(f => f.id === 'surname')!.autoFillSource).toBe('profile.surname');
    expect(passportSection.fields.find(f => f.id === 'passportNumber')!.autoFillSource).toBe('profile.passportNumber');
    expect(passportSection.fields.find(f => f.id === 'passportExpiry')!.autoFillSource).toBe('profile.passportExpiry');
  });

  test('required fields should be marked correctly', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    passportSection.fields.forEach(field => {
      expect(field.required).toBe(true);
    });

    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    expect(accommodationSection.fields.find(f => f.id === 'hotelPhone')!.required).toBe(false);

    const basicInfoSection = schema.sections.find(s => s.id === 'basic_info')!;
    expect(basicInfoSection.fields.find(f => f.id === 'occupation')!.required).toBe(false);
    expect(basicInfoSection.fields.find(f => f.id === 'gender')!.required).toBe(true);
  });

  test('occupation autoFillMapping covers all canonical enum values', () => {
    const basicInfoSection = schema.sections.find(s => s.id === 'basic_info')!;
    const occupationField = basicInfoSection.fields.find(f => f.id === 'occupation') as any;
    expect(occupationField.autoFillMapping._default).toBe('other');

    for (const occ of OCCUPATIONS) {
      const mapped = occupationField.autoFillMapping[occ.value] ?? occupationField.autoFillMapping._default;
      expect(mapped).toEqual(expect.any(String));
      const portalValues = occupationField.options.map((o: any) => o.value);
      expect(portalValues).toContain(mapped);
    }
  });

  test('purposeOfVisit has autoFillSource and autoFillMapping', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfVisit') as any;
    expect(purposeField.autoFillSource).toBe('profile.purposeOfVisit');
    expect(purposeField.autoFillMapping._default).toBe('other');

    for (const purpose of PURPOSES_OF_VISIT) {
      const mapped = purposeField.autoFillMapping[purpose.value] ?? purposeField.autoFillMapping._default;
      expect(mapped).toEqual(expect.any(String));
      const portalValues = purposeField.options.map((o: any) => o.value);
      expect(portalValues).toContain(mapped);
    }
  });

  test('passport fields should have help text matching VJW portal', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    expect((passportSection.fields.find(f => f.id === 'passportNumber') as any).helpText).toContain('AB1234567');
    expect((passportSection.fields.find(f => f.id === 'surname') as any).helpText).toContain('DIGITAL');
    expect((passportSection.fields.find(f => f.id === 'givenNames') as any).helpText).toContain('HANAKO');
  });

  // ── Submission guide (country-specific count) ─────────────────────────────

  test('should have complete submission guide', () => {
    expect(schema.submissionGuide).toHaveLength(7);
    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Create Account on Visit Japan Web');
    expect(stepTitles).toContain('Register Your Passport Details');
    expect(stepTitles).toContain('Enter Basic Information');
    expect(stepTitles).toContain('Get Your QR Code');
  });
});
