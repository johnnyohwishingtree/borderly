import { validateSchemaCompletely, loadSchema } from '../../src/services/schemas/schemaLoader';
import { getSchemaByCountryCode } from '../../src/schemas';
import MYS from '../../src/schemas/MYS.json';
import * as fs from 'fs';
import * as path from 'path';

describe('Malaysia (MYS) Schema', () => {
  const schema = MYS;

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('MYS');
    expect(schema.countryName).toBe('Malaysia');
    expect(schema.portalName).toBe('Malaysia Digital Arrival Card (MDAC)');
    expect(schema.portalUrl).toBe('https://imigresen-online.imi.gov.my/mdac/main');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).toBeDefined();
    expect(schema.submission.earliestBeforeArrival).toBe('3d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('24h');
  });

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(4);

    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('health_declarations');
  });

  test('personal information section should include email and phone', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal');
    expect(personalSection).toBeDefined();

    const fieldIds = personalSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('email');
    expect(fieldIds).toContain('phoneNumber');
    expect(fieldIds).toContain('passportExpiry');
  });

  test('travel section should have Malaysia-specific ports of entry', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).toBeDefined();

    const airportField = travelSection!.fields.find(f => f.id === 'arrivalAirport');
    expect(airportField).toBeDefined();
    expect(airportField!.countrySpecific).toBe(true);
    expect((airportField as any).options!.length).toBeGreaterThan(5);

    const airportCodes = (airportField as any).options!.map((o: any) => o.value);
    expect(airportCodes).toContain('KUL');
    expect(airportCodes).toContain('KUA');
    expect(airportCodes).toContain('PEN');
  });

  test('purpose of visit should have Malaysia-specific options', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    const purposeField = travelSection!.fields.find(f => f.id === 'purposeOfVisit');

    expect(purposeField).toBeDefined();
    expect(purposeField!.countrySpecific).toBe(true);

    const purposes = (purposeField as any).options!.map((o: any) => o.value);
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('visiting_family');
    expect(purposes).toContain('medical');
  });

  test('should have health declaration section', () => {
    const healthSection = schema.sections.find(s => s.id === 'health_declarations');
    expect(healthSection).toBeDefined();

    const fieldIds = healthSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('healthCondition');
    expect(fieldIds).toContain('visitedHighRiskCountries');
  });

  test('currency declaration should have Malaysia-specific threshold', () => {
    const healthSection = schema.sections.find(s => s.id === 'health_declarations');
    const currencyField = healthSection!.fields.find(f => f.id === 'carryingCurrency');

    expect(currencyField).toBeDefined();
    expect(currencyField!.label).toContain('RM10,000');
    expect((currencyField as any).helpText).toContain('Malaysian Ringgit');
  });

  test('duration of stay should have validation limits', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    const durationField = travelSection!.fields.find(f => f.id === 'durationOfStay');

    expect(durationField).toBeDefined();
    expect((durationField as any).validation).toBeDefined();
    expect((durationField as any).validation!.min).toBe(1);
    expect((durationField as any).validation!.max).toBe(90);
  });

  test('should have complete submission guide', () => {
    expect(schema.submissionGuide).toHaveLength(6);

    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Access MDAC Portal');
    expect(stepTitles).toContain('Submit and Save');
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

  test('email field should have validation pattern', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const emailField = personalSection.fields.find(f => f.id === 'email')!;

    expect((emailField as any).validation).toBeDefined();
    expect((emailField as any).validation!.pattern).toBeDefined();
    expect((emailField as any).validation!.pattern).toContain('@');
  });

  test('should validate against schema structure', () => {
    expect(() => {
      const validatedSchema = loadSchema(schema, 'MYS');
      validateSchemaCompletely(validatedSchema);
    }).not.toThrow();
  });

  test('should be accessible via schema registry', async () => {
    const registrySchema = await getSchemaByCountryCode('MYS');
    expect(registrySchema).toBeDefined();
    expect(registrySchema?.countryCode).toBe('MYS');
  });

  test('health fields should be country-specific', () => {
    const healthSection = schema.sections.find(s => s.id === 'health_declarations')!;

    const healthField = healthSection.fields.find(f => f.id === 'healthCondition')!;
    expect(healthField.countrySpecific).toBe(true);

    const riskField = healthSection.fields.find(f => f.id === 'visitedHighRiskCountries')!;
    expect(riskField.countrySpecific).toBe(true);
  });

  test('accommodation should support textarea for address', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const addressField = accommodationSection.fields.find(f => f.id === 'hotelAddress')!;

    expect(addressField.type).toBe('textarea');
  });
});

describe('Malaysia (MYS) Portal Field Mappings', () => {
  const schema = MYS;
  const scriptPath = path.resolve(__dirname, '../../assets/automation/scripts/MYS.js');

  test('MYS.js automation script file exists', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('MYS.js script contains required exports: portalUrl', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('portalUrl');
    expect(content).toContain('imigresen-online.imi.gov.my');
  });

  test('MYS.js script contains required exports: fieldMappings', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('fieldMappings');
  });

  test('MYS.js script contains required exports: pageDetectors', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('pageDetectors');
  });

  test('MYS.js script contains required exports: submitButtonSelector', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('submitButtonSelector');
  });

  test('MYS.js script handles all multi-step flow steps', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('landing');
    expect(content).toContain('personal_info');
    expect(content).toContain('travel_details');
    expect(content).toContain('accommodation');
    expect(content).toContain('health_declarations');
    expect(content).toContain('confirmation');
  });

  test('MYS.js fieldMappings covers all portal-visible fields in schema', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');

    const portalFields = new Set<string>();
    schema.submissionGuide.forEach(step => {
      step.fieldsOnThisScreen.forEach((fieldId: string) => {
        portalFields.add(fieldId);
      });
    });

    portalFields.forEach(fieldId => {
      expect(content).toContain(`${fieldId}:`);
    });
  });

  test('all fields with portalFieldName should also have portalSelector', () => {
    schema.sections.forEach(section => {
      section.fields.forEach((field: any) => {
        if (field.portalFieldName) {
          expect(field.portalSelector).toBeDefined();
          expect(typeof field.portalSelector).toBe('string');
          expect(field.portalSelector.length).toBeGreaterThan(0);
        }
      });
    });
  });

  test('portalSelector values should contain valid CSS selector patterns', () => {
    schema.sections.forEach(section => {
      section.fields.forEach((field: any) => {
        if (field.portalSelector) {
          const hasValidPattern = (
            field.portalSelector.includes('input[') ||
            field.portalSelector.includes('select[') ||
            field.portalSelector.includes('textarea[') ||
            field.portalSelector.startsWith('#') ||
            field.portalSelector.includes(', #')
          );
          expect(hasValidPattern).toBe(true);
        }
      });
    });
  });

  test('MYS.js script registers with BorderlyAutomation', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain("registerCountry('MYS'");
    expect(content).toContain('BorderlyAutomation.Malaysia');
  });

  test('MYS.js does not require account creation (MDAC is account-free)', () => {
    expect(schema.portalFlow.requiresAccount).toBe(false);
    const content = fs.readFileSync(scriptPath, 'utf8');
    // Should handle landing page but not account registration
    expect(content).not.toContain('handleRegistration');
    expect(content).not.toContain('handleLogin');
  });

  test('MYS.js handles confirmation and notifies React Native', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('malaysia_mdac_success');
    expect(content).toContain('ReactNativeWebView');
  });
});
