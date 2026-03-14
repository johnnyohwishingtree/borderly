/**
 * Integration tests for the full auto-fill pipeline.
 *
 * Covers: profile → form engine → field mappings → FieldSpec → JS script generation.
 * No real WebView is required — these tests validate the data pipeline only.
 */

import {
  generateFilledFormForTraveler,
} from '../../src/services/forms/formEngine';
import {
  automationScriptRegistry,
  AutomationScriptUtils,
} from '../../src/services/submission/automationScripts';
import { FormFiller, FieldSpec } from '../../src/services/submission/formFiller';
import { sampleProfile, sampleLegByCountry, SUPPORTED_COUNTRIES, SupportedCountry } from '../fixtures/sampleProfile';

import JPN_SCHEMA from '../../src/schemas/JPN.json';
import MYS_SCHEMA from '../../src/schemas/MYS.json';
import SGP_SCHEMA from '../../src/schemas/SGP.json';
import THA_SCHEMA from '../../src/schemas/THA.json';
import VNM_SCHEMA from '../../src/schemas/VNM.json';
import GBR_SCHEMA from '../../src/schemas/GBR.json';
import USA_SCHEMA from '../../src/schemas/USA.json';
import CAN_SCHEMA from '../../src/schemas/CAN.json';
import { CountryFormSchema } from '../../src/types/schema';

const SCHEMAS: Record<SupportedCountry, CountryFormSchema> = {
  JPN: JPN_SCHEMA as CountryFormSchema,
  MYS: MYS_SCHEMA as CountryFormSchema,
  SGP: SGP_SCHEMA as CountryFormSchema,
  THA: THA_SCHEMA as CountryFormSchema,
  VNM: VNM_SCHEMA as CountryFormSchema,
  GBR: GBR_SCHEMA as CountryFormSchema,
  USA: USA_SCHEMA as CountryFormSchema,
  CAN: CAN_SCHEMA as CountryFormSchema,
};

// ---------------------------------------------------------------------------
// generateFilledFormForTraveler
// ---------------------------------------------------------------------------

describe('generateFilledFormForTraveler', () => {
  it('returns a filled form for a known traveler', () => {
    const form = generateFilledFormForTraveler(
      sampleProfile.id,
      [sampleProfile],
      sampleLegByCountry.JPN,
      SCHEMAS.JPN,
    );

    expect(form).not.toBeNull();
    expect(form!.countryCode).toBe('JPN');
    expect(form!.sections.length).toBeGreaterThan(0);
    expect(form!.stats.totalFields).toBeGreaterThan(0);
  });

  it('returns null for an unknown traveler ID', () => {
    const form = generateFilledFormForTraveler(
      'non-existent-id',
      [sampleProfile],
      sampleLegByCountry.JPN,
      SCHEMAS.JPN,
    );

    expect(form).toBeNull();
  });

  it('auto-fills surname from profile', () => {
    const form = generateFilledFormForTraveler(
      sampleProfile.id,
      [sampleProfile],
      sampleLegByCountry.JPN,
      SCHEMAS.JPN,
    );

    expect(form).not.toBeNull();
    const allFields = form!.sections.flatMap((s) => s.fields);
    const surnameField = allFields.find((f) => f.id === 'surname');

    if (surnameField) {
      expect(surnameField.currentValue).toBe('SMITH');
      expect(surnameField.source).toBe('auto');
    }
  });
});

// ---------------------------------------------------------------------------
// AutomationScriptRegistry — all 8 countries registered
// ---------------------------------------------------------------------------

describe('AutomationScriptRegistry', () => {
  it('has all 8 supported countries registered', () => {
    const available = automationScriptRegistry.getAvailableCountries();
    for (const code of SUPPORTED_COUNTRIES) {
      expect(available).toContain(code);
    }
  });

  it.each(SUPPORTED_COUNTRIES)('has non-empty fieldMappings for %s', (code) => {
    const script = automationScriptRegistry.getScriptSync(code);
    expect(script).not.toBeNull();
    expect(Object.keys(script!.fieldMappings).length).toBeGreaterThan(0);
  });

  it.each(SUPPORTED_COUNTRIES)('has a valid portalUrl for %s', (code) => {
    const script = automationScriptRegistry.getScriptSync(code);
    expect(script).not.toBeNull();
    expect(script!.portalUrl).toMatch(/^https?:\/\//);
  });
});

// ---------------------------------------------------------------------------
// FieldSpec building and script generation per country
// ---------------------------------------------------------------------------

describe('Auto-fill script generation', () => {
  let filler: FormFiller;

  beforeEach(() => {
    filler = new FormFiller();
  });

  it.each(SUPPORTED_COUNTRIES)('generates valid JS for %s', (code) => {
    const script = automationScriptRegistry.getScriptSync(code);
    expect(script).not.toBeNull();

    const fieldMappings = script!.fieldMappings;
    const specs: FieldSpec[] = Object.values(fieldMappings).map((m) => ({
      id: m.fieldId,
      selector: m.selector,
      value: 'test-value',
      inputType: m.inputType as FieldSpec['inputType'],
    }));

    expect(specs.length).toBeGreaterThan(0);

    const js = filler.buildAutoFillScript(specs);
    expect(typeof js).toBe('string');
    expect(js.length).toBeGreaterThan(0);
    // Must be self-invoking function
    expect(js).toMatch(/^\(function\(\)/);
    // Must post a message back to React Native
    expect(js).toContain('ReactNativeWebView.postMessage');
    expect(js).toContain('AUTO_FILL_RESULT');
  });

  it.each(SUPPORTED_COUNTRIES)('JS contains field selectors for %s', (code) => {
    const script = automationScriptRegistry.getScriptSync(code);
    expect(script).not.toBeNull();

    const fieldMappings = script!.fieldMappings;
    const firstMapping = Object.values(fieldMappings)[0];

    const specs: FieldSpec[] = [{
      id: firstMapping.fieldId,
      selector: firstMapping.selector,
      value: 'test-value',
      inputType: firstMapping.inputType as FieldSpec['inputType'],
    }];

    const js = filler.buildAutoFillScript(specs);
    // The selector should appear in the JSON-serialised fields array
    expect(js).toContain(firstMapping.selector);
  });
});

// ---------------------------------------------------------------------------
// Value transforms
// ---------------------------------------------------------------------------

describe('AutomationScriptUtils.applyTransform', () => {
  describe('date_format transform (YYYY-MM-DD → YYYY/MM/DD)', () => {
    it('converts Japan date format correctly', () => {
      const transform = {
        type: 'date_format' as const,
        config: { from: 'YYYY-MM-DD', to: 'YYYY/MM/DD' },
      };
      const result = AutomationScriptUtils.applyTransform('1985-06-15', transform);
      expect(result).toBe('1985/06/15');
    });

    it('JPN dateOfBirth mapping uses YYYY/MM/DD format', () => {
      const jpnScript = automationScriptRegistry.getScriptSync('JPN');
      expect(jpnScript).not.toBeNull();
      const dobMapping = jpnScript!.fieldMappings.dateOfBirth;
      expect(dobMapping).toBeDefined();
      expect(dobMapping.transform?.type).toBe('date_format');
      expect(dobMapping.transform?.config?.to).toBe('YYYY/MM/DD');

      const result = AutomationScriptUtils.applyTransform('1985-06-15', dobMapping.transform!);
      expect(result).toBe('1985/06/15');
    });
  });

  describe('country_code transform (iso3_to_name)', () => {
    it('converts USA iso3 code to full name', () => {
      const transform = {
        type: 'country_code' as const,
        config: { format: 'iso3_to_name' },
      };
      const result = AutomationScriptUtils.applyTransform('USA', transform);
      expect(result).toBe('United States');
    });

    it('returns original value for unmapped country codes', () => {
      const transform = {
        type: 'country_code' as const,
        config: { format: 'iso3_to_name' },
      };
      const result = AutomationScriptUtils.applyTransform('XYZ', transform);
      expect(result).toBe('XYZ');
    });

    it('JPN nationality mapping uses iso3_to_name', () => {
      const jpnScript = automationScriptRegistry.getScriptSync('JPN');
      expect(jpnScript).not.toBeNull();
      const nationalityMapping = jpnScript!.fieldMappings.nationality;
      expect(nationalityMapping).toBeDefined();
      expect(nationalityMapping.transform?.config?.format).toBe('iso3_to_name');

      const result = AutomationScriptUtils.applyTransform('USA', nationalityMapping.transform!);
      expect(result).toBe('United States');
    });
  });

  describe('boolean_to_yesno transform', () => {
    it('converts false to configured falseValue', () => {
      const transform = {
        type: 'boolean_to_yesno' as const,
        config: { trueValue: 'yes', falseValue: 'no' },
      };
      expect(AutomationScriptUtils.applyTransform(false, transform)).toBe('no');
      expect(AutomationScriptUtils.applyTransform(true, transform)).toBe('yes');
    });

    it('uses default yes/no when config not provided', () => {
      const transform = { type: 'boolean_to_yesno' as const };
      expect(AutomationScriptUtils.applyTransform(false, transform)).toBe('no');
      expect(AutomationScriptUtils.applyTransform(true, transform)).toBe('yes');
    });

    it('JPN carryingProhibitedItems mapping uses boolean_to_yesno', () => {
      const jpnScript = automationScriptRegistry.getScriptSync('JPN');
      expect(jpnScript).not.toBeNull();
      const mapping = jpnScript!.fieldMappings.carryingProhibitedItems;
      expect(mapping).toBeDefined();
      expect(mapping.transform?.type).toBe('boolean_to_yesno');

      const falseResult = AutomationScriptUtils.applyTransform(false, mapping.transform!);
      expect(falseResult).toBe('no');
      const trueResult = AutomationScriptUtils.applyTransform(true, mapping.transform!);
      expect(trueResult).toBe('yes');
    });
  });

  describe('no transform', () => {
    it('returns value unchanged when no transform configured', () => {
      const result = AutomationScriptUtils.applyTransform('SMITH', undefined);
      expect(result).toBe('SMITH');
    });
  });
});

// ---------------------------------------------------------------------------
// Snapshot tests — generated JS for all 8 countries
// ---------------------------------------------------------------------------

describe('Auto-fill script snapshots', () => {
  let filler: FormFiller;

  beforeEach(() => {
    filler = new FormFiller();
  });

  it.each(SUPPORTED_COUNTRIES)('snapshot for %s generated JS', (code) => {
    const script = automationScriptRegistry.getScriptSync(code);
    expect(script).not.toBeNull();

    const fieldMappings = script!.fieldMappings;
    // Build deterministic FieldSpecs from the mapping definitions
    const specs: FieldSpec[] = Object.values(fieldMappings).map((m) => ({
      id: m.fieldId,
      selector: m.selector,
      value: `TEST_VALUE_${m.fieldId.toUpperCase()}`,
      inputType: m.inputType as FieldSpec['inputType'],
    }));

    const js = filler.buildAutoFillScript(specs);
    expect(js).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// End-to-end pipeline: form generation → FieldSpec construction → script
// ---------------------------------------------------------------------------

describe('Full pipeline integration', () => {
  it('builds FieldSpecs from form engine output and JPN mapping', () => {
    const form = generateFilledFormForTraveler(
      sampleProfile.id,
      [sampleProfile],
      sampleLegByCountry.JPN,
      SCHEMAS.JPN,
    );

    expect(form).not.toBeNull();

    const jpnScript = automationScriptRegistry.getScriptSync('JPN');
    expect(jpnScript).not.toBeNull();

    const allFields = form!.sections.flatMap((s) => s.fields);
    const fieldMappings = jpnScript!.fieldMappings;

    // Build FieldSpecs for auto-filled fields that have a mapping
    const specs: FieldSpec[] = allFields
      .filter((f) => f.source === 'auto' && fieldMappings[f.id])
      .map((f) => {
        const mapping = fieldMappings[f.id];
        let value = String(f.currentValue ?? '');

        // Apply transform if configured
        if (mapping.transform) {
          value = String(AutomationScriptUtils.applyTransform(f.currentValue, mapping.transform));
        }

        return {
          id: f.id,
          selector: mapping.selector,
          value,
          inputType: mapping.inputType as FieldSpec['inputType'],
        };
      });

    // We should have at least some auto-filled specs
    expect(specs.length).toBeGreaterThan(0);

    // All specs must have non-empty selectors and IDs
    for (const spec of specs) {
      expect(spec.id.length).toBeGreaterThan(0);
      expect(spec.selector.length).toBeGreaterThan(0);
    }

    // Generate script and verify basic structure
    const filler = new FormFiller();
    const js = filler.buildAutoFillScript(specs);
    expect(js).toContain('AUTO_FILL_RESULT');
  });
});
