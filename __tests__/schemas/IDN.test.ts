import { CountryFormSchema } from '../../src/types/schema';
import IDN from '../../src/schemas/IDN.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('Indonesia (IDN) Schema', () => {
  const schema = IDN as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'IDN');

  // ── Country metadata ──────────────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('IDN');
    expect(schema.countryName).toBe('Indonesia');
    expect(schema.portalName).toBe('Indonesia Electronic Customs Declaration (e-CD)');
    expect(schema.portalUrl).toBe('https://ecd.beacukai.go.id');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.earliestBeforeArrival).toBe('7d');
    expect(schema.submission.recommended).toBe('24h');
  });

  test('latestBeforeArrival should be 0h', () => {
    expect(schema.submission.latestBeforeArrival).toBe('0h');
  });

  test('implementation status should be complete', () => {
    expect(schema.metadata.implementationStatus).toBe('complete');
  });

  // ── Portal flow ───────────────────────────────────────────────────────────

  test('portalFlow should not require account registration', () => {
    expect(schema.portalFlow.requiresAccount).toBe(false);
  });

  test('portalFlow should support family declarations', () => {
    expect(schema.portalFlow.familyPolicy!.type).toBe('family');
  });

  // ── Sections ──────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(6);
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('flight');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('customs');
    expect(sectionIds).toContain('contact');
  });

  test('personal section should include Indonesia-specific occupation field', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const occupationField = personalSection.fields.find(f => f.id === 'occupation')!;
    expect(occupationField.countrySpecific).toBe(true);
    expect(occupationField.type).toBe('searchable_select');
  });

  test('occupation field should have autoFillMapping', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const occupationField = personalSection.fields.find(f => f.id === 'occupation')!;
    expect((occupationField as any).autoFillMapping._default).toBe('other');
    expect((occupationField as any).autoFillMapping.Student).toBe('student');
  });

  test('flight section should have Indonesia-specific port of arrival', () => {
    const flightSection = schema.sections.find(s => s.id === 'flight')!;
    const portField = flightSection.fields.find(f => f.id === 'portOfArrival')!;
    expect(portField.countrySpecific).toBe(true);
    const portCodes = portField.options?.map(o => o.value) ?? [];
    expect(portCodes).toContain('CGK');
    expect(portCodes).toContain('DPS');
    expect(portCodes).toContain('SUB');
  });

  test('accommodation section should have Indonesia city selector', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const cityField = accommodationSection.fields.find(f => f.id === 'cityOfStay')!;
    expect(cityField.countrySpecific).toBe(true);
    const cities = cityField.options?.map(o => o.value) ?? [];
    expect(cities).toContain('jakarta');
    expect(cities).toContain('bali');
    expect(cities).toContain('yogyakarta');
  });

  test('stay duration should have validation limits matching visa on arrival max', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const durationField = accommodationSection.fields.find(f => f.id === 'stayDuration')!;
    expect((durationField as any).validation.min).toBe(1);
    expect((durationField as any).validation.max).toBe(30);
  });

  test('customs section should have currency and goods declaration fields', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs')!;
    const fieldIds = customsSection.fields.map(f => f.id);
    expect(fieldIds).toContain('carryingCurrency');
    expect(fieldIds).toContain('carryingGoods');
    expect(fieldIds).toContain('carryingAnimalsPlants');
    expect(fieldIds).toContain('carryingNarcotics');
    expect(fieldIds).toContain('carryingCommercialGoods');
  });

  test('contact section should have email with validation', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact')!;
    const emailField = contactSection.fields.find(f => f.id === 'email')!;
    expect((emailField as any).validation.pattern).toContain('@');
  });

  // ── Submission guide (country-specific count) ─────────────────────────────

  test('should have complete submission guide with 8 steps', () => {
    expect(schema.submissionGuide).toHaveLength(8);
    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Access Indonesia e-CD Portal');
    expect(stepTitles).toContain('Review and Submit');
  });
});
