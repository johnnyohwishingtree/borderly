import { CountryFormSchema } from '../../src/types/schema';
import IND from '../../src/schemas/IND.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('India (IND) Schema', () => {
  const schema = IND as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'IND');

  // ── Country metadata ──────────────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('IND');
    expect(schema.countryName).toBe('India');
    expect(schema.portalName).toBe('India Air Suvidha / e-Arrival Card');
    expect(schema.portalUrl).toBe('https://www.newdelhiairport.in/airsuvidha');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.earliestBeforeArrival).toBe('14d');
    expect(schema.submission.recommended).toBe('3d');
  });

  test('latestBeforeArrival should be 0d', () => {
    expect(schema.submission.latestBeforeArrival).toBe('0d');
  });

  test('implementation status should be complete', () => {
    expect(schema.metadata.implementationStatus).toBe('complete');
  });

  // ── Portal flow ───────────────────────────────────────────────────────────

  test('portalFlow should not require account registration', () => {
    expect(schema.portalFlow.requiresAccount).toBe(false);
  });

  test('portalFlow should require visa prerequisite', () => {
    const visaPrereq = schema.portalFlow.prerequisites!.find((p: any) => p.description.includes('visa'));
    expect(visaPrereq!.required).toBe(true);
  });

  // ── Sections ──────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(6);
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('health');
    expect(sectionIds).toContain('customs');
    expect(sectionIds).toContain('contact');
  });

  test('personal section should include India-specific occupation field', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const occupationField = personalSection.fields.find(f => f.id === 'occupation')!;
    expect(occupationField.countrySpecific).toBe(true);
    expect(occupationField.required).toBe(true);
    expect(occupationField.type).toBe('searchable_select');
  });

  test('occupation field should have autoFillMapping', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const occupationField = personalSection.fields.find(f => f.id === 'occupation')!;
    expect((occupationField as any).autoFillMapping._default).toBe('other');
    expect((occupationField as any).autoFillMapping.STUDENT).toBe('student');
  });

  test('gender field should include Other option for India', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const genderField = personalSection.fields.find(f => f.id === 'gender')!;
    const values = genderField.options?.map(o => o.value) ?? [];
    expect(values).toContain('M');
    expect(values).toContain('F');
    expect(values).toContain('O');
  });

  test('passport section should have India-specific visa fields', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    const visaTypeField = passportSection.fields.find(f => f.id === 'visaType')!;
    expect(visaTypeField.countrySpecific).toBe(true);
    const visaTypes = visaTypeField.options?.map(o => o.value) ?? [];
    expect(visaTypes).toContain('tourist');
    expect(visaTypes).toContain('e_tourist');
    expect(visaTypes).toContain('business');
    expect(visaTypes).toContain('medical');
  });

  test('travel section should have India-specific port of arrival', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const portField = travelSection.fields.find(f => f.id === 'portOfArrival')!;
    expect(portField.countrySpecific).toBe(true);
    const portCodes = portField.options?.map(o => o.value) ?? [];
    expect(portCodes).toContain('DEL');
    expect(portCodes).toContain('BOM');
    expect(portCodes).toContain('BLR');
    expect(portCodes).toContain('MAA');
  });

  test('purpose of visit should have India-specific options including pilgrimage', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfVisit')!;
    expect(purposeField.countrySpecific).toBe(true);
    const purposes = purposeField.options?.map(o => o.value) ?? [];
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('pilgrimage');
    expect(purposes).toContain('medical');
  });

  test('stay duration should have validation limits matching tourist visa max', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const durationField = travelSection.fields.find(f => f.id === 'stayDuration')!;
    expect((durationField as any).validation.min).toBe(1);
    expect((durationField as any).validation.max).toBe(180);
  });

  test('previousIndiaVisit should be an India-specific boolean field', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const prevVisitField = travelSection.fields.find(f => f.id === 'previousIndiaVisit')!;
    expect(prevVisitField.type).toBe('boolean');
    expect(prevVisitField.countrySpecific).toBe(true);
    expect(prevVisitField.required).toBe(true);
  });

  test('health section should have health declaration fields', () => {
    const healthSection = schema.sections.find(s => s.id === 'health')!;
    const fieldIds = healthSection.fields.map(f => f.id);
    expect(fieldIds).toContain('countriesVisitedLast14Days');
    expect(fieldIds).toContain('feverOrCough');
    expect(fieldIds).toContain('contactWithInfected');
  });

  test('customs section should have currency and goods declaration fields', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs')!;
    const fieldIds = customsSection.fields.map(f => f.id);
    expect(fieldIds).toContain('carryingCurrency');
    expect(fieldIds).toContain('dutiableGoods');
    expect(fieldIds).toContain('prohibitedItems');
    expect(fieldIds).toContain('commercialGoods');
  });

  test('contact section should have emergency contact fields', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact')!;
    const fieldIds = contactSection.fields.map(f => f.id);
    expect(fieldIds).toContain('emergencyContactName');
    expect(fieldIds).toContain('emergencyContactPhone');
    expect(contactSection.fields.find(f => f.id === 'emergencyContactName')!.countrySpecific).toBe(true);
  });

  // ── Submission guide (country-specific count) ─────────────────────────────

  test('should have complete submission guide with 8 steps', () => {
    expect(schema.submissionGuide).toHaveLength(8);
    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Access India e-Arrival Card Portal');
    expect(stepTitles).toContain('Review and Submit');
  });
});
