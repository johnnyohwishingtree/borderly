import { CountryFormSchema } from '../../src/types/schema';
import VNM from '../../src/schemas/VNM.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('Vietnam (VNM) Schema', () => {
  const schema = VNM as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'VNM');

  // ── Country metadata ──────────────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('VNM');
    expect(schema.countryName).toBe('Vietnam');
    expect(schema.portalName).toBe('Vietnam e-Visa Portal');
    expect(schema.portalUrl).toBe('https://evisa.xuatnhapcanh.gov.vn/');
    expect(schema.schemaVersion).toBe('2.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.earliestBeforeArrival).toBe('30d');
    expect(schema.submission.recommended).toBe('14d');
    expect(schema.submission.latestBeforeArrival).toBe('3d');
  });

  test('implementation status should be planned', () => {
    expect(schema.metadata.implementationStatus).toBe('planned');
  });

  // ── Portal flow ───────────────────────────────────────────────────────────

  test('portalFlow should not require account registration', () => {
    expect(schema.portalFlow.requiresAccount).toBe(false);
  });

  test('portalFlow should require payment prerequisite', () => {
    const paymentPrereq = schema.portalFlow.prerequisites!.find((p: any) => p.type === 'payment');
    expect(paymentPrereq!.required).toBe(true);
  });

  // ── Sections ──────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(5);
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('contact');
  });

  test('personal section should include Vietnam-specific religion field', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const religionField = personalSection.fields.find(f => f.id === 'religion')!;
    expect(religionField.countrySpecific).toBe(true);
    expect(religionField.required).toBe(true);
  });

  test('religion field should have expected options', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const religionField = personalSection.fields.find(f => f.id === 'religion')!;
    const values = religionField.options?.map(o => o.value) ?? [];
    expect(values).toContain('buddhism');
    expect(values).toContain('christianity');
    expect(values).toContain('islam');
    expect(values).toContain('none');
  });

  test('travel section should have Vietnam-specific port of entry field', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const entryPortField = travelSection.fields.find(f => f.id === 'entryPort')!;
    expect(entryPortField.countrySpecific).toBe(true);
    const portCodes = entryPortField.options?.map(o => o.value) ?? [];
    expect(portCodes).toContain('SGN');
    expect(portCodes).toContain('HAN');
    expect(portCodes).toContain('DAD');
  });

  test('purpose of visit should have Vietnam-specific options', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfVisit')!;
    expect(purposeField.countrySpecific).toBe(true);
    const purposes = purposeField.options!.map(o => o.value);
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('business');
    expect(purposes).toContain('family_visit');
    expect(purposes).toContain('transit');
  });

  test('stay duration should have validation limits matching tourist e-visa max', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const durationField = travelSection.fields.find(f => f.id === 'stayDuration')!;
    expect((durationField as any).validation!.min).toBe(1);
    expect((durationField as any).validation!.max).toBe(30);
  });

  test('previousVietnamVisit should be a Vietnam-specific boolean field', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const prevVisitField = travelSection.fields.find(f => f.id === 'previousVietnamVisit')!;
    expect(prevVisitField.type).toBe('boolean');
    expect(prevVisitField.countrySpecific).toBe(true);
    expect(prevVisitField.required).toBe(true);
  });

  test('accommodation section should have Vietnam city/province selector', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const cityField = accommodationSection.fields.find(f => f.id === 'cityOfStay')!;
    expect(cityField.countrySpecific).toBe(true);
    const cities = cityField.options!.map(o => o.value);
    expect(cities).toContain('hanoi');
    expect(cities).toContain('ho_chi_minh');
    expect(cities).toContain('da_nang');
    expect(cities).toContain('phu_quoc');
  });

  test('contact section should have emergency contact fields', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact')!;
    const fieldIds = contactSection.fields.map(f => f.id);
    expect(fieldIds).toContain('emergencyContactName');
    expect(fieldIds).toContain('emergencyContactPhone');
    expect(contactSection.fields.find(f => f.id === 'emergencyContactName')!.countrySpecific).toBe(true);
  });

  test('email field should have validation pattern', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact')!;
    const emailField = contactSection.fields.find(f => f.id === 'email')!;
    expect((emailField as any).validation!.pattern).toContain('@');
  });

  // ── Submission guide (country-specific count) ─────────────────────────────

  test('should have complete submission guide with 10 steps', () => {
    expect(schema.submissionGuide).toHaveLength(10);
    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Access Vietnam e-Visa Portal');
    expect(stepTitles).toContain('Download Your e-Visa');
  });
});
