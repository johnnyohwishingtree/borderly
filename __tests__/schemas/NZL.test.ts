import { CountryFormSchema } from '../../src/types/schema';
import NZL from '../../src/schemas/NZL.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('New Zealand (NZL) Schema', () => {
  const schema = NZL as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'NZL');

  // ── Country metadata ──────────────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('NZL');
    expect(schema.countryName).toBe('New Zealand');
    expect(schema.portalName).toBe('New Zealand Traveller Declaration (NZTD)');
    expect(schema.portalUrl).toBe('https://www.nztravellerdeclaration.govt.nz');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have complete metadata with lastUpdated in ISO format', () => {
    expect(typeof schema.lastUpdated).toBe('string');
    expect(() => new Date(schema.lastUpdated)).not.toThrow();
    expect(schema.metadata.implementationStatus).toBe('complete');
    expect(schema.metadata.supportedLanguages).toContain('en');
    expect(schema.metadata.maintenanceFrequency).toBe('quarterly');
  });

  // ── Submission timing ─────────────────────────────────────────────────────

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.latestBeforeArrival).toBe('24h');
    expect(schema.submission.recommended).toBe('48h');
  });

  test('submissionDeadlineHours should be 24', () => {
    expect(schema.submissionDeadlineHours).toBe(24);
  });

  test('recommendedLeadTimeHours should be 72', () => {
    expect(schema.recommendedLeadTimeHours).toBe(72);
  });

  // ── Passport validity ─────────────────────────────────────────────────────

  test('passportValidityMonths should be 3', () => {
    expect(schema.passportValidityMonths).toBe(3);
  });

  // ── Portal flow ───────────────────────────────────────────────────────────

  test('portalFlow should have requiresAccount set to false', () => {
    expect(schema.portalFlow.requiresAccount).toBe(false);
  });

  test('portalFlow should have family policy with no account requirement', () => {
    expect(schema.portalFlow.familyPolicy!.type).toBe('none');
    expect(schema.portalFlow.familyPolicy!.description).toContain('No account required');
  });

  test('portalFlow should have prerequisites', () => {
    expect(schema.portalFlow.prerequisites!.length).toBeGreaterThanOrEqual(2);
    const prereqDescriptions = schema.portalFlow.prerequisites!.map(p => p.description);
    expect(prereqDescriptions.some(d => d.toLowerCase().includes('passport'))).toBe(true);
  });

  // ── Sections ──────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    expect(schema.sections.length).toBeGreaterThanOrEqual(5);
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('address');
    expect(sectionIds).toContain('biosecurity');
    expect(sectionIds).toContain('goods');
  });

  // ── Personal section ──────────────────────────────────────────────────────

  test('personal section should have core passport fields', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const fieldIds = personalSection.fields.map(f => f.id);
    expect(fieldIds).toContain('familyName');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportExpiry');
    expect(fieldIds).toContain('email');
  });

  test('email field should auto-fill from profile', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const emailField = personalSection.fields.find(f => f.id === 'email')!;
    expect(emailField.autoFillSource).toBe('profile.email');
  });

  // ── Address section ───────────────────────────────────────────────────────

  test('address section should have NZ address fields', () => {
    const addressSection = schema.sections.find(s => s.id === 'address')!;
    const fieldIds = addressSection.fields.map(f => f.id);
    expect(fieldIds).toContain('nzAddressLine1');
    expect(fieldIds).toContain('nzAddressCity');
  });

  test('address fields should auto-fill from leg accommodation', () => {
    const addressSection = schema.sections.find(s => s.id === 'address')!;
    expect(addressSection.fields.find(f => f.id === 'nzAddressLine1')!.autoFillSource).toBe('leg.accommodation.address.line1');
    expect(addressSection.fields.find(f => f.id === 'nzAddressCity')!.autoFillSource).toBe('leg.accommodation.address.city');
  });

  // ── Biosecurity declarations ──────────────────────────────────────────────

  test('biosecurity section should have all biosecurity declaration fields', () => {
    const biosecuritySection = schema.sections.find(s => s.id === 'biosecurity')!;
    const fieldIds = biosecuritySection.fields.map(f => f.id);
    expect(fieldIds).toContain('hasFoodItems');
    expect(fieldIds).toContain('hasPlantItems');
    expect(fieldIds).toContain('hasAnimalItems');
    expect(fieldIds).toContain('hasSoilOrWaterItems');
  });

  test('biosecurity fields should be boolean and country-specific', () => {
    const biosecuritySection = schema.sections.find(s => s.id === 'biosecurity')!;
    biosecuritySection.fields.forEach(field => {
      expect(field.type).toBe('boolean');
      expect(field.countrySpecific).toBe(true);
      expect(field.required).toBe(true);
    });
  });

  // ── Goods declarations ────────────────────────────────────────────────────

  test('goods section should have goods declaration fields', () => {
    const goodsSection = schema.sections.find(s => s.id === 'goods')!;
    const fieldIds = goodsSection.fields.map(f => f.id);
    expect(fieldIds).toContain('hasCurrencyOver10000');
    expect(fieldIds).toContain('hasControlledItems');
    expect(fieldIds).toContain('hasGoodsExceedingAllowance');
  });

  test('currency declaration should mention NZD 10,000', () => {
    const goodsSection = schema.sections.find(s => s.id === 'goods')!;
    const currencyField = goodsSection.fields.find(f => f.id === 'hasCurrencyOver10000')!;
    expect(currencyField.type).toBe('boolean');
    expect(currencyField.label).toContain('10,000');
    expect(currencyField.countrySpecific).toBe(true);
  });

  // ── Submission guide (country-specific count) ─────────────────────────────

  test('should have a complete submission guide with 8 steps', () => {
    expect(schema.submissionGuide).toHaveLength(8);
  });
});
