import { CountryFormSchema } from '../../src/types/schema';
import GBR from '../../src/schemas/GBR.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('United Kingdom (GBR) Schema', () => {
  const schema = GBR as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'GBR');

  // ── Country metadata ──────────────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('GBR');
    expect(schema.countryName).toBe('United Kingdom');
    expect(schema.portalName).toBe('UK Electronic Travel Authorisation (ETA)');
    expect(schema.schemaVersion).toBe('2.0.0');
  });

  test('portalUrl should point to gov.uk', () => {
    expect(schema.portalUrl).toBe('https://www.gov.uk/apply-electronic-travel-authorisation');
  });

  test('should have implementationStatus set to planned', () => {
    expect(schema.metadata.implementationStatus).toBe('planned');
  });

  test('should have metadata with expected fields', () => {
    expect(schema.metadata.supportedLanguages).toContain('en');
    expect(schema.metadata.priority).toBe(6);
    expect(schema.metadata.complexity).toBe('medium');
    expect(schema.metadata.popularity).toBe(85);
    expect(schema.metadata.maintenanceFrequency).toBe('quarterly');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.earliestBeforeArrival).toBe('30d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('72h');
    expect(schema.submission.processingTime).toBe('72h');
  });

  test('changeDetection fallbackActions should reference gov_uk_update trigger', () => {
    const triggers = schema.changeDetection.fallbackActions.map(a => a.trigger);
    expect(triggers).toContain('gov_uk_update');
  });

  // ── Sections ──────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('security');
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

  test('personal section name fields should auto-fill from profile', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    expect(personalSection.fields.find(f => f.id === 'givenNames')!.autoFillSource).toBe('profile.givenNames');
    expect(personalSection.fields.find(f => f.id === 'familyName')!.autoFillSource).toBe('profile.surname');
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
    const securitySection = schema.sections.find(s => s.id === 'security')!;
    const fieldIds = securitySection.fields.map(f => f.id);
    expect(fieldIds).toContain('criminalRecord');
    expect(fieldIds).toContain('immigrationBreach');
    expect(fieldIds).toContain('ukRefusal');
    expect(fieldIds).toContain('terrorismAssociation');

    securitySection.fields.forEach(field => {
      expect(field.type).toBe('boolean');
      expect(field.required).toBe(true);
      expect(field.countrySpecific).toBe(true);
    });
  });

  test('portalFlow should require an account', () => {
    expect(schema.portalFlow.requiresAccount).toBe(true);
  });

  // ── Submission guide (country-specific) ───────────────────────────────────

  test('should have a complete submission guide', () => {
    expect(schema.submissionGuide.length).toBeGreaterThan(0);
    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles.some(t => t.toLowerCase().includes('account'))).toBe(true);
  });
});
