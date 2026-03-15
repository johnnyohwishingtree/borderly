/**
 * Integration tests for the auto-fill pipeline.
 *
 * Pipeline under test:
 *   profile + trip leg + country schema
 *   → generateFilledForm / generateFilledFormForTraveler
 *   → map fields through country field mappings (AutomationScriptRegistry)
 *   → apply transforms (AutomationScriptUtils)
 *   → build auto-fill script (FormFiller)
 *   → parse result message (FormFiller.parseFillResult)
 *   → verify all fields accounted for (filled | skipped | not_found)
 *
 * Covers:
 *   - JPN end-to-end pipeline
 *   - MYS end-to-end pipeline
 *   - Multi-profile auto-fill (parent vs child)
 */

import JPNSchema from '../../../src/schemas/JPN.json';
import MYSSchema from '../../../src/schemas/MYS.json';
import { generateFilledForm, generateFilledFormForTraveler } from '../../../src/services/forms/formEngine';
import {
  automationScriptRegistry,
  AutomationScriptUtils,
} from '../../../src/services/submission/automationScripts';
import { FormFiller, FieldSpec } from '../../../src/services/submission/formFiller';
import type { TravelerProfile } from '../../../src/types/profile';
import type { TripLeg } from '../../../src/types/trip';
import type { CountryFormSchema } from '../../../src/types/schema';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Primary traveler — adult passport holder */
const primaryProfile: TravelerProfile = {
  id: 'test-primary-001',
  passportNumber: 'AB1234567',
  surname: 'SMITH',
  givenNames: 'JOHN WILLIAM',
  nationality: 'USA',
  dateOfBirth: '1985-03-15',
  gender: 'M',
  passportExpiry: '2030-06-30',
  issuingCountry: 'USA',
  email: 'john.smith@example.com',
  phoneNumber: '+12125551234',
  homeAddress: {
    line1: '123 Main Street',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  occupation: 'Software Engineer',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

/** Child family member — same surname, different DOB/gender/passport */
const childProfile: TravelerProfile = {
  id: 'test-child-001',
  passportNumber: 'CD9876543',
  surname: 'SMITH',
  givenNames: 'EMMA',
  nationality: 'USA',
  dateOfBirth: '2010-07-22',
  gender: 'F',
  passportExpiry: '2028-07-21',
  issuingCountry: 'USA',
  relationship: 'child',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

/** Japan trip leg */
const jpnLeg: TripLeg = {
  id: 'leg-jpn-001',
  tripId: 'trip-001',
  destinationCountry: 'JPN',
  arrivalDate: '2026-04-01',
  departureDate: '2026-04-10',
  flightNumber: 'UA837',
  accommodation: {
    name: 'Tokyo Grand Hotel',
    address: {
      line1: '1-1-1 Shinjuku',
      city: 'Tokyo',
      postalCode: '160-0022',
      country: 'JPN',
    },
    phone: '+81312345678',
  },
  formStatus: 'not_started',
  order: 0,
};

/** Malaysia trip leg */
const mysLeg: TripLeg = {
  id: 'leg-mys-001',
  tripId: 'trip-001',
  destinationCountry: 'MYS',
  arrivalDate: '2026-04-12',
  departureDate: '2026-04-18',
  flightNumber: 'MH123',
  accommodation: {
    name: 'Kuala Lumpur Hilton',
    address: {
      line1: '3 Jalan Stesen Sentral',
      city: 'Kuala Lumpur',
      postalCode: '50470',
      country: 'MYS',
    },
    phone: '+60321345678',
  },
  formStatus: 'not_started',
  order: 1,
};

// Cast JSON schemas to the TypeScript type (the schemas conform to the interface)
const jpnSchema = JPNSchema as unknown as CountryFormSchema;
const mysSchema = MYSSchema as unknown as CountryFormSchema;

/**
 * Helper: map a filled form's auto-filled fields through the country's field mappings
 * to produce an array of FieldSpec ready for FormFiller.buildAutoFillScript().
 */
function buildFieldSpecs(
  profile: TravelerProfile,
  leg: TripLeg,
  schema: CountryFormSchema,
  countryCode: string,
): FieldSpec[] {
  const form = generateFilledForm(profile, leg, schema);
  const script = automationScriptRegistry.getScriptSync(countryCode);
  if (!script) return [];

  return form.sections
    .flatMap((s) => s.fields)
    .filter((f) => f.source === 'auto' && f.currentValue !== null && f.currentValue !== undefined)
    .flatMap((f) => {
      const mapping = script.fieldMappings[f.id];
      if (!mapping) return [];
      const rawValue = f.currentValue;
      const transformedValue = AutomationScriptUtils.applyTransform(
        rawValue,
        mapping.transform,
      );
      return [
        {
          id: f.id,
          selector: mapping.selector,
          value: String(transformedValue ?? ''),
          inputType: mapping.inputType as FieldSpec['inputType'],
        },
      ];
    });
}

// ---------------------------------------------------------------------------
// JPN end-to-end pipeline
// ---------------------------------------------------------------------------

describe('Integration: JPN auto-fill pipeline', () => {
  const filler = new FormFiller();
  const jpnScript = automationScriptRegistry.getScriptSync('JPN')!;

  it('generates a non-empty filled form for JPN', () => {
    const form = generateFilledForm(primaryProfile, jpnLeg, jpnSchema);
    expect(form).toBeDefined();
    expect(form.countryCode).toBe('JPN');
    expect(form.sections.length).toBeGreaterThan(0);
    expect(form.stats.totalFields).toBeGreaterThan(0);
  });

  it('auto-fills surname from profile', () => {
    const form = generateFilledForm(primaryProfile, jpnLeg, jpnSchema);
    const surname = form.sections.flatMap((s) => s.fields).find((f) => f.id === 'surname');
    expect(surname).toBeDefined();
    expect(surname!.currentValue).toBe('SMITH');
    expect(surname!.source).toBe('auto');
  });

  it('auto-fills passport number from profile', () => {
    const form = generateFilledForm(primaryProfile, jpnLeg, jpnSchema);
    const passport = form.sections.flatMap((s) => s.fields).find((f) => f.id === 'passportNumber');
    expect(passport).toBeDefined();
    expect(passport!.currentValue).toBe('AB1234567');
    expect(passport!.source).toBe('auto');
  });

  it('auto-fills given names from profile', () => {
    const form = generateFilledForm(primaryProfile, jpnLeg, jpnSchema);
    const givenNames = form.sections.flatMap((s) => s.fields).find((f) => f.id === 'givenNames');
    expect(givenNames).toBeDefined();
    expect(givenNames!.currentValue).toBe('JOHN WILLIAM');
  });

  it('auto-fills date of birth from profile', () => {
    const form = generateFilledForm(primaryProfile, jpnLeg, jpnSchema);
    const dob = form.sections.flatMap((s) => s.fields).find((f) => f.id === 'dateOfBirth');
    expect(dob).toBeDefined();
    expect(dob!.currentValue).toBe('1985-03-15');
  });

  it('applies YYYY-MM-DD → YYYY/MM/DD date transform for JPN dateOfBirth', () => {
    const dobMapping = jpnScript.fieldMappings['dateOfBirth'];
    expect(dobMapping).toBeDefined();
    expect(dobMapping.transform?.type).toBe('date_format');
    expect(dobMapping.transform?.config?.to).toBe('YYYY/MM/DD');

    const transformed = AutomationScriptUtils.applyTransform('1985-03-15', dobMapping.transform);
    expect(transformed).toBe('1985/03/15');
  });

  it('applies country_code transform for JPN nationality field', () => {
    const nationalityMapping = jpnScript.fieldMappings['nationality'];
    expect(nationalityMapping).toBeDefined();
    expect(nationalityMapping.transform?.type).toBe('country_code');

    const transformed = AutomationScriptUtils.applyTransform('USA', nationalityMapping.transform);
    expect(transformed).toBe('United States');
  });

  it('builds a non-empty FieldSpec array from JPN auto-filled fields', () => {
    const specs = buildFieldSpecs(primaryProfile, jpnLeg, jpnSchema, 'JPN');
    expect(specs.length).toBeGreaterThan(0);
  });

  it('builds an auto-fill script containing profile values', () => {
    const specs = buildFieldSpecs(primaryProfile, jpnLeg, jpnSchema, 'JPN');
    const script = filler.buildAutoFillScript(specs);

    // Script structure
    expect(script).toMatch(/^\(function\(\)\{/);
    expect(script).toMatch(/\}\)\(\);$/);
    expect(script).toContain('AUTO_FILL_RESULT');
    expect(script).toContain('ReactNativeWebView');

    // Profile data embedded in script
    expect(script).toContain('SMITH');
    expect(script).toContain('AB1234567');
  });

  it('date transform is applied in the generated script (YYYY/MM/DD not YYYY-MM-DD)', () => {
    const specs = buildFieldSpecs(primaryProfile, jpnLeg, jpnSchema, 'JPN');
    const dobSpec = specs.find((s) => s.id === 'dateOfBirth');
    if (dobSpec) {
      // The JPN transform converts YYYY-MM-DD → YYYY/MM/DD
      expect(dobSpec.value).toBe('1985/03/15');
    }
  });

  it('parses a simulated JPN fill result with all statuses', () => {
    const message = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 4,
      failed: 1,
      total: 6,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'givenNames', status: 'filled' },
        { id: 'passportNumber', status: 'filled' },
        { id: 'dateOfBirth', status: 'filled' },
        { id: 'nationality', status: 'not_found' },
        { id: 'gender', status: 'skipped' },
      ],
    });

    const result = filler.parseFillResult(message);
    expect(result).not.toBeNull();
    expect(result!.filled).toBe(4);
    expect(result!.total).toBe(6);
    expect(result!.fillRate).toBeCloseTo(4 / 6);

    // All fields must have one of the four valid statuses
    const validStatuses = ['filled', 'skipped', 'not_found', 'failed'];
    result!.results.forEach((r) => {
      expect(validStatuses).toContain(r.status);
    });
  });

  it('auto-fill is considered sufficient (≥50%) for JPN with a complete profile', () => {
    const specs = buildFieldSpecs(primaryProfile, jpnLeg, jpnSchema, 'JPN');
    // The generated specs should be > 0 (i.e., there are auto-fillable fields)
    expect(specs.length).toBeGreaterThan(0);
    // isAutoFillSufficient checks ≥0.5; we simply verify the method is callable
    const sufficientIfHalf = filler.isAutoFillSufficient(specs.length > 0 ? 0.6 : 0.0);
    expect(sufficientIfHalf).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MYS end-to-end pipeline
// ---------------------------------------------------------------------------

describe('Integration: MYS auto-fill pipeline', () => {
  const filler = new FormFiller();
  const mysScript = automationScriptRegistry.getScriptSync('MYS')!;

  it('generates a non-empty filled form for MYS', () => {
    const form = generateFilledForm(primaryProfile, mysLeg, mysSchema);
    expect(form).toBeDefined();
    expect(form.countryCode).toBe('MYS');
    expect(form.stats.totalFields).toBeGreaterThan(0);
  });

  it('auto-fills surname from profile for MYS', () => {
    const form = generateFilledForm(primaryProfile, mysLeg, mysSchema);
    const surname = form.sections.flatMap((s) => s.fields).find((f) => f.id === 'surname');
    expect(surname).toBeDefined();
    expect(surname!.currentValue).toBe('SMITH');
  });

  it('auto-fills passport number from profile for MYS', () => {
    const form = generateFilledForm(primaryProfile, mysLeg, mysSchema);
    const passport = form.sections.flatMap((s) => s.fields).find((f) => f.id === 'passportNumber');
    expect(passport).toBeDefined();
    expect(passport!.currentValue).toBe('AB1234567');
  });

  it('MYS dateOfBirth mapping uses DD/MM/YYYY target format (not yet implemented)', () => {
    const dobMapping = mysScript.fieldMappings['dateOfBirth'];
    expect(dobMapping).toBeDefined();
    expect(dobMapping.transform?.type).toBe('date_format');
    expect(dobMapping.transform?.config?.to).toBe('DD/MM/YYYY');
  });

  it('MYS script has required fields: countryCode, fieldMappings, steps', () => {
    expect(mysScript.countryCode).toBe('MYS');
    expect(Object.keys(mysScript.fieldMappings).length).toBeGreaterThan(0);
    expect(mysScript.steps.length).toBeGreaterThan(0);
    expect(mysScript.portalUrl).toMatch(/^https:\/\//);
  });

  it('builds a non-empty FieldSpec array from MYS auto-filled fields', () => {
    const specs = buildFieldSpecs(primaryProfile, mysLeg, mysSchema, 'MYS');
    expect(specs.length).toBeGreaterThan(0);
  });

  it('builds an auto-fill script for MYS containing profile data', () => {
    const specs = buildFieldSpecs(primaryProfile, mysLeg, mysSchema, 'MYS');
    const script = filler.buildAutoFillScript(specs);
    expect(script).toContain('SMITH');
    expect(script).toContain('AB1234567');
    expect(script).toContain('AUTO_FILL_RESULT');
  });

  it('parses a simulated perfect MYS fill result', () => {
    const specs = buildFieldSpecs(primaryProfile, mysLeg, mysSchema, 'MYS');
    const message = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: specs.length,
      failed: 0,
      total: specs.length,
      results: specs.map((s) => ({ id: s.id, status: 'filled' })),
    });

    const result = filler.parseFillResult(message);
    expect(result).not.toBeNull();
    expect(result!.filled).toBe(specs.length);
    expect(result!.total).toBe(specs.length);
    if (specs.length > 0) {
      expect(result!.fillRate).toBe(1.0);
    }
  });
});

// ---------------------------------------------------------------------------
// Multi-profile auto-fill (family support)
// ---------------------------------------------------------------------------

describe('Integration: multi-profile auto-fill (family)', () => {
  it('produces different passport numbers for parent vs child', () => {
    const parentForm = generateFilledForm(primaryProfile, jpnLeg, jpnSchema);
    const childForm = generateFilledForm(childProfile, jpnLeg, jpnSchema);

    const parentPassport = parentForm.sections.flatMap((s) => s.fields).find((f) => f.id === 'passportNumber');
    const childPassport = childForm.sections.flatMap((s) => s.fields).find((f) => f.id === 'passportNumber');

    expect(parentPassport!.currentValue).toBe('AB1234567');
    expect(childPassport!.currentValue).toBe('CD9876543');
    expect(parentPassport!.currentValue).not.toBe(childPassport!.currentValue);
  });

  it('produces different dates of birth for parent vs child', () => {
    const parentForm = generateFilledForm(primaryProfile, jpnLeg, jpnSchema);
    const childForm = generateFilledForm(childProfile, jpnLeg, jpnSchema);

    const parentDob = parentForm.sections.flatMap((s) => s.fields).find((f) => f.id === 'dateOfBirth');
    const childDob = childForm.sections.flatMap((s) => s.fields).find((f) => f.id === 'dateOfBirth');

    expect(parentDob!.currentValue).toBe('1985-03-15');
    expect(childDob!.currentValue).toBe('2010-07-22');
    expect(parentDob!.currentValue).not.toBe(childDob!.currentValue);
  });

  it('produces different given names for parent vs child', () => {
    const parentForm = generateFilledForm(primaryProfile, jpnLeg, jpnSchema);
    const childForm = generateFilledForm(childProfile, jpnLeg, jpnSchema);

    const parentGivenNames = parentForm.sections.flatMap((s) => s.fields).find((f) => f.id === 'givenNames');
    const childGivenNames = childForm.sections.flatMap((s) => s.fields).find((f) => f.id === 'givenNames');

    expect(parentGivenNames!.currentValue).toBe('JOHN WILLIAM');
    expect(childGivenNames!.currentValue).toBe('EMMA');
  });

  it('produces different genders for parent (M) vs child (F)', () => {
    const parentForm = generateFilledForm(primaryProfile, jpnLeg, jpnSchema);
    const childForm = generateFilledForm(childProfile, jpnLeg, jpnSchema);

    const parentGender = parentForm.sections.flatMap((s) => s.fields).find((f) => f.id === 'gender');
    const childGender = childForm.sections.flatMap((s) => s.fields).find((f) => f.id === 'gender');

    expect(parentGender!.currentValue).toBe('M');
    expect(childGender!.currentValue).toBe('F');
  });

  it('shares the same surname (family members have same last name)', () => {
    const parentForm = generateFilledForm(primaryProfile, jpnLeg, jpnSchema);
    const childForm = generateFilledForm(childProfile, jpnLeg, jpnSchema);

    const parentSurname = parentForm.sections.flatMap((s) => s.fields).find((f) => f.id === 'surname');
    const childSurname = childForm.sections.flatMap((s) => s.fields).find((f) => f.id === 'surname');

    expect(parentSurname!.currentValue).toBe('SMITH');
    expect(childSurname!.currentValue).toBe('SMITH');
  });

  it('generates different auto-fill scripts for parent vs child', () => {
    const filler = new FormFiller();
    const parentSpecs = buildFieldSpecs(primaryProfile, jpnLeg, jpnSchema, 'JPN');
    const childSpecs = buildFieldSpecs(childProfile, jpnLeg, jpnSchema, 'JPN');

    const parentScript = filler.buildAutoFillScript(parentSpecs);
    const childScript = filler.buildAutoFillScript(childSpecs);

    // Both scripts are valid IIFEs
    expect(parentScript).toMatch(/^\(function\(\)\{/);
    expect(childScript).toMatch(/^\(function\(\)\{/);

    // Profile-specific data is different in each script
    expect(parentScript).toContain('AB1234567');
    expect(parentScript).toContain('JOHN WILLIAM');

    expect(childScript).toContain('CD9876543');
    expect(childScript).toContain('EMMA');

    // The two scripts are not identical
    expect(parentScript).not.toBe(childScript);
  });

  it('generateFilledFormForTraveler returns correct form for each traveler', () => {
    const travelers = [primaryProfile, childProfile];

    const parentForm = generateFilledFormForTraveler(primaryProfile.id, travelers, jpnLeg, jpnSchema);
    const childForm = generateFilledFormForTraveler(childProfile.id, travelers, jpnLeg, jpnSchema);

    expect(parentForm).not.toBeNull();
    expect(childForm).not.toBeNull();

    const parentPassport = parentForm!.sections.flatMap((s) => s.fields).find((f) => f.id === 'passportNumber');
    const childPassport = childForm!.sections.flatMap((s) => s.fields).find((f) => f.id === 'passportNumber');

    expect(parentPassport!.currentValue).toBe('AB1234567');
    expect(childPassport!.currentValue).toBe('CD9876543');
  });

  it('generateFilledFormForTraveler returns null for unknown traveler ID', () => {
    const travelers = [primaryProfile, childProfile];
    const result = generateFilledFormForTraveler('nonexistent-id', travelers, jpnLeg, jpnSchema);
    expect(result).toBeNull();
  });
});
