import { CountryFormSchema } from '../../src/types/schema';
import USA from '../../src/schemas/USA.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('United States (USA) Schema', () => {
  const schema = USA as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'USA');

  // ── Country metadata ──────────────────────────────────────────────────────

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
    expect(schema.metadata.priority).toBe(5);
    expect(schema.metadata.popularity).toBe(95);
    expect(schema.metadata.maintenanceFrequency).toBe('monthly');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.earliestBeforeArrival).toBe('730d');
    expect(schema.submission.latestBeforeArrival).toBe('72h');
    expect(schema.submission.recommended).toBe('14d');
    expect(schema.submission.processingTime).toBe('72h');
  });

  test('changeDetection fallbackAction trigger should be cbp_system_update', () => {
    const triggers = schema.changeDetection.fallbackActions.map(a => a.trigger);
    expect(triggers).toContain('cbp_system_update');
  });

  // ── Sections ──────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('applicant');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('eligibility');
  });

  test('applicant section should have required CBP One declaration fields', () => {
    const applicantSection = schema.sections.find(s => s.id === 'applicant')!;
    const fieldIds = applicantSection.fields.map(f => f.id);
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

  test('passport section should have required passportNumber field', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    const fieldIds = passportSection.fields.map(f => f.id);
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportCountry');
    expect(fieldIds).toContain('passportIssueDate');
    expect(fieldIds).toContain('passportExpirationDate');
  });

  test('eligibility section should have required declaration answer fields', () => {
    const eligibilitySection = schema.sections.find(s => s.id === 'eligibility')!;
    const fieldIds = eligibilitySection.fields.map(f => f.id);
    expect(fieldIds).toContain('drugConviction');
    expect(fieldIds).toContain('terrorism');
    expect(fieldIds).toContain('visaRefusal');

    eligibilitySection.fields.forEach(field => {
      expect(field.type).toBe('boolean');
      expect(field.required).toBe(true);
      expect(field.countrySpecific).toBe(true);
    });
  });

  test('portalFlow should require an account', () => {
    expect(schema.portalFlow.requiresAccount).toBe(true);
  });

  test('portalFlow familyPolicy should be companion type', () => {
    expect(schema.portalFlow.familyPolicy!.type).toBe('companion');
  });

  // ── Submission guide (country-specific) ───────────────────────────────────

  test('should have a complete submission guide', () => {
    expect(schema.submissionGuide.length).toBeGreaterThan(0);
    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles.some(t => t.includes('CBP One'))).toBe(true);
  });
});
