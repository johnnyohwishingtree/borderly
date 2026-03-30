import { CountryFormSchema } from '../../src/types/schema';
import AUS from '../../src/schemas/AUS.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('Australia (AUS) Schema', () => {
  const schema = AUS as CountryFormSchema;

  // ── Shared tests ──────────────────────────────────────────────────────────

  runSharedSchemaTests(schema, 'AUS');

  // ── Country metadata ──────────────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('AUS');
    expect(schema.countryName).toBe('Australia');
    expect(schema.portalName).toBe('ABF Digital Incoming Passenger Card (DIPC)');
    expect(schema.portalUrl).toBe('https://online.abf.gov.au/incoming-passenger-card/');
    expect(schema.schemaVersion).toBe('1.0.0');
    expect(typeof schema.lastUpdated).toBe('string');
    expect(schema.metadata.implementationStatus).toBe('complete');
    expect(schema.metadata.priority).toBe(3);
    expect(schema.metadata.complexity).toBe('medium');
    expect(schema.metadata.popularity).toBe(85);
    expect(schema.metadata.supportedLanguages).toContain('en');
  });

  // ── Submission timing ─────────────────────────────────────────────────────

  test('should have valid submission timing requirements', () => {
    expect(schema.submission.earliestBeforeArrival).toBe('72h');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('48h');
    expect(schema.submissionDeadlineHours).toBe(0);
    expect(schema.recommendedLeadTimeHours).toBe(48);
    expect(schema.submissionWindowNote.toLowerCase()).toContain('72');
    expect(schema.passportValidityMonths).toBe(6);
  });

  // ── Portal flow ───────────────────────────────────────────────────────────

  test('portalFlow should be configured for guest portal', () => {
    expect(schema.portalFlow.requiresAccount).toBe(false);
    expect(schema.portalFlow.familyPolicy!.type).toBe('none');
    expect(schema.portalFlow.familyPolicy!.description).toContain('No account required');
    expect(schema.portalFlow.prerequisites!.length).toBeGreaterThanOrEqual(2);
  });

  // ── Sections ──────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('address');
    expect(sectionIds).toContain('health_biosecurity');
    expect(sectionIds).toContain('customs');
  });

  // ── Personal section ──────────────────────────────────────────────────────

  test('personal section should have core passport fields with autoFillSource', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const fieldIds = personalSection.fields.map(f => f.id);
    expect(fieldIds).toContain('familyName');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('passportNumber');
    expect(personalSection.fields.find(f => f.id === 'familyName')!.autoFillSource).toBe('profile.surname');
    expect(personalSection.fields.find(f => f.id === 'givenNames')!.autoFillSource).toBe('profile.givenNames');
    expect(personalSection.fields.find(f => f.id === 'passportNumber')!.autoFillSource).toBe('profile.passportNumber');
  });

  test('gender field should be a select with male/female/unspecified options', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const genderField = personalSection.fields.find(f => f.id === 'gender')!;
    expect(genderField.type).toBe('searchable_select');
    expect(genderField.autoFillSource).toBe('profile.gender');
    const values = genderField.options!.map(o => o.value);
    expect(values).toContain('M');
    expect(values).toContain('F');
    expect(values).toContain('X');
  });

  // ── Travel section ────────────────────────────────────────────────────────

  test('travel section should have DIPC-specific fields', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const fieldIds = travelSection.fields.map(f => f.id);
    expect(fieldIds).toContain('flightNumber');
    expect(fieldIds).toContain('arrivalDate');
    expect(fieldIds).toContain('seatClass');
    expect(fieldIds).toContain('lastCountryVisited');
    expect(fieldIds).toContain('purposeOfVisit');
  });

  test('seatClass should be country-specific select with economy/business/first', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const seatField = travelSection.fields.find(f => f.id === 'seatClass')!;
    expect(seatField.type).toBe('searchable_select');
    expect(seatField.countrySpecific).toBe(true);
    const values = seatField.options!.map(o => o.value);
    expect(values).toContain('economy');
    expect(values).toContain('business');
    expect(values).toContain('first');
  });

  // ── Address section ───────────────────────────────────────────────────────

  test('address state field should have all 8 Australian states/territories', () => {
    const addressSection = schema.sections.find(s => s.id === 'address')!;
    const stateField = addressSection.fields.find(f => f.id === 'australianAddressState')!;
    expect(stateField.type).toBe('searchable_select');
    const values = stateField.options!.map(o => o.value);
    expect(values).toHaveLength(8);
    expect(values).toContain('ACT');
    expect(values).toContain('NSW');
    expect(values).toContain('VIC');
  });

  // ── Biosecurity declarations ──────────────────────────────────────────────

  test('biosecurity section should have boolean country-specific declaration fields', () => {
    const biosecuritySection = schema.sections.find(s => s.id === 'health_biosecurity')!;
    const fieldIds = biosecuritySection.fields.map(f => f.id);
    expect(fieldIds).toContain('hasFoodItems');
    expect(fieldIds).toContain('hasPlantItems');
    expect(fieldIds).toContain('hasAnimalItems');
    expect(fieldIds).toContain('hasBiosecurityRiskItems');
    expect(fieldIds).toContain('hasSoilOrWater');
    biosecuritySection.fields.forEach(field => {
      expect(field.type).toBe('boolean');
      expect(field.countrySpecific).toBe(true);
    });
  });

  // ── Customs declarations ──────────────────────────────────────────────────

  test('customs section should have declaration fields including AUD 10,000 currency', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs')!;
    const fieldIds = customsSection.fields.map(f => f.id);
    expect(fieldIds).toContain('hasControlledGoods');
    expect(fieldIds).toContain('hasCurrencyOver10000');
    expect(fieldIds).toContain('hasGoodsExceedingAllowance');
    const currencyField = customsSection.fields.find(f => f.id === 'hasCurrencyOver10000')!;
    expect(currencyField.label).toContain('10,000');
  });

  // ── Submission guide (country-specific count) ─────────────────────────────

  test('should have a complete submission guide with 8 steps', () => {
    expect(schema.submissionGuide).toHaveLength(8);
  });
});
