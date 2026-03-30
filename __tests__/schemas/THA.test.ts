import { CountryFormSchema } from '../../src/types/schema';
import THA from '../../src/schemas/THA.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('Thailand (THA) Schema', () => {
  const schema = THA as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'THA');

  // ── Country metadata ──────────────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('THA');
    expect(schema.countryName).toBe('Thailand');
    expect(schema.portalName).toBe('Thailand Digital Arrival Card (Coming Soon)');
    expect(schema.portalUrl).toBe('https://tp.consular.go.th/');
    expect(schema.schemaVersion).toBe('2.1.0');
  });

  test('should have implementationStatus set to coming_soon', () => {
    expect(schema.metadata.implementationStatus).toBe('coming_soon');
  });

  test('should have metadata with expected fields', () => {
    const metadata = schema.metadata;
    expect(metadata.priority).toBe(4);
    expect(metadata.complexity).toBe('medium');
    expect(metadata.popularity).toBe(90);
    expect(metadata.supportedLanguages).toContain('en');
    expect(metadata.supportedLanguages).toContain('th');
    expect(metadata.maintenanceFrequency).toBe('as_needed');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.earliestBeforeArrival).toBe('7d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('72h');
    expect(schema.submission.processingTime).toBe('24h');
  });

  // ── Portal flow ───────────────────────────────────────────────────────────

  test('portalFlow should have requiresAccount set to false', () => {
    expect(schema.portalFlow.requiresAccount).toBe(false);
  });

  test('portalFlow should have family policy with no account requirement', () => {
    expect(schema.portalFlow.familyPolicy!.type).toBe('none');
    expect(schema.portalFlow.familyPolicy!.description).toContain('No account required');
  });

  test('portalFlow should have prerequisites for passport and accommodation', () => {
    expect(schema.portalFlow.prerequisites!.length).toBeGreaterThanOrEqual(2);
    const prereqDescriptions = schema.portalFlow.prerequisites!.map(p => p.description);
    expect(prereqDescriptions.some(d => d.toLowerCase().includes('passport'))).toBe(true);
    expect(prereqDescriptions.some(d => d.toLowerCase().includes('accommodation'))).toBe(true);
  });

  // ── Sections ──────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(4);
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('health');
  });

  test('personal section should have core passport fields', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const fieldIds = personalSection.fields.map(f => f.id);
    expect(fieldIds).toContain('firstName');
    expect(fieldIds).toContain('lastName');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportExpiry');
  });

  test('personal section should have title field with options', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const titleField = personalSection.fields.find(f => f.id === 'title')!;
    expect(titleField.type).toBe('searchable_select');
    const titleValues = titleField.options!.map(o => o.value);
    expect(titleValues).toContain('Mr');
    expect(titleValues).toContain('Mrs');
    expect(titleValues).toContain('Ms');
    expect(titleValues).toContain('Dr');
  });

  test('travel section should have Thailand-specific purpose of visit', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfVisit')!;
    expect(purposeField.countrySpecific).toBe(true);
    const purposes = purposeField.options!.map(o => o.value);
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('business');
    expect(purposes).toContain('transit');
    expect(purposes).toContain('medical');
    expect(purposes).toContain('education');
    expect(purposes).toContain('other');
  });

  test('travel section should have length of stay with validation limits', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const lengthField = travelSection.fields.find(f => f.id === 'lengthOfStay')!;
    expect(lengthField.validation!.min).toBe(1);
    expect(lengthField.validation!.max).toBe(60);
  });

  test('accommodation section should have type selection with Thailand-specific options', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const typeField = accommodationSection.fields.find(f => f.id === 'accommodationType')!;
    expect(typeField.countrySpecific).toBe(true);
    const types = typeField.options!.map(o => o.value);
    expect(types).toContain('hotel');
    expect(types).toContain('resort');
    expect(types).toContain('hostel');
    expect(types).toContain('guesthouse');
    expect(types).toContain('friend_family');
  });

  test('health section should have Thailand-specific fields', () => {
    const healthSection = schema.sections.find(s => s.id === 'health')!;
    const fieldIds = healthSection.fields.map(f => f.id);
    expect(fieldIds).toContain('vaccinationStatus');
    expect(fieldIds).toContain('hasInsurance');
    expect(fieldIds).toContain('emergencyContact');
  });

  test('vaccination status should be country-specific with options', () => {
    const healthSection = schema.sections.find(s => s.id === 'health')!;
    const vaccinationField = healthSection.fields.find(f => f.id === 'vaccinationStatus')!;
    expect(vaccinationField.countrySpecific).toBe(true);
    expect(vaccinationField.type).toBe('searchable_select');
    const options = vaccinationField.options!.map(o => o.value);
    expect(options).toContain('fully_vaccinated');
    expect(options).toContain('not_vaccinated');
    expect(options).toContain('partially_vaccinated');
  });

  // ── Submission guide (country-specific) ───────────────────────────────────

  test('should have complete submission guide with 8 steps', () => {
    expect(schema.submissionGuide).toHaveLength(8);
    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Create Thailand Pass Account');
    expect(stepTitles).toContain('Submit and Get QR Code');
  });
});
