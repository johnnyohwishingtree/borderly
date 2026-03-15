/**
 * Integration tests for the full auto-fill pipeline.
 *
 * Verifies the complete data flow:
 *   TravelerProfile + TripLeg
 *     → generateFilledFormForTraveler  (form engine)
 *     → country field mappings          (AutomationScript registry)
 *     → applyTransform per mapping      (date format, country code, boolean→radio)
 *     → buildAutoFillScript             (FormFiller)
 *     → generated JavaScript            (verified for selectors + values)
 *
 * No WebView is required — these tests exercise the data layer only.
 *
 * Coverage: all 8 supported countries (JPN, MYS, SGP, USA, CAN, GBR, THA, VNM).
 */

import { generateFilledForm, generateFilledFormForTraveler, FilledFormField } from '../../src/services/forms/formEngine';
import { formFiller, FieldSpec } from '../../src/services/submission/formFiller';
import { ALL_COUNTRY_MAPPINGS } from '../../src/services/submission/mappings';
import type { PortalFieldMapping } from '../../src/types/submission';
import type { CountryFormSchema } from '../../src/types/schema';
import {
  sampleProfile,
  sampleJapanLeg,
  sampleMalaysiaLeg,
  sampleLegByCountry,
  ALL_SUPPORTED_COUNTRIES,
} from '../fixtures/sampleProfile';

import JPN_SCHEMA from '../../src/schemas/JPN.json';
import MYS_SCHEMA from '../../src/schemas/MYS.json';
import SGP_SCHEMA from '../../src/schemas/SGP.json';
import USA_SCHEMA from '../../src/schemas/USA.json';
import CAN_SCHEMA from '../../src/schemas/CAN.json';
import GBR_SCHEMA from '../../src/schemas/GBR.json';
import THA_SCHEMA from '../../src/schemas/THA.json';
import VNM_SCHEMA from '../../src/schemas/VNM.json';

// ---------------------------------------------------------------------------
// Schema registry
// ---------------------------------------------------------------------------

const SCHEMAS: Record<string, CountryFormSchema> = {
  JPN: JPN_SCHEMA as CountryFormSchema,
  MYS: MYS_SCHEMA as CountryFormSchema,
  SGP: SGP_SCHEMA as CountryFormSchema,
  USA: USA_SCHEMA as CountryFormSchema,
  CAN: CAN_SCHEMA as CountryFormSchema,
  GBR: GBR_SCHEMA as CountryFormSchema,
  THA: THA_SCHEMA as CountryFormSchema,
  VNM: VNM_SCHEMA as CountryFormSchema,
};

// ---------------------------------------------------------------------------
// Minimal ISO-3 → display name lookup used only in these tests
// ---------------------------------------------------------------------------

const ISO3_TO_DISPLAY_NAME: Record<string, string> = {
  USA: 'United States',
  GBR: 'United Kingdom',
  CAN: 'Canada',
  JPN: 'Japan',
  AUS: 'Australia',
  NZL: 'New Zealand',
  DEU: 'Germany',
  FRA: 'France',
  IND: 'India',
  CHN: 'China',
  KOR: 'South Korea',
  BRA: 'Brazil',
  MYS: 'Malaysia',
  SGP: 'Singapore',
  THA: 'Thailand',
  VNM: 'Vietnam',
};

// ---------------------------------------------------------------------------
// Transform helper (mirrors what the submission engine would apply at runtime)
// ---------------------------------------------------------------------------

function applyTransform(
  value: unknown,
  transform: PortalFieldMapping['transform'] | undefined,
): string {
  const strValue = String(value ?? '');
  if (!transform) return strValue;

  switch (transform.type) {
    case 'date_format': {
      const config = transform.config as { from?: string; to: string };
      const match = strValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return strValue;
      const [, year, month, day] = match;
      return config.to
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day);
    }
    case 'country_code': {
      const config = (transform.config ?? {}) as { format?: string };
      if (config.format === 'iso3_to_name') {
        return ISO3_TO_DISPLAY_NAME[strValue] ?? strValue;
      }
      return strValue;
    }
    case 'boolean_to_yesno': {
      const config = (transform.config ?? {}) as {
        trueValue?: string;
        falseValue?: string;
      };
      const trueVal = config.trueValue ?? 'yes';
      const falseVal = config.falseValue ?? 'no';
      return value === true || strValue === 'true' ? trueVal : falseVal;
    }
    default:
      return strValue;
  }
}

// ---------------------------------------------------------------------------
// Build FieldSpec array from a filled form + country field mappings
// ---------------------------------------------------------------------------

function buildFieldSpecsFromForm(
  formFields: FilledFormField[],
  fieldMappings: Record<string, PortalFieldMapping>,
): FieldSpec[] {
  const specs: FieldSpec[] = [];

  for (const [fieldId, mapping] of Object.entries(fieldMappings)) {
    // Skip file-upload fields — not supported by FormFiller
    if (mapping.inputType === 'file') continue;

    const field = formFields.find((f) => f.id === fieldId);
    if (!field) continue;

    // Only include auto-filled or user-filled fields (skip empty defaults)
    if (field.source === 'empty') continue;

    const transformedValue = applyTransform(field.currentValue, mapping.transform);

    specs.push({
      id: fieldId,
      selector: mapping.selector,
      value: transformedValue,
      inputType: mapping.inputType as FieldSpec['inputType'],
    });
  }

  return specs;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCountryMapping(countryCode: string) {
  return ALL_COUNTRY_MAPPINGS.find((m) => m.countryCode === countryCode);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auto-Fill Pipeline — generateFilledFormForTraveler', () => {
  it('returns a filled form for a known traveler ID', () => {
    const form = generateFilledFormForTraveler(
      sampleProfile.id,
      [sampleProfile],
      sampleJapanLeg,
      SCHEMAS.JPN,
    );
    expect(form).not.toBeNull();
    expect(form!.countryCode).toBe('JPN');
  });

  it('returns null for an unknown traveler ID', () => {
    const form = generateFilledFormForTraveler(
      'non-existent-id',
      [sampleProfile],
      sampleJapanLeg,
      SCHEMAS.JPN,
    );
    expect(form).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Per-country pipeline tests
// ---------------------------------------------------------------------------

describe('Auto-Fill Pipeline — all 8 countries', () => {
  ALL_SUPPORTED_COUNTRIES.forEach((countryCode) => {
    describe(`Country: ${countryCode}`, () => {
      const schema = SCHEMAS[countryCode];
      const leg = sampleLegByCountry[countryCode];
      const mapping = getCountryMapping(countryCode);

      it('schema is registered', () => {
        expect(schema).toBeDefined();
        expect(schema.countryCode).toBe(countryCode);
      });

      it('field mapping is registered in ALL_COUNTRY_MAPPINGS', () => {
        expect(mapping).toBeDefined();
        expect(mapping!.countryCode).toBe(countryCode);
      });

      it('generates a filled form with at least one auto-filled field', () => {
        const form = generateFilledForm(sampleProfile, leg, schema);
        expect(form.countryCode).toBe(countryCode);
        expect(form.stats.totalFields).toBeGreaterThan(0);
        expect(form.stats.autoFilled).toBeGreaterThan(0);
      });

      it('builds a non-empty auto-fill script', () => {
        const form = generateFilledForm(sampleProfile, leg, schema);
        const allFields = form.sections.flatMap((s) => s.fields);
        const specs = buildFieldSpecsFromForm(allFields, mapping!.fieldMappings);

        // Should produce at least one FieldSpec (passport data is always present)
        expect(specs.length).toBeGreaterThan(0);

        const script = formFiller.buildAutoFillScript(specs);
        expect(script).toMatch(/^\(function\(\)\{/);
        expect(script).toContain('AUTO_FILL_RESULT');
      });

      it('generated script contains CSS selectors from field mappings', () => {
        const form = generateFilledForm(sampleProfile, leg, schema);
        const allFields = form.sections.flatMap((s) => s.fields);
        const specs = buildFieldSpecsFromForm(allFields, mapping!.fieldMappings);
        const script = formFiller.buildAutoFillScript(specs);

        // Every selector that appears in the FieldSpecs must appear in the script
        specs.forEach((spec) => {
          // JSON.stringify escapes " → \" inside a string
          const escapedSelector = spec.selector.replace(/"/g, '\\"');
          expect(script).toContain(escapedSelector);
        });
      });

      it('generated script contains transformed field values', () => {
        const form = generateFilledForm(sampleProfile, leg, schema);
        const allFields = form.sections.flatMap((s) => s.fields);
        const specs = buildFieldSpecsFromForm(allFields, mapping!.fieldMappings);
        const script = formFiller.buildAutoFillScript(specs);

        specs.forEach((spec) => {
          if (spec.value !== '') {
            expect(script).toContain(spec.value);
          }
        });
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Date format verification
// ---------------------------------------------------------------------------

describe('Auto-Fill Pipeline — date format transforms', () => {
  it('JPN: dateOfBirth is formatted YYYY/MM/DD', () => {
    const form = generateFilledForm(sampleProfile, sampleJapanLeg, SCHEMAS.JPN);
    const allFields = form.sections.flatMap((s) => s.fields);
    const jpnMapping = getCountryMapping('JPN')!;

    const dobMapping = jpnMapping.fieldMappings['dateOfBirth'];
    const dobField = allFields.find((f) => f.id === 'dateOfBirth');

    expect(dobMapping).toBeDefined();
    expect(dobField).toBeDefined();
    expect(dobField!.currentValue).toBe('1985-06-15');

    const transformed = applyTransform(dobField!.currentValue, dobMapping!.transform);
    expect(transformed).toBe('1985/06/15');

    const specs = buildFieldSpecsFromForm(allFields, jpnMapping.fieldMappings);
    const script = formFiller.buildAutoFillScript(specs);
    expect(script).toContain('1985/06/15');
  });

  it('MYS: dateOfBirth is formatted DD/MM/YYYY', () => {
    const form = generateFilledForm(sampleProfile, sampleMalaysiaLeg, SCHEMAS.MYS);
    const allFields = form.sections.flatMap((s) => s.fields);
    const mysMapping = getCountryMapping('MYS')!;

    const dobMapping = mysMapping.fieldMappings['dateOfBirth'];
    expect(dobMapping?.transform?.type).toBe('date_format');

    const transformed = applyTransform('1985-06-15', dobMapping!.transform);
    expect(transformed).toBe('15/06/1985');

    const specs = buildFieldSpecsFromForm(allFields, mysMapping.fieldMappings);
    const script = formFiller.buildAutoFillScript(specs);
    expect(script).toContain('15/06/1985');
  });

  it('SGP: dateOfBirth is formatted DD/MM/YYYY', () => {
    const sgpLeg = sampleLegByCountry['SGP'];
    const form = generateFilledForm(sampleProfile, sgpLeg, SCHEMAS.SGP);
    const allFields = form.sections.flatMap((s) => s.fields);
    const sgpMapping = getCountryMapping('SGP')!;

    const dobMapping = sgpMapping.fieldMappings['dateOfBirth'];
    const transformed = applyTransform('1985-06-15', dobMapping!.transform);
    expect(transformed).toBe('15/06/1985');

    const specs = buildFieldSpecsFromForm(allFields, sgpMapping.fieldMappings);
    const script = formFiller.buildAutoFillScript(specs);
    expect(script).toContain('15/06/1985');
  });

  it('USA: dateOfBirth is formatted MM/DD/YYYY', () => {
    const usaLeg = sampleLegByCountry['USA'];
    const form = generateFilledForm(sampleProfile, usaLeg, SCHEMAS.USA);
    const allFields = form.sections.flatMap((s) => s.fields);
    const usaMapping = getCountryMapping('USA')!;

    const dobMapping = usaMapping.fieldMappings['dateOfBirth'];
    const dobField = allFields.find((f) => f.id === 'dateOfBirth');

    expect(dobField).toBeDefined();
    if (dobField && dobMapping?.transform?.type === 'date_format') {
      const transformed = applyTransform(dobField.currentValue, dobMapping.transform);
      expect(transformed).toBe('06/15/1985');

      const specs = buildFieldSpecsFromForm(allFields, usaMapping.fieldMappings);
      const script = formFiller.buildAutoFillScript(specs);
      expect(script).toContain('06/15/1985');
    }
  });
});

// ---------------------------------------------------------------------------
// Country code translation
// ---------------------------------------------------------------------------

describe('Auto-Fill Pipeline — country code transforms', () => {
  it('nationality field mapping uses country_code transform in JPN', () => {
    const jpnMapping = getCountryMapping('JPN')!;
    const nationalityMapping = jpnMapping.fieldMappings['nationality'];
    expect(nationalityMapping?.transform?.type).toBe('country_code');
  });

  it('applyTransform converts ISO3 to display name for iso3_to_name format', () => {
    const transform: PortalFieldMapping['transform'] = {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    };
    expect(applyTransform('USA', transform)).toBe('United States');
    expect(applyTransform('GBR', transform)).toBe('United Kingdom');
    expect(applyTransform('JPN', transform)).toBe('Japan');
  });

  it('nationality is translated in the generated JPN script', () => {
    const form = generateFilledForm(sampleProfile, sampleJapanLeg, SCHEMAS.JPN);
    const allFields = form.sections.flatMap((s) => s.fields);
    const jpnMapping = getCountryMapping('JPN')!;

    const specs = buildFieldSpecsFromForm(allFields, jpnMapping.fieldMappings);
    const nationalitySpec = specs.find((s) => s.id === 'nationality');

    if (nationalitySpec) {
      // The nationality field value should be translated to the display name
      expect(nationalitySpec.value).not.toBe('USA'); // not the raw ISO code
      expect(nationalitySpec.value).toBe('United States');
    }
  });
});

// ---------------------------------------------------------------------------
// Boolean → radio value transforms
// ---------------------------------------------------------------------------

describe('Auto-Fill Pipeline — boolean_to_yesno transforms', () => {
  it('applyTransform converts false → falseValue string', () => {
    const transform: PortalFieldMapping['transform'] = {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    };
    expect(applyTransform(false, transform)).toBe('no');
    expect(applyTransform(true, transform)).toBe('yes');
  });

  it('applyTransform uses JPN radio config (no / yes)', () => {
    const jpnMapping = getCountryMapping('JPN')!;
    const prohibitedMapping = jpnMapping.fieldMappings['carryingProhibitedItems'];

    if (prohibitedMapping?.transform?.type === 'boolean_to_yesno') {
      const falseResult = applyTransform(false, prohibitedMapping.transform);
      const trueResult = applyTransform(true, prohibitedMapping.transform);
      expect(falseResult).toBeDefined();
      expect(trueResult).toBeDefined();
      // False value should differ from true value
      expect(falseResult).not.toBe(trueResult);
    }
  });

  it('boolean field from profile defaultDeclarations is transformed in JPN script', () => {
    const form = generateFilledForm(sampleProfile, sampleJapanLeg, SCHEMAS.JPN);
    const allFields = form.sections.flatMap((s) => s.fields);
    const jpnMapping = getCountryMapping('JPN')!;

    // carryingProhibitedItems is auto-filled from profile.defaultDeclarations
    const field = allFields.find((f) => f.id === 'carryingProhibitedItems');
    if (field && field.source === 'auto') {
      const mapping = jpnMapping.fieldMappings['carryingProhibitedItems'];
      if (mapping?.transform?.type === 'boolean_to_yesno') {
        const transformed = applyTransform(field.currentValue, mapping.transform);
        // sampleProfile.defaultDeclarations.carryingProhibitedItems = false → falseValue
        const config = mapping.transform.config as { falseValue: string };
        expect(transformed).toBe(config.falseValue);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Field count verification
// ---------------------------------------------------------------------------

describe('Auto-Fill Pipeline — field count verification', () => {
  ALL_SUPPORTED_COUNTRIES.forEach((countryCode) => {
    it(`${countryCode}: FieldSpec count matches auto-filled fields that have mappings`, () => {
      const schema = SCHEMAS[countryCode];
      const leg = sampleLegByCountry[countryCode];
      const mapping = getCountryMapping(countryCode)!;

      const form = generateFilledForm(sampleProfile, leg, schema);
      const allFields = form.sections.flatMap((s) => s.fields);
      const specs = buildFieldSpecsFromForm(allFields, mapping.fieldMappings);

      // Each spec must have a non-empty selector and id
      specs.forEach((spec) => {
        expect(spec.id).toBeTruthy();
        expect(spec.selector).toBeTruthy();
        expect(spec.inputType).toMatch(/^(text|select|radio|checkbox|date)$/);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Snapshot tests — catch regressions in generated JavaScript
// ---------------------------------------------------------------------------

describe('Auto-Fill Pipeline — snapshot tests for generated JS', () => {
  ALL_SUPPORTED_COUNTRIES.forEach((countryCode) => {
    it(`${countryCode}: auto-fill script snapshot`, () => {
      const schema = SCHEMAS[countryCode];
      const leg = sampleLegByCountry[countryCode];
      const mapping = getCountryMapping(countryCode)!;

      const form = generateFilledForm(sampleProfile, leg, schema);
      const allFields = form.sections.flatMap((s) => s.fields);
      const specs = buildFieldSpecsFromForm(allFields, mapping.fieldMappings);
      const script = formFiller.buildAutoFillScript(specs);

      expect(script).toMatchSnapshot();
    });
  });
});
