import { CountryFormSchema } from '../../src/types/schema';
import PHL from '../../src/schemas/PHL.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('Philippines (PHL) Schema', () => {
  const schema = PHL as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'PHL');

  // ── Country metadata ──────────────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('PHL');
    expect(schema.countryName).toBe('Philippines');
    expect(schema.portalName).toBe('Philippines eTravel');
    expect(schema.portalUrl).toBe('https://etravel.gov.ph');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.earliestBeforeArrival).toBe('3d');
    expect(schema.submission.recommended).toBe('24h');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
  });

  test('implementation status should be complete', () => {
    expect(schema.metadata.implementationStatus).toBe('complete');
  });

  // ── Portal flow ───────────────────────────────────────────────────────────

  test('portalFlow should require account registration', () => {
    expect(schema.portalFlow.requiresAccount).toBe(true);
  });

  test('portalFlow should support group registration for families', () => {
    expect(schema.portalFlow.familyPolicy!.type).toBe('group');
  });

  test('portalFlow should allow saving progress', () => {
    expect(schema.portalFlow.canSaveProgress).toBe(true);
  });

  // ── Sections ──────────────────────────────────────────────────────────────

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
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const occupationField = personalSection.fields.find(f => f.id === 'occupation')!;
    expect(occupationField.countrySpecific).toBe(true);
    expect(occupationField.type).toBe('searchable_select');
  });

  test('occupation field should include OFW option', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const occupationField = personalSection.fields.find(f => f.id === 'occupation')!;
    const values = occupationField.options?.map(o => o.value) ?? [];
    expect(values).toContain('ofw');
    expect(values).toContain('employee');
    expect(values).toContain('student');
  });

  test('travel section should have Philippines-specific port of arrival', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const portField = travelSection.fields.find(f => f.id === 'portOfArrival')!;
    expect(portField.countrySpecific).toBe(true);
    const portCodes = portField.options?.map(o => o.value) ?? [];
    expect(portCodes).toContain('MNL');
    expect(portCodes).toContain('CEB');
    expect(portCodes).toContain('CRK');
    expect(portCodes).toContain('KLO');
  });

  test('purpose of travel should include Balikbayan option', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfTravel')!;
    expect(purposeField.countrySpecific).toBe(true);
    const purposes = purposeField.options?.map(o => o.value) ?? [];
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('business');
    expect(purposes).toContain('balikbayan');
  });

  test('stay duration should have validation limits', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const durationField = travelSection.fields.find(f => f.id === 'stayDuration')!;
    expect((durationField as any).validation.min).toBe(1);
    expect((durationField as any).validation.max).toBe(30);
  });

  test('health section should have symptom and contact fields', () => {
    const healthSection = schema.sections.find(s => s.id === 'health')!;
    const fieldIds = healthSection.fields.map(f => f.id);
    expect(fieldIds).toContain('countriesVisitedLast30Days');
    expect(fieldIds).toContain('havingSymptoms');
    expect(fieldIds).toContain('contactWithSick');
  });

  test('contact section should have email with validation', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact')!;
    const emailField = contactSection.fields.find(f => f.id === 'email')!;
    expect((emailField as any).validation.pattern).toContain('@');
  });

  // ── Submission guide (country-specific count) ─────────────────────────────

  test('should have complete submission guide with 7 steps', () => {
    expect(schema.submissionGuide).toHaveLength(7);
    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Create eTravel Account');
    expect(stepTitles).toContain('Review and Submit');
  });
});
