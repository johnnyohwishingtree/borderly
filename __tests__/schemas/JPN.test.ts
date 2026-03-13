import { validateSchemaCompletely, loadSchema } from '../../src/services/schemas/schemaLoader';
import { getSchemaByCountryCode } from '../../src/schemas';
import JPN from '../../src/schemas/JPN.json';
import * as fs from 'fs';
import * as path from 'path';

describe('Japan (JPN) Schema', () => {
  const schema = JPN;

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('JPN');
    expect(schema.countryName).toBe('Japan');
    expect(schema.portalName).toBe('Visit Japan Web');
    expect(schema.portalUrl).toBe('https://vjw-lp.digital.go.jp/en/');
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).toBeDefined();
    expect(schema.submission.earliestBeforeArrival).toBe('14d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('72h');
  });

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(4);

    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('customs_declarations');
  });

  test('personal information section should have required fields', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal');
    expect(personalSection).toBeDefined();

    const fieldIds = personalSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('gender');
  });

  test('travel section should have Japan-specific fields', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).toBeDefined();

    const purposeField = travelSection!.fields.find(f => f.id === 'purposeOfVisit');
    expect(purposeField).toBeDefined();
    expect(purposeField!.countrySpecific).toBe(true);
    expect(purposeField!.options).toHaveLength(5);
    expect(purposeField!.options!.map(o => o.value)).toContain('tourism');
    expect(purposeField!.options!.map(o => o.value)).toContain('business');
  });

  test('customs declarations should have Japan-specific currency threshold', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs_declarations');
    expect(customsSection).toBeDefined();

    const currencyField = customsSection!.fields.find(f => f.id === 'currencyOver1M');
    expect(currencyField).toBeDefined();
    expect(currencyField!.countrySpecific).toBe(true);
    expect(currencyField!.label).toContain('¥1,000,000');
    expect((currencyField as any).helpText).toContain('Japan-specific threshold');
  });

  test('should have meat products prohibition field', () => {
    const customsSection = schema.sections.find(s => s.id === 'customs_declarations');
    const meatField = customsSection!.fields.find(f => f.id === 'meatProducts');

    expect(meatField).toBeDefined();
    expect(meatField!.countrySpecific).toBe(true);
    expect((meatField as any).helpText).toContain('strictly prohibits all meat products');
  });

  test('should have complete submission guide', () => {
    expect(schema.submissionGuide).toHaveLength(6);

    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Create Account on Visit Japan Web');
    expect(stepTitles).toContain('Get Your QR Code');
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

  test('should have auto-fill mappings for common fields', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;

    const surnameField = personalSection.fields.find(f => f.id === 'surname')!;
    expect(surnameField.autoFillSource).toBe('profile.surname');
    expect(surnameField.countrySpecific).toBe(false);

    const passportField = personalSection.fields.find(f => f.id === 'passportNumber')!;
    expect(passportField.autoFillSource).toBe('profile.passportNumber');
    expect(passportField.countrySpecific).toBe(false);
  });

  test('should validate against schema structure', () => {
    expect(() => {
      const validatedSchema = loadSchema(schema, 'JPN');
      validateSchemaCompletely(validatedSchema);
    }).not.toThrow();
  });

  test('should be accessible via schema registry', async () => {
    const registrySchema = await getSchemaByCountryCode('JPN');
    expect(registrySchema).toBeDefined();
    expect(registrySchema?.countryCode).toBe('JPN');
  });

  test('should have unique field IDs within each section', () => {
    const allFieldIds = new Set<string>();

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(allFieldIds.has(field.id)).toBe(false);
        allFieldIds.add(field.id);
      });
    });
  });

  test('required fields should be marked correctly', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    personalSection.fields.forEach(field => {
      expect(field.required).toBe(true);
    });

    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const phoneField = accommodationSection.fields.find(f => f.id === 'hotelPhone')!;
    expect(phoneField.required).toBe(false);
  });
});

describe('Japan (JPN) Portal Field Mappings', () => {
  const schema = JPN;
  const scriptPath = path.resolve(__dirname, '../../assets/automation/scripts/JPN.js');

  test('JPN.js automation script file exists', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('JPN.js script contains required exports: portalUrl', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('portalUrl');
    expect(content).toContain('vjw-lp.digital.go.jp');
  });

  test('JPN.js script contains required exports: fieldMappings', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('fieldMappings');
  });

  test('JPN.js script contains required exports: pageDetectors', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('pageDetectors');
  });

  test('JPN.js script contains required exports: submitButtonSelector', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('submitButtonSelector');
  });

  test('JPN.js script handles all multi-page flow steps', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    // Verify all 6 submission guide steps are handled
    expect(content).toContain('account_creation');
    expect(content).toContain('personal_info');
    expect(content).toContain('trip_registration');
    expect(content).toContain('accommodation');
    expect(content).toContain('customs_declaration');
    expect(content).toContain('qr_code');
  });

  test('JPN.js fieldMappings covers all portal-visible fields in schema', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');

    // All fields that appear in submissionGuide fieldsOnThisScreen should be in fieldMappings
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
          // Should reference either input, select, textarea, or id/name selectors
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

  test('JPN.js script registers with BorderlyAutomation', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain("registerCountry('JPN'");
    expect(content).toContain('BorderlyAutomation.Japan');
  });

  test('JPN.js script handles QR code extraction', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('qr_code');
    expect(content).toContain('japan_vjw_qr_code');
    expect(content).toContain('ReactNativeWebView');
  });
});
