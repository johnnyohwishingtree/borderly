import { CountryFormSchema } from '../../src/types/schema';
import { validateSchemaCompletely, loadSchema } from '../../src/services/schemas/schemaLoader';
import { getSchemaByCountryCode } from '../../src/schemas';
import NZL from '../../src/schemas/NZL.json';
import { runSharedSchemaTests } from './sharedSchemaTests';

describe('New Zealand (NZL) Schema', () => {
  const schema = NZL as CountryFormSchema;

  // ── 1. Schema structure fields ──────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('NZL');
    expect(schema.countryName).toBe('New Zealand');
    expect(schema.portalName).toBe('New Zealand Traveller Declaration (NZTD)');
    expect(schema.portalUrl).toBe('https://www.nztravellerdeclaration.govt.nz');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have lastUpdated in ISO format', () => {
    expect(schema.lastUpdated).toBeDefined();
    expect(() => new Date(schema.lastUpdated)).not.toThrow();
  });

  test('should have implementationStatus set to complete', () => {
    expect(schema.metadata).toBeDefined();
    expect(schema.metadata.implementationStatus).toBe('complete');
  });

  test('should have metadata with expected fields', () => {
    const metadata = schema.metadata;
    expect(metadata.supportedLanguages).toContain('en');
    expect(metadata.maintenanceFrequency).toBe('quarterly');
  });

  // ── 2. Submission timing ────────────────────────────────────────────────────

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).toBeDefined();
    expect(schema.submission.latestBeforeArrival).toBe('24h');
    expect(schema.submission.recommended).toBe('48h');
  });

  test('submissionDeadlineHours should be 24', () => {
    expect(schema.submissionDeadlineHours).toBe(24);
  });

  test('recommendedLeadTimeHours should be 72', () => {
    expect(schema.recommendedLeadTimeHours).toBe(72);
  });

  test('submissionWindowNote should describe the 24h window', () => {
    expect(schema.submissionWindowNote).toBeDefined();
    expect(schema.submissionWindowNote.toLowerCase()).toContain('24');
  });

  // ── 3. Passport validity ────────────────────────────────────────────────────

  test('passportValidityMonths should be 3', () => {
    expect(schema.passportValidityMonths).toBe(3);
  });

  // ── 4. Portal flow ──────────────────────────────────────────────────────────

  test('portalFlow should have requiresAccount set to false', () => {
    expect(schema.portalFlow).toBeDefined();
    expect(schema.portalFlow.requiresAccount).toBe(false);
  });

  test('portalFlow should have family policy with no account requirement', () => {
    const portalFlow = schema.portalFlow;
    expect(portalFlow.familyPolicy).toBeDefined();
    expect(portalFlow.familyPolicy!.type).toBe('none');
    expect(portalFlow.familyPolicy!.description).toContain('No account required');
  });

  test('portalFlow should have prerequisites', () => {
    expect(schema.portalFlow.prerequisites).toBeDefined();
    expect(schema.portalFlow.prerequisites!.length).toBeGreaterThanOrEqual(2);

    const prereqDescriptions = schema.portalFlow.prerequisites!.map(p => p.description);
    expect(prereqDescriptions.some(d => d.toLowerCase().includes('passport'))).toBe(true);
  });

  // ── 5. Sections ─────────────────────────────────────────────────────────────

  test('should have all required sections', () => {
    expect(schema.sections.length).toBeGreaterThanOrEqual(5);

    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('address');
    expect(sectionIds).toContain('biosecurity');
    expect(sectionIds).toContain('goods');
  });

  // ── 6. Personal section ─────────────────────────────────────────────────────

  test('personal section should have core passport fields with autoFillSource', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal');
    expect(personalSection).toBeDefined();

    const fieldIds = personalSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('familyName');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportExpiry');
    expect(fieldIds).toContain('email');
  });

  test('personal fields should have autoFillSource mapped to profile paths', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;

    const familyNameField = personalSection.fields.find(f => f.id === 'familyName')!;
    expect(familyNameField.autoFillSource).toBe('profile.surname');

    const givenNamesField = personalSection.fields.find(f => f.id === 'givenNames')!;
    expect(givenNamesField.autoFillSource).toBe('profile.givenNames');

    const dobField = personalSection.fields.find(f => f.id === 'dateOfBirth')!;
    expect(dobField.autoFillSource).toBe('profile.dateOfBirth');

    const passportField = personalSection.fields.find(f => f.id === 'passportNumber')!;
    expect(passportField.autoFillSource).toBe('profile.passportNumber');

    const expiryField = personalSection.fields.find(f => f.id === 'passportExpiry')!;
    expect(expiryField.autoFillSource).toBe('profile.passportExpiry');
  });

  test('gender field should be a select with male/female/other options', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const genderField = personalSection.fields.find(f => f.id === 'gender')!;

    expect(genderField).toBeDefined();
    expect(genderField.type).toBe('select');
    expect(genderField.autoFillSource).toBe('profile.gender');

    const values = genderField.options!.map(o => o.value);
    expect(values).toContain('M');
    expect(values).toContain('F');
    expect(values).toContain('X');
  });

  test('email field should auto-fill from profile', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const emailField = personalSection.fields.find(f => f.id === 'email')!;
    expect(emailField).toBeDefined();
    expect(emailField.autoFillSource).toBe('profile.email');
  });

  // ── 7. Travel section ───────────────────────────────────────────────────────

  test('travel section should have NZTD-specific fields', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).toBeDefined();

    const fieldIds = travelSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('flightNumber');
    expect(fieldIds).toContain('arrivalDate');
    expect(fieldIds).toContain('arrivalAirport');
    expect(fieldIds).toContain('purposeOfVisit');
    expect(fieldIds).toContain('departureCountry');
  });

  test('flightNumber should auto-fill from leg', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const flightField = travelSection.fields.find(f => f.id === 'flightNumber')!;
    expect(flightField.autoFillSource).toBe('leg.flightNumber');
  });

  test('arrivalDate should auto-fill from leg', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const arrivalField = travelSection.fields.find(f => f.id === 'arrivalDate')!;
    expect(arrivalField.autoFillSource).toBe('leg.arrivalDate');
  });

  test('purposeOfVisit should include holiday, business, and transit options', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfVisit')!;

    expect(purposeField).toBeDefined();
    expect(purposeField.type).toBe('select');
    expect(purposeField.countrySpecific).toBe(true);

    const values = purposeField.options!.map(o => o.value);
    expect(values).toContain('holiday');
    expect(values).toContain('business');
    expect(values).toContain('transit');
  });

  test('departureCountry should be a country-specific searchable select', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const departureField = travelSection.fields.find(f => f.id === 'departureCountry')!;

    expect(departureField).toBeDefined();
    expect(departureField.type).toBe('searchable_select');
    expect(departureField.countrySpecific).toBe(true);
  });

  // ── 8. Address section ──────────────────────────────────────────────────────

  test('address section should have NZ address fields', () => {
    const addressSection = schema.sections.find(s => s.id === 'address');
    expect(addressSection).toBeDefined();

    const fieldIds = addressSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('nzAddressLine1');
    expect(fieldIds).toContain('nzAddressCity');
  });

  test('address fields should auto-fill from leg accommodation', () => {
    const addressSection = schema.sections.find(s => s.id === 'address')!;

    const line1Field = addressSection.fields.find(f => f.id === 'nzAddressLine1')!;
    expect(line1Field.autoFillSource).toBe('leg.accommodation.address.line1');

    const cityField = addressSection.fields.find(f => f.id === 'nzAddressCity')!;
    expect(cityField.autoFillSource).toBe('leg.accommodation.address.city');
  });

  // ── 9. Biosecurity declarations ─────────────────────────────────────────────

  test('biosecurity section should have all biosecurity declaration fields', () => {
    const biosecuritySection = schema.sections.find(s => s.id === 'biosecurity');
    expect(biosecuritySection).toBeDefined();

    const fieldIds = biosecuritySection!.fields.map(f => f.id);
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

  // ── 10. Goods declarations ──────────────────────────────────────────────────

  test('goods section should have goods declaration fields', () => {
    const goodsSection = schema.sections.find(s => s.id === 'goods');
    expect(goodsSection).toBeDefined();

    const fieldIds = goodsSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('hasCurrencyOver10000');
    expect(fieldIds).toContain('hasControlledItems');
    expect(fieldIds).toContain('hasGoodsExceedingAllowance');
  });

  test('currency declaration should mention NZD 10,000', () => {
    const goodsSection = schema.sections.find(s => s.id === 'goods')!;
    const currencyField = goodsSection.fields.find(f => f.id === 'hasCurrencyOver10000')!;

    expect(currencyField).toBeDefined();
    expect(currencyField.type).toBe('boolean');
    expect(currencyField.label).toContain('10,000');
    expect(currencyField.countrySpecific).toBe(true);
  });

  test('goods fields should be boolean and country-specific', () => {
    const goodsSection = schema.sections.find(s => s.id === 'goods')!;

    goodsSection.fields.forEach(field => {
      expect(field.type).toBe('boolean');
      expect(field.countrySpecific).toBe(true);
      expect(field.required).toBe(true);
    });
  });

  // ── 11. Submission guide ────────────────────────────────────────────────────

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

  // ── 12. Field ID uniqueness ─────────────────────────────────────────────────

  test('should have unique field IDs across all sections', () => {
    const allFieldIds = new Set<string>();

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(allFieldIds.has(field.id)).toBe(false);
        allFieldIds.add(field.id);
      });
    });
  });

  // ── 13. autoFillSource validity ─────────────────────────────────────────────

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

  // ── 14. Schema validation ───────────────────────────────────────────────────

  test('should validate against schema structure', () => {
    expect(() => {
      const validatedSchema = loadSchema(schema, 'NZL');
      validateSchemaCompletely(validatedSchema);
    }).not.toThrow();
  });

  test('should be accessible via schema registry', async () => {
    const registrySchema = await getSchemaByCountryCode('NZL');
    expect(registrySchema).toBeDefined();
    expect(registrySchema?.countryCode).toBe('NZL');
  });

  // ── 15. changeDetection ─────────────────────────────────────────────────────

  test('should have changeDetection with non-empty monitoredSelectors', () => {
    expect(schema.changeDetection).toBeDefined();
    expect(Array.isArray(schema.changeDetection.monitoredSelectors)).toBe(true);
    expect(schema.changeDetection.monitoredSelectors.length).toBeGreaterThan(0);
  });

  // ── 16. Auto-fill coverage & countrySpecific declarations ───────────────────

  runSharedSchemaTests(schema);
});
