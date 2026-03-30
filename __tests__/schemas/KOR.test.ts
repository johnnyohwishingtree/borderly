import { CountryFormSchema } from '../../src/types/schema';
import KOR from '../../src/schemas/KOR.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('South Korea (KOR) Schema', () => {
  const schema = KOR as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'KOR');

  // ── Country metadata ──────────────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('KOR');
    expect(schema.countryName).toBe('South Korea');
    expect(schema.portalName).toBe('Korea K-ETA');
    expect(schema.portalUrl).toBe('https://www.k-eta.go.kr/portal/apply/index.do');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have lastUpdated in ISO format', () => {
    expect(typeof schema.lastUpdated).toBe('string');
    expect(() => new Date(schema.lastUpdated)).not.toThrow();
  });

  test('should have implementationStatus set to complete', () => {
    expect(schema.metadata.implementationStatus).toBe('complete');
  });

  test('should have metadata with expected fields', () => {
    const metadata = schema.metadata;
    expect(typeof metadata.priority).toBe('number');
    expect(metadata.complexity).toBe('medium');
    expect(metadata.popularity).toBeGreaterThan(0);
    expect(metadata.supportedLanguages).toContain('en');
    expect(metadata.supportedLanguages).toContain('ko');
    expect(metadata.maintenanceFrequency).toBe('monthly');
  });

  // ── Submission timing ─────────────────────────────────────────────────────

  test('submissionDeadlineHours should be 72', () => {
    expect(schema.submissionDeadlineHours).toBe(72);
  });

  test('recommendedLeadTimeHours should be 168', () => {
    expect(schema.recommendedLeadTimeHours).toBe(168);
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.latestBeforeArrival).toBe('72h');
  });

  // ── Passport validity ─────────────────────────────────────────────────────

  test('passportValidityMonths should be 6', () => {
    expect(schema.passportValidityMonths).toBe(6);
  });

  // ── Portal flow ───────────────────────────────────────────────────────────

  test('portalFlow should have requiresAccount set to true', () => {
    expect(schema.portalFlow.requiresAccount).toBe(true);
  });

  test('portalFlow should have signupUrl', () => {
    expect(schema.portalFlow.signupUrl).toContain('k-eta');
  });

  test('portalFlow should have family policy', () => {
    expect(schema.portalFlow.familyPolicy!.type).toBe('individual');
  });

  test('portalFlow should have prerequisites including passport and account', () => {
    expect(schema.portalFlow.prerequisites!.length).toBeGreaterThanOrEqual(2);
    const prereqDescriptions = schema.portalFlow.prerequisites!.map(p => p.description.toLowerCase());
    expect(prereqDescriptions.some(d => d.includes('passport'))).toBe(true);
    expect(prereqDescriptions.some(d => d.includes('account') || d.includes('email'))).toBe(true);
  });

  // ── Sections ──────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    expect(schema.sections.length).toBeGreaterThanOrEqual(5);
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('personal_info');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('health_declaration');
    expect(sectionIds).toContain('customs_declaration');
  });

  // ── Passport section ──────────────────────────────────────────────────────

  test('passport section should have core fields with autoFillSource', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    const fieldIds = passportSection.fields.map(f => f.id);
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('gender');
    expect(fieldIds).toContain('passportExpiry');
  });

  test('passport fields should have autoFillSource mapped to profile paths', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    expect(passportSection.fields.find(f => f.id === 'passportNumber')!.autoFillSource).toBe('profile.passportNumber');
    expect(passportSection.fields.find(f => f.id === 'surname')!.autoFillSource).toBe('profile.surname');
    expect(passportSection.fields.find(f => f.id === 'givenNames')!.autoFillSource).toBe('profile.givenNames');
    expect(passportSection.fields.find(f => f.id === 'dateOfBirth')!.autoFillSource).toBe('profile.dateOfBirth');
    expect(passportSection.fields.find(f => f.id === 'passportExpiry')!.autoFillSource).toBe('profile.passportExpiry');
  });

  // ── Personal info section ─────────────────────────────────────────────────

  test('personal_info section should have contact and occupation fields', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal_info')!;
    const fieldIds = personalSection.fields.map(f => f.id);
    expect(fieldIds).toContain('email');
    expect(fieldIds).toContain('phoneNumber');
    expect(fieldIds).toContain('occupation');
    expect(fieldIds).toContain('homeCountry');
  });

  test('occupation field should be a country-specific select', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal_info')!;
    const occupationField = personalSection.fields.find(f => f.id === 'occupation')!;
    expect(occupationField.type).toBe('searchable_select');
    expect(occupationField.countrySpecific).toBe(true);
    expect(occupationField.required).toBe(true);
    expect(occupationField.options!.length).toBeGreaterThan(0);
  });

  // ── K-ETA processing time ─────────────────────────────────────────────────

  test('K-ETA processing time should be documented as up to 72 hours', () => {
    expect(schema.submissionDeadlineHours).toBe(72);
    expect(schema.submissionWindowNote.toLowerCase()).toContain('processing');
    expect(schema.submissionWindowNote.toLowerCase()).toContain('72');
  });

  // ── Submission guide (country-specific count) ─────────────────────────────

  test('should have a complete submission guide with 8 steps', () => {
    expect(schema.submissionGuide).toHaveLength(8);
  });
});
