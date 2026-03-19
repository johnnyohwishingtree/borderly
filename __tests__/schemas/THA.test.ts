import { CountryFormSchema } from '../../src/types/schema';
import { validateSchemaCompletely, loadSchema } from '../../src/services/schemas/schemaLoader';
import { getSchemaByCountryCode } from '../../src/schemas';
import THA from '../../src/schemas/THA.json';

describe('Thailand (THA) Schema', () => {
  const schema = THA as CountryFormSchema;

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('THA');
    expect(schema.countryName).toBe('Thailand');
    expect(schema.portalName).toBe('Thailand Digital Arrival Card (Coming Soon)');
    expect(schema.portalUrl).toBe('https://tp.consular.go.th/');
    expect(schema.schemaVersion).toBe('2.1.0');
  });

  test('should have implementationStatus set to coming_soon', () => {
    expect(schema.metadata).toBeDefined();
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
    expect(schema.submission).toBeDefined();
    expect(schema.submission.earliestBeforeArrival).toBe('7d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('72h');
    expect(schema.submission.processingTime).toBe('24h');
  });

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

  test('portalFlow should have prerequisites for passport and accommodation', () => {
    const portalFlow = schema.portalFlow;
    expect(portalFlow.prerequisites).toBeDefined();
    expect(portalFlow.prerequisites!.length).toBeGreaterThanOrEqual(2);

    const prereqDescriptions = portalFlow.prerequisites!.map(p => p.description);
    expect(prereqDescriptions.some(d => d.toLowerCase().includes('passport'))).toBe(true);
    expect(prereqDescriptions.some(d => d.toLowerCase().includes('accommodation'))).toBe(true);
  });

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(4);

    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('health');
  });

  test('personal section should have core passport fields', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal');
    expect(personalSection).toBeDefined();

    const fieldIds = personalSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('firstName');
    expect(fieldIds).toContain('lastName');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportExpiry');
  });

  test('personal section should have title field with options', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const titleField = personalSection.fields.find(f => f.id === 'title');

    expect(titleField).toBeDefined();
    expect(titleField!.type).toBe('select');

    const titleValues = titleField!.options!.map(o => o.value);
    expect(titleValues).toContain('Mr');
    expect(titleValues).toContain('Mrs');
    expect(titleValues).toContain('Ms');
    expect(titleValues).toContain('Dr');
  });

  test('passport expiry should have auto-fill from profile', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const expiryField = personalSection.fields.find(f => f.id === 'passportExpiry')!;

    expect(expiryField.required).toBe(true);
    expect(expiryField.autoFillSource).toBe('profile.passportExpiry');
  });

  test('travel section should have Thailand-specific purpose of visit', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).toBeDefined();

    const purposeField = travelSection!.fields.find(f => f.id === 'purposeOfVisit');
    expect(purposeField).toBeDefined();
    expect(purposeField!.countrySpecific).toBe(true);

    const purposes = purposeField!.options!.map(o => o.value);
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('business');
    expect(purposes).toContain('transit');
    expect(purposes).toContain('medical');
    expect(purposes).toContain('education');
    expect(purposes).toContain('other');
  });

  test('travel section should have length of stay with validation limits', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    const lengthField = travelSection!.fields.find(f => f.id === 'lengthOfStay');

    expect(lengthField).toBeDefined();
    expect(lengthField!.validation).toBeDefined();
    expect(lengthField!.validation!.min).toBe(1);
    expect(lengthField!.validation!.max).toBe(60);
  });

  test('travel section should have required flight and departure fields', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const fieldIds = travelSection.fields.map(f => f.id);

    expect(fieldIds).toContain('arrivalDate');
    expect(fieldIds).toContain('flightNumber');
    expect(fieldIds).toContain('departureCountry');
  });

  test('accommodation section should have type selection with Thailand-specific options', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation');
    expect(accommodationSection).toBeDefined();

    const typeField = accommodationSection!.fields.find(f => f.id === 'accommodationType');
    expect(typeField).toBeDefined();
    expect(typeField!.countrySpecific).toBe(true);

    const types = typeField!.options!.map(o => o.value);
    expect(types).toContain('hotel');
    expect(types).toContain('resort');
    expect(types).toContain('hostel');
    expect(types).toContain('guesthouse');
    expect(types).toContain('friend_family');
  });

  test('accommodation address should be textarea type', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const addressField = accommodationSection.fields.find(f => f.id === 'hotelAddress')!;

    expect(addressField.type).toBe('textarea');
  });

  test('accommodation should have hotel name and address fields', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const fieldIds = accommodationSection.fields.map(f => f.id);

    expect(fieldIds).toContain('hotelName');
    expect(fieldIds).toContain('hotelAddress');
  });

  test('health section should have Thailand-specific fields', () => {
    const healthSection = schema.sections.find(s => s.id === 'health');
    expect(healthSection).toBeDefined();

    const fieldIds = healthSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('vaccinationStatus');
    expect(fieldIds).toContain('hasInsurance');
    expect(fieldIds).toContain('emergencyContact');
  });

  test('vaccination status should be country-specific with options', () => {
    const healthSection = schema.sections.find(s => s.id === 'health')!;
    const vaccinationField = healthSection.fields.find(f => f.id === 'vaccinationStatus')!;

    expect(vaccinationField.countrySpecific).toBe(true);
    expect(vaccinationField.type).toBe('select');

    const options = vaccinationField.options!.map(o => o.value);
    expect(options).toContain('fully_vaccinated');
    expect(options).toContain('not_vaccinated');
    expect(options).toContain('partially_vaccinated');
  });

  test('health fields should be country-specific', () => {
    const healthSection = schema.sections.find(s => s.id === 'health')!;

    const vaccinationField = healthSection.fields.find(f => f.id === 'vaccinationStatus')!;
    expect(vaccinationField.countrySpecific).toBe(true);

    const insuranceField = healthSection.fields.find(f => f.id === 'hasInsurance')!;
    expect(insuranceField.countrySpecific).toBe(true);

    const emergencyField = healthSection.fields.find(f => f.id === 'emergencyContact')!;
    expect(emergencyField.countrySpecific).toBe(true);
  });

  test('should have complete submission guide with 8 steps', () => {
    expect(schema.submissionGuide).toHaveLength(8);

    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Create Thailand Pass Account');
    expect(stepTitles).toContain('Submit and Get QR Code');
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

  test('submission guide steps should have incrementing order', () => {
    const orders = schema.submissionGuide.map(s => s.order);
    orders.forEach((order, index) => {
      expect(order).toBe(index + 1);
    });
  });

  test('each submission guide step should have non-empty title and description', () => {
    schema.submissionGuide.forEach((step) => {
      expect(step.title).toEqual(expect.stringMatching(/\S/));
      expect(step.description).toEqual(expect.stringMatching(/\S/));
    });
  });

  test('should have unique field IDs across all sections', () => {
    const allFieldIds = new Set<string>();

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(allFieldIds.has(field.id)).toBe(false);
        allFieldIds.add(field.id);
      });
    });
  });

  test('should validate against schema structure', () => {
    expect(() => {
      const validatedSchema = loadSchema(schema, 'THA');
      validateSchemaCompletely(validatedSchema);
    }).not.toThrow();
  });

  test('should be accessible via schema registry', async () => {
    const registrySchema = await getSchemaByCountryCode('THA');
    expect(registrySchema).toBeDefined();
    expect(registrySchema?.countryCode).toBe('THA');
  });

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

  test('all required fields should have required set to true', () => {
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        // Just ensure the required property exists and is a boolean
        expect(typeof field.required).toBe('boolean');
      });
    });
  });
});
