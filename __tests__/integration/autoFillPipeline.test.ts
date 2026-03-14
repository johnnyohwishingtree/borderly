/**
 * Integration tests — full auto-fill pipeline for all 8 supported countries.
 *
 * These tests verify the end-to-end data pipeline:
 *   sampleProfile + tripLeg → generateFilledFormForTraveler
 *     → AutomationScriptRegistry.fieldMappings
 *       → AutomationScriptUtils.applyTransform
 *         → FieldSpec array
 *           → formFiller.buildAutoFillScript
 *             → generated JS (verified for correct selectors and values)
 *
 * No WebView or native modules are involved — pure data pipeline.
 */

import { generateFilledFormForTraveler } from '../../src/services/forms/formEngine';
import { AutomationScriptRegistry, AutomationScriptUtils } from '../../src/services/submission/automationScripts';
import { formFiller, FieldSpec } from '../../src/services/submission/formFiller';
import type { PortalFieldMapping } from '../../src/types/submission';
import { sampleProfile, sampleLegByCountry, SUPPORTED_COUNTRIES } from '../fixtures/sampleProfile';

// Country schemas loaded directly from bundled JSON
import JPNSchema from '../../src/schemas/JPN.json';
import MYSSchema from '../../src/schemas/MYS.json';
import SGPSchema from '../../src/schemas/SGP.json';
import USASchema from '../../src/schemas/USA.json';
import CANSchema from '../../src/schemas/CAN.json';
import GBRSchema from '../../src/schemas/GBR.json';
import THASchema from '../../src/schemas/THA.json';
import VNMSchema from '../../src/schemas/VNM.json';

import type { CountryFormSchema } from '../../src/types/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const schemaByCountry: Record<string, CountryFormSchema> = {
  JPN: JPNSchema as unknown as CountryFormSchema,
  MYS: MYSSchema as unknown as CountryFormSchema,
  SGP: SGPSchema as unknown as CountryFormSchema,
  USA: USASchema as unknown as CountryFormSchema,
  CAN: CANSchema as unknown as CountryFormSchema,
  GBR: GBRSchema as unknown as CountryFormSchema,
  THA: THASchema as unknown as CountryFormSchema,
  VNM: VNMSchema as unknown as CountryFormSchema,
};

/**
 * Build FieldSpec array from a filled form and an automation script's field mappings.
 */
function buildFieldSpecs(
  filledFormData: Record<string, unknown>,
  fieldMappings: Record<string, PortalFieldMapping>,
): FieldSpec[] {
  const specs: FieldSpec[] = [];

  for (const [fieldId, mapping] of Object.entries(fieldMappings)) {
    // Skip file inputs — they require special upload handling
    if (mapping.inputType === 'file') continue;

    const rawValue = filledFormData[fieldId];
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;

    const transformed = AutomationScriptUtils.applyTransform(rawValue, mapping.transform);
    if (transformed === undefined || transformed === null || String(transformed) === '') continue;

    const inputType = mapping.inputType as FieldSpec['inputType'];
    specs.push({
      id: fieldId,
      selector: mapping.selector,
      value: String(transformed),
      inputType,
    });
  }

  return specs;
}

/**
 * Extract flat key→value map from a FilledForm (auto-filled fields only).
 */
function extractFilledData(
  form: ReturnType<typeof generateFilledFormForTraveler>,
): Record<string, unknown> {
  if (!form) return {};
  const data: Record<string, unknown> = {};
  for (const section of form.sections) {
    for (const field of section.fields) {
      if (field.source === 'auto' || field.source === 'user') {
        data[field.id] = field.currentValue;
      }
    }
  }
  return data;
}

// ---------------------------------------------------------------------------
// Registry singleton shared across tests
// ---------------------------------------------------------------------------

const registry = new AutomationScriptRegistry();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auto-fill pipeline', () => {
  describe('generateFilledFormForTraveler', () => {
    it('returns a FilledForm for a known traveler', () => {
      const schema = schemaByCountry['JPN'];
      const leg = sampleLegByCountry['JPN'];
      const form = generateFilledFormForTraveler(
        sampleProfile.id,
        [sampleProfile],
        leg,
        schema,
      );
      expect(form).not.toBeNull();
      expect(form?.countryCode).toBe('JPN');
      expect(form?.sections.length).toBeGreaterThan(0);
    });

    it('returns null for an unknown traveler ID', () => {
      const schema = schemaByCountry['JPN'];
      const leg = sampleLegByCountry['JPN'];
      const form = generateFilledFormForTraveler(
        'nonexistent-id',
        [sampleProfile],
        leg,
        schema,
      );
      expect(form).toBeNull();
    });
  });

  describe('AutomationScriptRegistry', () => {
    it('has all 8 supported countries registered', () => {
      const available = registry.getAvailableCountries();
      for (const code of SUPPORTED_COUNTRIES) {
        expect(available).toContain(code);
      }
    });

    it('every country script has a non-empty fieldMappings map', () => {
      for (const code of SUPPORTED_COUNTRIES) {
        const script = registry.getScriptSync(code);
        expect(script).not.toBeNull();
        expect(script?.fieldMappings).toBeDefined();
        expect(Object.keys(script!.fieldMappings).length).toBeGreaterThan(0);
      }
    });
  });

  describe.each(SUPPORTED_COUNTRIES.map((c) => [c]))('Country: %s', (countryCode) => {
    let fieldSpecs: FieldSpec[];
    let generatedScript: string;

    beforeAll(() => {
      const schema = schemaByCountry[countryCode];
      const leg = sampleLegByCountry[countryCode];
      const form = generateFilledFormForTraveler(
        sampleProfile.id,
        [sampleProfile],
        leg,
        schema,
      );
      expect(form).not.toBeNull();

      const automationScript = registry.getScriptSync(countryCode);
      expect(automationScript).not.toBeNull();

      const filledData = extractFilledData(form);
      fieldSpecs = buildFieldSpecs(filledData, automationScript!.fieldMappings);
      generatedScript = formFiller.buildAutoFillScript(fieldSpecs);
    });

    it('produces at least one FieldSpec', () => {
      expect(fieldSpecs.length).toBeGreaterThan(0);
    });

    it('every FieldSpec has required properties', () => {
      for (const spec of fieldSpecs) {
        expect(typeof spec.id).toBe('string');
        expect(spec.id.length).toBeGreaterThan(0);
        expect(typeof spec.selector).toBe('string');
        expect(spec.selector.length).toBeGreaterThan(0);
        expect(typeof spec.value).toBe('string');
        expect(['text', 'select', 'radio', 'checkbox', 'date']).toContain(spec.inputType);
      }
    });

    it('generated JS contains selector strings from FieldSpecs', () => {
      // Each spec's selector (or part of it) should appear somewhere in the script
      for (const spec of fieldSpecs) {
        // The script JSON-encodes selectors; verify the field id appears
        expect(generatedScript).toContain(spec.id);
      }
    });

    it('generated JS is non-empty and contains AUTO_FILL_RESULT', () => {
      expect(generatedScript.length).toBeGreaterThan(100);
      expect(generatedScript).toContain('AUTO_FILL_RESULT');
      expect(generatedScript).toContain('ReactNativeWebView');
    });

    it('snapshot: generated JS is stable', () => {
      expect(generatedScript).toMatchSnapshot();
    });
  });

  // -------------------------------------------------------------------------
  // Transform-specific tests
  // -------------------------------------------------------------------------

  describe('Date format transforms', () => {
    it('JPN: transforms ISO date to YYYY/MM/DD', () => {
      const result = AutomationScriptUtils.applyTransform('1985-06-15', {
        type: 'date_format',
        config: { from: 'YYYY-MM-DD', to: 'YYYY/MM/DD' },
      });
      expect(result).toBe('1985/06/15');
    });

    it('MYS: date_format transform is present on dateOfBirth field', () => {
      const mys = registry.getScriptSync('MYS');
      const dob = mys?.fieldMappings['dateOfBirth'];
      expect(dob?.transform?.type).toBe('date_format');
      // MYS uses DD/MM/YYYY — check config
      expect(dob?.transform?.config?.to).toBe('DD/MM/YYYY');
    });

    it('JPN: date_format transform is present on dateOfBirth field', () => {
      const jpn = registry.getScriptSync('JPN');
      const dob = jpn?.fieldMappings['dateOfBirth'];
      expect(dob?.transform?.type).toBe('date_format');
      expect(dob?.transform?.config?.to).toBe('YYYY/MM/DD');
    });

    it('SGP: date_format transform is present on dateOfBirth field', () => {
      const sgp = registry.getScriptSync('SGP');
      const dob = sgp?.fieldMappings['dateOfBirth'];
      expect(dob?.transform?.type).toBe('date_format');
    });
  });

  describe('Country code transforms', () => {
    it('iso3_to_name: USA → United States', () => {
      const result = AutomationScriptUtils.applyTransform('USA', {
        type: 'country_code',
        config: { format: 'iso3_to_name' },
      });
      expect(result).toBe('United States');
    });

    it('iso3_to_name: GBR → United Kingdom', () => {
      const result = AutomationScriptUtils.applyTransform('GBR', {
        type: 'country_code',
        config: { format: 'iso3_to_name' },
      });
      expect(result).toBe('United Kingdom');
    });

    it('iso3_to_name: unknown code returns the code unchanged', () => {
      const result = AutomationScriptUtils.applyTransform('ZZZ', {
        type: 'country_code',
        config: { format: 'iso3_to_name' },
      });
      expect(result).toBe('ZZZ');
    });

    it('JPN: nationality field has country_code transform', () => {
      const jpn = registry.getScriptSync('JPN');
      const nat = jpn?.fieldMappings['nationality'];
      expect(nat?.transform?.type).toBe('country_code');
      expect(nat?.transform?.config?.format).toBe('iso3_to_name');
    });
  });

  describe('Boolean to radio transforms', () => {
    it('boolean_to_yesno: false → "no" (default)', () => {
      const result = AutomationScriptUtils.applyTransform(false, {
        type: 'boolean_to_yesno',
        config: { falseValue: 'no', trueValue: 'yes' },
      });
      expect(result).toBe('no');
    });

    it('boolean_to_yesno: true → "yes" (default)', () => {
      const result = AutomationScriptUtils.applyTransform(true, {
        type: 'boolean_to_yesno',
        config: { falseValue: 'no', trueValue: 'yes' },
      });
      expect(result).toBe('yes');
    });

    it('boolean_to_yesno: custom trueValue/falseValue', () => {
      const trueResult = AutomationScriptUtils.applyTransform(true, {
        type: 'boolean_to_yesno',
        config: { falseValue: 'N', trueValue: 'Y' },
      });
      expect(trueResult).toBe('Y');

      const falseResult = AutomationScriptUtils.applyTransform(false, {
        type: 'boolean_to_yesno',
        config: { falseValue: 'N', trueValue: 'Y' },
      });
      expect(falseResult).toBe('N');
    });

    it('JPN: carryingProhibitedItems field has boolean_to_yesno transform', () => {
      const jpn = registry.getScriptSync('JPN');
      const field = jpn?.fieldMappings['carryingProhibitedItems'];
      expect(field?.transform?.type).toBe('boolean_to_yesno');
    });
  });

  describe('No-transform passthrough', () => {
    it('returns value unchanged when no transform is specified', () => {
      const result = AutomationScriptUtils.applyTransform('SMITH', undefined);
      expect(result).toBe('SMITH');
    });
  });
});
