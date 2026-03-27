import { CountryFormSchema } from '../../src/types/schema';
import { validateSchemaCompletely, loadSchema } from '../../src/services/schemas/schemaLoader';
import { getSchemaByCountryCode } from '../../src/schemas';
import KOR from '../../src/schemas/KOR.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('South Korea (KOR) Schema', () => {
  const schema = KOR as CountryFormSchema;

  // ── 1. Schema structure fields ──────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('KOR');
    expect(schema.countryName).toBe('South Korea');
    expect(schema.portalName).toBe('Korea K-ETA');
    expect(schema.portalUrl).toBe('https://www.k-eta.go.kr/portal/apply/index.do');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have lastUpdated in ISO format', () => {
    expect(typeof schema.lastUpdated).toBe('string');
    expect(() => new Date(schema.lastUpdated)).not.toThrow();
  });

  test('should have implementationStatus set to complete', () => {
    expect(schema.metadata).not.toBeUndefined();
    expect(schema.metadata.implementationStatus).toBe('complete');
  });

  test('should have metadata with expected fields', () => {
    const metadata = schema.metadata;
    expect(typeof metadata.priority).toBe('number');
    expect(metadata.complexity).toBe('medium');
    expect(metadata.popularity).toBeGreaterThan(0);
    expect(metadata.supportedLanguages).toContain('en');
    expect(metadata.supportedLanguages).toContain('ko');
    expect(metadata.maintenanceFrequency).toBe('monthly');
  });

  // ── 2. Submission timing ────────────────────────────────────────────────────

  test('submissionDeadlineHours should be 72', () => {
    expect(schema.submissionDeadlineHours).toBe(72);
  });

  test('recommendedLeadTimeHours should be 168', () => {
    expect(schema.recommendedLeadTimeHours).toBe(168);
  });

  test('submissionWindowNote should mention 72 hours', () => {
    expect(typeof schema.submissionWindowNote).toBe('string');
    expect(schema.submissionWindowNote.toLowerCase()).toContain('72');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).not.toBeUndefined();
    expect(schema.submission.latestBeforeArrival).toBe('72h');
  });

  // ── 3. Passport validity ────────────────────────────────────────────────────

  test('passportValidityMonths should be 6', () => {
    expect(schema.passportValidityMonths).toBe(6);
  });

  // ── 4. Portal flow ──────────────────────────────────────────────────────────

  test('portalFlow should have requiresAccount set to true', () => {
    expect(schema.portalFlow).not.toBeUndefined();
    expect(schema.portalFlow.requiresAccount).toBe(true);
  });

  test('portalFlow should have signupUrl', () => {
    expect(typeof schema.portalFlow.signupUrl).toBe('string');
    expect(schema.portalFlow.signupUrl).toContain('k-eta');
  });

  test('portalFlow should have family policy', () => {
    const portalFlow = schema.portalFlow;
    expect(portalFlow.familyPolicy).not.toBeUndefined();
    expect(portalFlow.familyPolicy!.type).toBe('individual');
  });

  test('portalFlow should have prerequisites including passport and account', () => {
    expect(schema.portalFlow.prerequisites).not.toBeUndefined();
    expect(schema.portalFlow.prerequisites!.length).toBeGreaterThanOrEqual(2);

    const prereqDescriptions = schema.portalFlow.prerequisites!.map(p => p.description.toLowerCase());
    expect(prereqDescriptions.some(d => d.includes('passport'))).toBe(true);
    expect(prereqDescriptions.some(d => d.includes('account') || d.includes('email'))).toBe(true);
  });

  // ── 5. Sections ─────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    expect(schema.sections.length).toBeGreaterThanOrEqual(5);

    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('personal_info');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('health_declaration');
    expect(sectionIds).toContain('customs_declaration');
  });

  // ── 6. Passport section ─────────────────────────────────────────────────────

  test('passport section should have core fields with autoFillSource', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport');
    expect(passportSection).not.toBeUndefined();

    const fieldIds = passportSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('gender');
    expect(fieldIds).toContain('passportExpiry');
  });

  test('passport fields should have autoFillSource mapped to profile paths', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;

    const passportNumberField = passportSection.fields.find(f => f.id === 'passportNumber')!;
    expect(passportNumberField.autoFillSource).toBe('profile.passportNumber');

    const surnameField = passportSection.fields.find(f => f.id === 'surname')!;
    expect(surnameField.autoFillSource).toBe('profile.surname');

    const givenNamesField = passportSection.fields.find(f => f.id === 'givenNames')!;
    expect(givenNamesField.autoFillSource).toBe('profile.givenNames');

    const dobField = passportSection.fields.find(f => f.id === 'dateOfBirth')!;
    expect(dobField.autoFillSource).toBe('profile.dateOfBirth');

    const expiryField = passportSection.fields.find(f => f.id === 'passportExpiry')!;
    expect(expiryField.autoFillSource).toBe('profile.passportExpiry');
  });

  test('gender field should be a select with male/female options', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    const genderField = passportSection.fields.find(f => f.id === 'gender')!;

    expect(genderField).not.toBeUndefined();
    expect(genderField.type).toBe('searchable_select');
    expect(genderField.autoFillSource).toBe('profile.gender');

    const values = genderField.options!.map(o => o.value);
    expect(values).toContain('M');
    expect(values).toContain('F');
  });

  // ── 7. Personal info section ─────────────────────────────────────────────────

  test('personal_info section should have contact and occupation fields', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal_info');
    expect(personalSection).not.toBeUndefined();

    const fieldIds = personalSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('email');
    expect(fieldIds).toContain('phoneNumber');
    expect(fieldIds).toContain('occupation');
    expect(fieldIds).toContain('homeCountry');
  });

  test('occupation field should be a country-specific select', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal_info')!;
    const occupationField = personalSection.fields.find(f => f.id === 'occupation')!;

    expect(occupationField).not.toBeUndefined();
    expect(occupationField.type).toBe('searchable_select');
    expect(occupationField.countrySpecific).toBe(true);
    expect(occupationField.required).toBe(true);
    expect(occupationField.options).not.toBeUndefined();
    expect(occupationField.options!.length).toBeGreaterThan(0);
  });

  // ── 8. Travel section ───────────────────────────────────────────────────────

  test('travel section should have K-ETA specific fields', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).not.toBeUndefined();

    const fieldIds = travelSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('purposeOfVisit');
    expect(fieldIds).toContain('arrivalDate');
    expect(fieldIds).toContain('durationOfStay');
    expect(fieldIds).toContain('flightNumber');
    expect(fieldIds).toContain('arrivalAirport');
  });

  test('purposeOfVisit should be a country-specific select with expected options', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfVisit')!;

    expect(purposeField).not.toBeUndefined();
    expect(purposeField.type).toBe('searchable_select');
    expect(purposeField.countrySpecific).toBe(true);
    expect(purposeField.required).toBe(true);

    const values = purposeField.options!.map(o => o.value);
    expect(values).toContain('tourism');
    expect(values).toContain('business');
    expect(values).toContain('transit');
  });

  test('arrivalDate should auto-fill from leg', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const arrivalField = travelSection.fields.find(f => f.id === 'arrivalDate')!;
    expect(arrivalField.autoFillSource).toBe('leg.arrivalDate');
  });

  test('flightNumber should auto-fill from leg', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const flightField = travelSection.fields.find(f => f.id === 'flightNumber')!;
    expect(flightField.autoFillSource).toBe('leg.flightNumber');
  });

  // ── 9. Accommodation section ─────────────────────────────────────────────────

  test('accommodation section should have hotel fields', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation');
    expect(accommodationSection).not.toBeUndefined();

    const fieldIds = accommodationSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('hotelName');
    expect(fieldIds).toContain('hotelAddress');
  });

  test('hotelName should auto-fill from leg accommodation', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const hotelNameField = accommodationSection.fields.find(f => f.id === 'hotelName')!;
    expect(hotelNameField.autoFillSource).toBe('leg.accommodation.name');
  });

  // ── 10. Health declaration ───────────────────────────────────────────────────

  test('health_declaration section should have health screening fields', () => {
    const healthSection = schema.sections.find(s => s.id === 'health_declaration');
    expect(healthSection).not.toBeUndefined();

    const fieldIds = healthSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('hasSymptoms');
    expect(fieldIds).toContain('hasInfectiousDisease');
    expect(fieldIds).toContain('visitedOutbreakArea');
  });

  test('health declaration fields should be boolean and country-specific', () => {
    const healthSection = schema.sections.find(s => s.id === 'health_declaration')!;

    healthSection.fields.forEach(field => {
      expect(field.type).toBe('boolean');
      expect(field.countrySpecific).toBe(true);
      expect(field.required).toBe(true);
    });
  });

  // ── 11. Customs declaration ──────────────────────────────────────────────────

  test('customs_declaration section should have required fields', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs_declaration');
    expect(customsSection).not.toBeUndefined();

    const fieldIds = customsSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('carryingProhibitedItems');
    expect(fieldIds).toContain('exceedsDutyFreeAllowance');
    expect(fieldIds).toContain('carryingCurrencyOverLimit');
    expect(fieldIds).toContain('carryingAnimalPlantProducts');
    expect(fieldIds).toContain('carryingCommercialGoods');
  });

  test('exceedsDutyFreeAllowance should mention USD 800', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs_declaration')!;
    const dutyField = customsSection.fields.find(f => f.id === 'exceedsDutyFreeAllowance')!;

    expect(dutyField).not.toBeUndefined();
    expect(dutyField.type).toBe('boolean');
    expect(dutyField.label + ' ' + (dutyField.helpText ?? '')).toContain('800');
  });

  test('carryingCurrencyOverLimit should mention USD 10,000', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs_declaration')!;
    const currencyField = customsSection.fields.find(f => f.id === 'carryingCurrencyOverLimit')!;

    expect(currencyField).not.toBeUndefined();
    expect(currencyField.type).toBe('boolean');
    expect(currencyField.label + ' ' + (currencyField.helpText ?? '')).toContain('10,000');
  });

  // ── 12. Submission guide ────────────────────────────────────────────────────

  test('should have a complete submission guide with 8 steps', () => {
    expect(schema.submissionGuide).toHaveLength(8);
  });

  test('submission guide steps should have incrementing order', () => {
    const orders = schema.submissionGuide.map(s => s.order);
    orders.forEach((order, index) => {
      expect(order).toBe(index + 1);
    });
  });

  test('each submission guide step should have non-empty title and description', () => {
    schema.submissionGuide.forEach(step => {
      expect(step.title).toEqual(expect.stringMatching(/\S/));
      expect(step.description).toEqual(expect.stringMatching(/\S/));
    });
  });

  test('submission guide should reference valid field IDs', () => {
    const allFieldIds = new Set<string>();
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        allFieldIds.add(field.id);
      });
    });

    schema.submissionGuide.forEach(step => {
      step.fieldsOnThisScreen.forEach(fieldId => {
        expect(allFieldIds.has(fieldId)).toBe(true);
      });
    });
  });

  // ── 13. Field ID uniqueness ─────────────────────────────────────────────────

  test('should have unique field IDs across all sections', () => {
    const allFieldIds = new Set<string>();

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(allFieldIds.has(field.id)).toBe(false);
        allFieldIds.add(field.id);
      });
    });
  });

  // ── 14. autoFillSource validity ─────────────────────────────────────────────

  test('fields with autoFillSource should reference valid profile or leg paths', () => {
    const validPrefixes = ['profile.', 'leg.'];

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        const autoFill = field.autoFillSource;
        if (autoFill) {
          const hasValidPrefix = validPrefixes.some(prefix => autoFill.startsWith(prefix));
          expect(hasValidPrefix).toBe(true);
        }
      });
    });
  });

  test('all fields should have a boolean required property', () => {
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(typeof field.required).toBe('boolean');
      });
    });
  });

  // ── 15. Schema validation ───────────────────────────────────────────────────

  test('should validate against schema structure', () => {
    expect(() => {
      const validatedSchema = loadSchema(schema, 'KOR');
      validateSchemaCompletely(validatedSchema);
    }).not.toThrow();
  });

  test('should be accessible via schema registry', async () => {
    const registrySchema = await getSchemaByCountryCode('KOR');
    expect(registrySchema).not.toBeUndefined();
    expect(registrySchema?.countryCode).toBe('KOR');
  });

  // ── 16. changeDetection ─────────────────────────────────────────────────────

  test('should have changeDetection with non-empty monitoredSelectors', () => {
    expect(schema.changeDetection).not.toBeUndefined();
    expect(Array.isArray(schema.changeDetection.monitoredSelectors)).toBe(true);
    expect(schema.changeDetection.monitoredSelectors.length).toBeGreaterThan(0);
  });

  // ── 17. Auto-fill coverage & countrySpecific declarations ───────────────────

  runSharedSchemaTests(schema);

  // ── 18. K-ETA processing time ────────────────────────────────────────────────

  test('K-ETA processing time should be documented as up to 72 hours', () => {
    // K-ETA approval takes up to 72 hours — travellers must apply well in advance.
    // This is captured in the submissionDeadlineHours and submissionWindowNote.
    expect(schema.submissionDeadlineHours).toBe(72);
    expect(typeof schema.submissionWindowNote).toBe('string');
    expect(schema.submissionWindowNote.toLowerCase()).toContain('processing');
    expect(schema.submissionWindowNote.toLowerCase()).toContain('72');
  });

  test('K-ETA processing time note should appear in submission guide', () => {
    // At least one step in the submission guide should mention the 72-hour processing window
    const guideText = schema.submissionGuide
      .flatMap(step => [step.title, step.description, ...(step.tips ?? [])])
      .join(' ')
      .toLowerCase();
    expect(guideText).toContain('72');
  });
});
