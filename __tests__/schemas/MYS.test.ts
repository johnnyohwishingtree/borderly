import { CountryFormSchema } from '../../src/types/schema';
import MYS from '../../src/schemas/MYS.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('Malaysia (MYS) Schema', () => {
  const schema = MYS as unknown as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'MYS');

  // ── Country metadata ──────────────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('MYS');
    expect(schema.countryName).toBe('Malaysia');
    expect(schema.portalName).toBe('Malaysia Digital Arrival Card (MDAC)');
    expect(schema.portalUrl).toBe('https://imigresen-online.imi.gov.my/mdac/main');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.earliestBeforeArrival).toBe('3d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('24h');
  });

  test('should have submission deadline metadata', () => {
    expect(schema.submissionDeadlineHours).toBe(0);
    expect(schema.recommendedLeadTimeHours).toBe(24);
    expect(schema.submissionWindowNote).toBe('Submit any time before arrival');
  });

  // ── Sections ──────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(4);
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('health_declarations');
  });

  test('personal information section should include email and phone', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const fieldIds = personalSection.fields.map(f => f.id);
    expect(fieldIds).toContain('email');
    expect(fieldIds).toContain('phoneNumber');
    expect(fieldIds).toContain('passportExpiry');
  });

  test('travel section should have Malaysia-specific port of entry airport autocomplete', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const airportField = travelSection.fields.find(f => f.id === 'arrivalAirport')!;
    expect(airportField.countrySpecific).toBe(true);
    expect(airportField.type).toBe('searchable_select');
    expect((airportField as any).optionsSource).toBe('airports');

    const { ALL_AIRPORTS } = require('../../src/constants/airports');
    const codes = new Set(ALL_AIRPORTS.map((a: { value: string }) => a.value));
    expect(codes.has('KUL')).toBe(true);
    expect(codes.has('KUA')).toBe(true);
    expect(codes.has('PEN')).toBe(true);
    expect(codes.has('BKI')).toBe(true);
    expect(codes.has('JHB')).toBe(true);
  });

  test('purpose of visit should have Malaysia-specific options', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfVisit')!;
    expect(purposeField.countrySpecific).toBe(true);
    const purposes = purposeField.options!.map(o => o.value);
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('visiting_family');
    expect(purposes).toContain('medical');
  });

  test('should have health declaration section', () => {
    const healthSection = schema.sections.find(s => s.id === 'health_declarations')!;
    const fieldIds = healthSection.fields.map(f => f.id);
    expect(fieldIds).toContain('healthCondition');
    expect(fieldIds).toContain('visitedHighRiskCountries');
  });

  test('currency declaration should have Malaysia-specific threshold', () => {
    const healthSection = schema.sections.find(s => s.id === 'health_declarations')!;
    const currencyField = healthSection.fields.find(f => f.id === 'carryingCurrency')!;
    expect(currencyField.label).toContain('RM10,000');
    expect((currencyField as any).helpText).toContain('Malaysian Ringgit');
  });

  test('duration of stay should have validation limits', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const durationField = travelSection.fields.find(f => f.id === 'durationOfStay')!;
    expect((durationField as any).validation!.min).toBe(1);
    expect((durationField as any).validation!.max).toBe(90);
  });

  test('email field should have validation pattern', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const emailField = personalSection.fields.find(f => f.id === 'email')!;
    expect(typeof (emailField as any).validation!.pattern).toBe('string');
    expect((emailField as any).validation!.pattern).toContain('@');
  });

  test('health fields should be country-specific', () => {
    const healthSection = schema.sections.find(s => s.id === 'health_declarations')!;
    expect(healthSection.fields.find(f => f.id === 'healthCondition')!.countrySpecific).toBe(true);
    expect(healthSection.fields.find(f => f.id === 'visitedHighRiskCountries')!.countrySpecific).toBe(true);
  });

  test('accommodation should support textarea for address', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const addressField = accommodationSection.fields.find(f => f.id === 'hotelAddress')!;
    expect(addressField.type).toBe('textarea');
  });

  // ── Submission guide (country-specific) ───────────────────────────────────

  test('should have complete submission guide', () => {
    expect(schema.submissionGuide).toHaveLength(6);
    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Access MDAC Portal');
    expect(stepTitles).toContain('Submit and Save');
  });
});
