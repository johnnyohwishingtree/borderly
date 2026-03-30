import { CountryFormSchema } from '../../src/types/schema';
import CAN from '../../src/schemas/CAN.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('Canada (CAN) Schema', () => {
  const schema = CAN as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'CAN');

  // ── Country metadata ──────────────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('CAN');
    expect(schema.countryName).toBe('Canada');
    expect(schema.portalName).toBe('Electronic Travel Authorization (eTA) — Archived');
    expect(schema.portalUrl).toBe(
      'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html',
    );
    expect(schema.schemaVersion).toBe('2.1.0');
  });

  test('should have lastUpdated in ISO format', () => {
    expect(typeof schema.lastUpdated).toBe('string');
    expect(() => new Date(schema.lastUpdated)).not.toThrow();
  });

  // ── Archive handling ──────────────────────────────────────────────────────

  test('should be archived with a reason mentioning ArriveCAN or discontinued', () => {
    expect(schema.metadata.implementationStatus).toBe('archived');
    const archiveReason = schema.metadata.archiveReason;
    expect(typeof archiveReason).toBe('string');
    expect(archiveReason!.trim().length).toBeGreaterThan(0);
    const reason = archiveReason!.toLowerCase();
    expect(reason.includes('arrivecan') || reason.includes('discontinued')).toBe(true);
  });

  // ── Metadata ──────────────────────────────────────────────────────────────

  test('should have metadata with expected fields', () => {
    const metadata = schema.metadata;
    expect(metadata.priority).toBe(8);
    expect(metadata.complexity).toBe('medium');
    expect(metadata.popularity).toBe(75);
    expect(metadata.supportedLanguages).toContain('en');
    expect(metadata.supportedLanguages).toContain('fr');
    expect(metadata.maintenanceFrequency).toBe('as_needed');
  });

  // ── Submission timing ─────────────────────────────────────────────────────

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.earliestBeforeArrival).toBe('730d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('72h');
    expect(schema.submission.processingTime).toBe('24h');
  });

  test('submission timing values should match duration string format', () => {
    const durationPattern = /^\d+[dhm]$/;
    expect(schema.submission.earliestBeforeArrival).toMatch(durationPattern);
    expect(schema.submission.latestBeforeArrival).toMatch(durationPattern);
    expect(schema.submission.recommended).toMatch(durationPattern);
    expect(schema.submission.processingTime).toMatch(durationPattern);
  });

  test('monitoredSelectors should be CSS selector strings', () => {
    schema.changeDetection.monitoredSelectors.forEach((selector: string) => {
      expect(typeof selector).toBe('string');
      expect(selector.trim().length).toBeGreaterThan(0);
    });
  });

  // ── Portal flow ───────────────────────────────────────────────────────────

  test('portalFlow should not require an account', () => {
    expect(schema.portalFlow.requiresAccount).toBe(false);
  });

  test('portalFlow should support multi-step but not save progress', () => {
    expect(schema.portalFlow.multiStep).toBe(true);
    expect(schema.portalFlow.canSaveProgress).toBe(false);
  });

  test('portalFlow prerequisites should include passport and payment', () => {
    const prerequisites = schema.portalFlow.prerequisites!;
    expect(prerequisites.length).toBeGreaterThanOrEqual(2);
    const types = prerequisites.map(p => p.type);
    expect(types).toContain('document');
    expect(types).toContain('payment');
    expect(prerequisites.find(p => p.type === 'payment')!.required).toBe(true);
  });

  // ── Sections ──────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('nationality');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('contact');
    expect(sectionIds).toContain('address');
    expect(sectionIds).toContain('employment');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('background');
  });

  test('personal section should have core required fields with autoFillSource', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    expect(personalSection.fields.find(f => f.id === 'surname')!.autoFillSource).toBe('profile.surname');
    expect(personalSection.fields.find(f => f.id === 'givenNames')!.autoFillSource).toBe('profile.givenNames');
    expect(personalSection.fields.find(f => f.id === 'dateOfBirth')!.autoFillSource).toBe('profile.dateOfBirth');
  });

  test('employerName should be optional with autoFillSource', () => {
    const employmentSection = schema.sections.find(s => s.id === 'employment')!;
    const employerNameField = employmentSection.fields.find(f => f.id === 'employerName')!;
    expect(employerNameField.required).toBe(false);
    expect(employerNameField.autoFillSource).toBe('profile.employerName');
  });

  test('email field should have a validation pattern', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact')!;
    const emailField = contactSection.fields.find(f => f.id === 'email')!;
    expect(emailField.required).toBe(true);
    expect((emailField as any).validation!.pattern).toContain('@');
  });

  test('gender field should have three options including non-binary option', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const genderField = personalSection.fields.find(f => f.id === 'gender')!;
    expect(genderField.type).toBe('searchable_select');
    const genderValues = genderField.options!.map(o => o.value);
    expect(genderValues).toContain('M');
    expect(genderValues).toContain('F');
    expect(genderValues).toContain('X');
  });

  test('maritalStatus field should be country-specific with multiple options', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const maritalStatusField = personalSection.fields.find(f => f.id === 'maritalStatus')!;
    expect(maritalStatusField.countrySpecific).toBe(true);
    expect(maritalStatusField.required).toBe(true);
    const statusValues = maritalStatusField.options!.map(o => o.value);
    expect(statusValues).toContain('single');
    expect(statusValues).toContain('married');
    expect(statusValues).toContain('divorced');
    expect(statusValues).toContain('widowed');
  });

  test('travel section should have Canada-specific purposeOfVisit field', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfVisit')!;
    expect(purposeField.countrySpecific).toBe(true);
    expect(purposeField.required).toBe(true);
    const purposes = purposeField.options!.map(o => o.value);
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('business');
    expect(purposes).toContain('transit');
  });

  test('background section should have Canada-specific security questions', () => {
    const backgroundSection = schema.sections.find(s => s.id === 'background')!;
    const fieldIds = backgroundSection.fields.map(f => f.id);
    expect(fieldIds).toContain('criminalOffence');
    expect(fieldIds).toContain('immigrationOffence');
    expect(fieldIds).toContain('warCrimes');

    backgroundSection.fields.forEach(field => {
      expect(field.countrySpecific).toBe(true);
      expect(field.type).toBe('boolean');
      expect(field.required).toBe(true);
    });
  });

  // ── Submission guide (country-specific count) ─────────────────────────────

  test('should have complete submission guide with 14 steps', () => {
    expect(schema.submissionGuide).toHaveLength(14);
  });
});
