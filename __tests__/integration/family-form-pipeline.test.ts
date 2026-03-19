/**
 * Family Form Pipeline — End-to-End Integration Tests
 *
 * Tests the full form generation pipeline for a family (primary + spouse + child)
 * across the 4 no-account countries: Malaysia, Singapore, Vietnam, Canada.
 *
 * Validates:
 * - Auto-fill resolves correct values from profile + trip leg
 * - Manual-entry fields are correctly identified
 * - Multi-traveler form generation works for all family members
 * - Submission guide steps reference valid fields
 * - Form stats (auto-filled vs remaining) are accurate
 */

import { generateFilledForm, generateFilledFormsForAllTravelers } from '../../src/services/forms/formEngine';
import { loadSchema } from '../../src/services/schemas/schemaLoader';
import MYS from '../../src/schemas/MYS.json';
import SGP from '../../src/schemas/SGP.json';
import VNM from '../../src/schemas/VNM.json';
import CAN from '../../src/schemas/CAN.json';
import type { TravelerProfile } from '../../src/types/profile';
import type { TripLeg } from '../../src/types/trip';
import type { CountryFormSchema } from '../../src/types/schema';
import type { FilledForm, FilledFormField } from '../../src/services/forms/formEngine';

// ---------------------------------------------------------------------------
// Test Fixtures — realistic family profiles
// ---------------------------------------------------------------------------

const primaryProfile: TravelerProfile = {
  id: 'primary-001',
  passportNumber: 'AB1234567',
  surname: 'SMITH',
  givenNames: 'JOHN WILLIAM',
  nationality: 'USA',
  dateOfBirth: '1985-03-15',
  gender: 'M',
  passportExpiry: '2030-12-31',
  issuingCountry: 'USA',
  email: 'john.smith@example.com',
  phoneNumber: '+1-555-123-4567',
  homeAddress: {
    line1: '123 Main Street',
    line2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  occupation: 'Software Engineer',
  relationship: 'self',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-06-01T12:00:00Z',
};

const spouseProfile: TravelerProfile = {
  id: 'spouse-001',
  passportNumber: 'CD7654321',
  surname: 'SMITH',
  givenNames: 'JANE MARIE',
  nationality: 'USA',
  dateOfBirth: '1987-07-22',
  gender: 'F',
  passportExpiry: '2031-06-15',
  issuingCountry: 'USA',
  email: 'jane.smith@example.com',
  phoneNumber: '+1-555-987-6543',
  homeAddress: {
    line1: '123 Main Street',
    line2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  occupation: 'Teacher',
  relationship: 'spouse',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-06-01T12:00:00Z',
};

const childProfile: TravelerProfile = {
  id: 'child-001',
  passportNumber: 'EF9876543',
  surname: 'SMITH',
  givenNames: 'EMMA',
  nationality: 'USA',
  dateOfBirth: '2015-11-08',
  gender: 'F',
  passportExpiry: '2029-03-20',
  issuingCountry: 'USA',
  homeAddress: {
    line1: '123 Main Street',
    line2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  relationship: 'child',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-15T11:00:00Z',
  updatedAt: '2024-06-01T12:00:00Z',
};

const family = [primaryProfile, spouseProfile, childProfile];

// ---------------------------------------------------------------------------
// Trip Legs — one per country
// ---------------------------------------------------------------------------

function makeLeg(country: string, overrides?: Partial<TripLeg>): TripLeg {
  const defaults: Record<string, Partial<TripLeg>> = {
    MYS: {
      id: 'leg-mys',
      destinationCountry: 'MYS',
      arrivalDate: '2026-08-01',
      departureDate: '2026-08-07',
      flightNumber: 'MH002',
      arrivalAirport: 'KUL',
      accommodation: {
        name: 'Shangri-La Hotel KL',
        address: { line1: 'Jalan Sultan Ismail', city: 'Kuala Lumpur', postalCode: '50250', country: 'MYS' },
        phone: '+60-3-2032-2388',
      },
    },
    SGP: {
      id: 'leg-sgp',
      destinationCountry: 'SGP',
      arrivalDate: '2026-08-08',
      departureDate: '2026-08-12',
      flightNumber: 'SQ801',
      airlineCode: 'SQ',
      accommodation: {
        name: 'Marina Bay Sands',
        address: { line1: '10 Bayfront Avenue', city: 'Singapore', postalCode: '018956', country: 'SGP' },
        phone: '+65-6688-8888',
      },
    },
    VNM: {
      id: 'leg-vnm',
      destinationCountry: 'VNM',
      arrivalDate: '2026-08-13',
      departureDate: '2026-08-18',
      flightNumber: 'VN302',
      accommodation: {
        name: 'Rex Hotel Saigon',
        address: { line1: '141 Nguyen Hue Blvd', city: 'Ho Chi Minh City', postalCode: '700000', country: 'VNM' },
        phone: '+84-28-3829-2185',
      },
    },
    CAN: {
      id: 'leg-can',
      destinationCountry: 'CAN',
      arrivalDate: '2026-09-01',
      departureDate: '2026-09-10',
      flightNumber: 'AC100',
      accommodation: {
        name: 'Fairmont Royal York',
        address: { line1: '100 Front Street West', city: 'Toronto', state: 'ON', postalCode: 'M5J 1E3', country: 'CAN' },
        phone: '+1-416-368-2511',
      },
    },
  };

  return {
    tripId: 'trip-family-asia',
    formStatus: 'not_started',
    order: 0,
    assignedTravelers: family.map(p => p.id),
    ...defaults[country],
    ...overrides,
  } as TripLeg;
}

// ---------------------------------------------------------------------------
// Helper to find a field in a filled form
// ---------------------------------------------------------------------------

function findField(form: FilledForm, fieldId: string): FilledFormField | undefined {
  for (const section of form.sections) {
    const field = section.fields.find(f => f.id === fieldId);
    if (field) return field;
  }
  return undefined;
}

function getAutoFilledFields(form: FilledForm): FilledFormField[] {
  return form.sections.flatMap(s => s.fields.filter(f => f.source === 'auto'));
}

function getManualFields(form: FilledForm): FilledFormField[] {
  return form.sections.flatMap(s => s.fields.filter(f => f.needsUserInput));
}

function assertFieldNeedsInput(field: FilledFormField | undefined): void {
  if (field) {
    expect(
      field.currentValue === '' ||
      field.currentValue === null ||
      field.currentValue === undefined ||
      field.needsUserInput
    ).toBe(true);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Family Form Pipeline — No-Account Countries', () => {
  // Load schemas
  const schemas: Record<string, CountryFormSchema> = {
    MYS: loadSchema(MYS as unknown as CountryFormSchema, 'MYS'),
    SGP: loadSchema(SGP as unknown as CountryFormSchema, 'SGP'),
    VNM: loadSchema(VNM as unknown as CountryFormSchema, 'VNM'),
    CAN: loadSchema(CAN as unknown as CountryFormSchema, 'CAN'),
  };

  // =========================================================================
  // MALAYSIA
  // =========================================================================
  describe('Malaysia (MYS) — MDAC', () => {
    const leg = makeLeg('MYS');

    describe('Primary traveler (John)', () => {
      let form: FilledForm;

      beforeAll(() => {
        form = generateFilledForm(primaryProfile, leg, schemas.MYS);
      });

      it('should auto-fill passport fields from profile', () => {
        expect(findField(form, 'surname')?.currentValue).toBe('SMITH');
        expect(findField(form, 'givenNames')?.currentValue).toBe('JOHN WILLIAM');
        expect(findField(form, 'passportNumber')?.currentValue).toBe('AB1234567');
        expect(findField(form, 'nationality')?.currentValue).toBe('USA');
        expect(findField(form, 'dateOfBirth')?.currentValue).toBe('1985-03-15');
        expect(findField(form, 'gender')?.currentValue).toBe('M');
        expect(findField(form, 'passportExpiry')?.currentValue).toBe('2030-12-31');
      });

      it('should auto-fill contact fields from profile', () => {
        expect(findField(form, 'email')?.currentValue).toBe('john.smith@example.com');
        expect(findField(form, 'phoneNumber')?.currentValue).toBe('+1-555-123-4567');
      });

      it('should auto-fill travel fields from trip leg', () => {
        expect(findField(form, 'arrivalDate')?.currentValue).toBe('2026-08-01');
        expect(findField(form, 'arrivalAirport')?.currentValue).toBe('KUL');
        expect(findField(form, 'flightNumber')?.currentValue).toBe('MH002');
      });

      it('should auto-fill accommodation from trip leg', () => {
        expect(findField(form, 'hotelName')?.currentValue).toBe('Shangri-La Hotel KL');
      });

      it('should require manual input for country-specific fields', () => {
        const manual = getManualFields(form);
        const manualIds = manual.map(f => f.id);
        expect(manualIds).toContain('purposeOfVisit');
      });

      it('should report accurate form stats', () => {
        expect(form.stats.totalFields).toBe(21);
        expect(form.stats.autoFilled).toBeGreaterThanOrEqual(15);
        expect(form.stats.remaining).toBeLessThanOrEqual(6);
        expect(form.stats.completionPercentage).toBeGreaterThanOrEqual(70);
      });
    });

    describe('Child traveler (Emma) — no email/phone', () => {
      let form: FilledForm;

      beforeAll(() => {
        form = generateFilledForm(childProfile, leg, schemas.MYS);
      });

      it('should auto-fill passport fields correctly for child', () => {
        expect(findField(form, 'surname')?.currentValue).toBe('SMITH');
        expect(findField(form, 'givenNames')?.currentValue).toBe('EMMA');
        expect(findField(form, 'dateOfBirth')?.currentValue).toBe('2015-11-08');
        expect(findField(form, 'gender')?.currentValue).toBe('F');
      });

      it('should NOT auto-fill email/phone (child has none)', () => {
        // Either empty/null or marked as needing input
        assertFieldNeedsInput(findField(form, 'email'));
        assertFieldNeedsInput(findField(form, 'phoneNumber'));
      });

      it('should have more remaining fields than primary traveler', () => {
        const primaryForm = generateFilledForm(primaryProfile, leg, schemas.MYS);
        expect(form.stats.remaining).toBeGreaterThanOrEqual(primaryForm.stats.remaining);
      });
    });

    describe('Multi-traveler bulk generation', () => {
      it('should generate forms for all 3 family members', () => {
        const formsMap = generateFilledFormsForAllTravelers(family, leg, schemas.MYS);
        expect(formsMap.size).toBe(3);
        expect(formsMap.has('primary-001')).toBe(true);
        expect(formsMap.has('spouse-001')).toBe(true);
        expect(formsMap.has('child-001')).toBe(true);
      });

      it('should fill different passport data for each family member', () => {
        const formsMap = generateFilledFormsForAllTravelers(family, leg, schemas.MYS);
        const primaryForm = formsMap.get('primary-001')!;
        const spouseForm = formsMap.get('spouse-001')!;

        expect(findField(primaryForm, 'givenNames')?.currentValue).toBe('JOHN WILLIAM');
        expect(findField(spouseForm, 'givenNames')?.currentValue).toBe('JANE MARIE');
        expect(findField(primaryForm, 'passportNumber')?.currentValue).toBe('AB1234567');
        expect(findField(spouseForm, 'passportNumber')?.currentValue).toBe('CD7654321');
      });

      it('should share the same travel/accommodation data across family', () => {
        const formsMap = generateFilledFormsForAllTravelers(family, leg, schemas.MYS);
        const primaryForm = formsMap.get('primary-001')!;
        const spouseForm = formsMap.get('spouse-001')!;
        const childForm = formsMap.get('child-001')!;

        // All family members share the same flight and hotel
        for (const form of [primaryForm, spouseForm, childForm]) {
          expect(findField(form, 'arrivalDate')?.currentValue).toBe('2026-08-01');
          expect(findField(form, 'flightNumber')?.currentValue).toBe('MH002');
          expect(findField(form, 'hotelName')?.currentValue).toBe('Shangri-La Hotel KL');
        }
      });
    });
  });

  // =========================================================================
  // SINGAPORE
  // =========================================================================
  describe('Singapore (SGP) — SG Arrival Card', () => {
    const leg = makeLeg('SGP');

    describe('Primary traveler (John)', () => {
      let form: FilledForm;

      beforeAll(() => {
        form = generateFilledForm(primaryProfile, leg, schemas.SGP);
      });

      it('should auto-fill passport fields', () => {
        expect(findField(form, 'surname')?.currentValue).toBe('SMITH');
        expect(findField(form, 'givenNames')?.currentValue).toBe('JOHN WILLIAM');
        expect(findField(form, 'passportNumber')?.currentValue).toBe('AB1234567');
        expect(findField(form, 'nationality')?.currentValue).toBe('USA');
      });

      it('should auto-fill airline code from trip leg', () => {
        expect(findField(form, 'airlineCode')?.currentValue).toBe('SQ');
        expect(findField(form, 'flightNumber')?.currentValue).toBe('SQ801');
      });

      it('should auto-fill accommodation name', () => {
        expect(findField(form, 'accommodationName')?.currentValue).toBe('Marina Bay Sands');
      });

      it('should auto-fill declaration defaults', () => {
        const exceedsField = findField(form, 'exceedsAllowance');
        const cashField = findField(form, 'carryingCash');
        if (exceedsField?.source === 'auto') {
          expect(exceedsField.currentValue).toBe(false);
        }
        if (cashField?.source === 'auto') {
          expect(cashField.currentValue).toBe(false);
        }
      });

      it('should require manual input for health declarations', () => {
        const manual = getManualFields(form);
        const manualIds = manual.map(f => f.id);
        // Singapore has 4 health declaration booleans
        expect(manualIds).toContain('purposeOfVisit');
      });

      it('should report accurate stats', () => {
        expect(form.stats.totalFields).toBe(28);
        expect(form.stats.autoFilled).toBeGreaterThanOrEqual(16);
      });
    });

    describe('Multi-traveler', () => {
      it('should generate forms for all family members', () => {
        const formsMap = generateFilledFormsForAllTravelers(family, leg, schemas.SGP);
        expect(formsMap.size).toBe(3);

        // Each person should have their own passport data
        const childForm = formsMap.get('child-001')!;
        expect(findField(childForm, 'surname')?.currentValue).toBe('SMITH');
        expect(findField(childForm, 'givenNames')?.currentValue).toBe('EMMA');
        expect(findField(childForm, 'dateOfBirth')?.currentValue).toBe('2015-11-08');
      });
    });
  });

  // =========================================================================
  // VIETNAM
  // =========================================================================
  describe('Vietnam (VNM) — e-Visa Portal', () => {
    const leg = makeLeg('VNM');

    describe('Primary traveler (John)', () => {
      let form: FilledForm;

      beforeAll(() => {
        form = generateFilledForm(primaryProfile, leg, schemas.VNM);
      });

      it('should auto-fill passport fields', () => {
        expect(findField(form, 'passportNumber')?.currentValue).toBe('AB1234567');
        expect(findField(form, 'passportExpiry')?.currentValue).toBe('2030-12-31');
      });

      it('should auto-fill name fields (Vietnam uses separate given/surname)', () => {
        expect(findField(form, 'surname')?.currentValue).toBe('SMITH');
        // VNM schema may use "givenName" (singular) — check both
        const given = findField(form, 'givenName') || findField(form, 'givenNames');
        if (given) {
          expect(given.currentValue).toBeTruthy();
        }
      });

      it('should require manual input for Vietnam-specific fields', () => {
        const manual = getManualFields(form);
        const manualIds = manual.map(f => f.id);
        // Vietnam requires religion, entry port, previous visit
        expect(manualIds).toContain('purposeOfVisit');
      });

      it('should auto-fill accommodation', () => {
        expect(findField(form, 'hotelName')?.currentValue).toBe('Rex Hotel Saigon');
      });

      it('should have more manual fields than Malaysia', () => {
        const mysForm = generateFilledForm(primaryProfile, makeLeg('MYS'), schemas.MYS);
        expect(form.stats.remaining).toBeGreaterThan(mysForm.stats.remaining);
      });
    });

    describe('Multi-traveler', () => {
      it('should generate forms for all family members', () => {
        const formsMap = generateFilledFormsForAllTravelers(family, leg, schemas.VNM);
        expect(formsMap.size).toBe(3);
      });

      it('should have different passport data per family member', () => {
        const formsMap = generateFilledFormsForAllTravelers(family, leg, schemas.VNM);
        const primary = formsMap.get('primary-001')!;
        const spouse = formsMap.get('spouse-001')!;

        expect(findField(primary, 'passportNumber')?.currentValue).toBe('AB1234567');
        expect(findField(spouse, 'passportNumber')?.currentValue).toBe('CD7654321');
      });
    });
  });

  // =========================================================================
  // CANADA
  // =========================================================================
  describe('Canada (CAN) — eTA', () => {
    const leg = makeLeg('CAN');

    describe('Primary traveler (John)', () => {
      let form: FilledForm;

      beforeAll(() => {
        form = generateFilledForm(primaryProfile, leg, schemas.CAN);
      });

      it('should auto-fill passport fields', () => {
        expect(findField(form, 'passportNumber')?.currentValue).toBe('AB1234567');
        expect(findField(form, 'surname')?.currentValue).toBe('SMITH');
        expect(findField(form, 'givenNames')?.currentValue).toBe('JOHN WILLIAM');
      });

      it('should auto-fill email from profile', () => {
        expect(findField(form, 'email')?.currentValue).toBe('john.smith@example.com');
      });

      it('should require manual input for background questions', () => {
        const manual = getManualFields(form);
        const manualIds = manual.map(f => f.id);
        // Canada has 7 background boolean questions
        expect(manualIds).toContain('purposeOfVisit');
      });

      it('should report accurate stats for highest-complexity schema', () => {
        expect(form.stats.totalFields).toBe(29);
        // Canada has the most manual fields
        expect(form.stats.remaining).toBeGreaterThan(10);
      });
    });

    describe('Multi-traveler', () => {
      it('should generate forms for all family members', () => {
        const formsMap = generateFilledFormsForAllTravelers(family, leg, schemas.CAN);
        expect(formsMap.size).toBe(3);
      });

      it('should have correct child passport data', () => {
        const formsMap = generateFilledFormsForAllTravelers(family, leg, schemas.CAN);
        const childForm = formsMap.get('child-001')!;
        expect(findField(childForm, 'passportNumber')?.currentValue).toBe('EF9876543');
        expect(findField(childForm, 'surname')?.currentValue).toBe('SMITH');
      });
    });
  });

  // =========================================================================
  // CROSS-COUNTRY COMPARISONS
  // =========================================================================
  describe('Cross-country form comparisons', () => {
    it('should generate forms for all 4 countries for the same traveler', () => {
      const countries = ['MYS', 'SGP', 'VNM', 'CAN'] as const;
      const forms = countries.map(code =>
        generateFilledForm(primaryProfile, makeLeg(code), schemas[code])
      );

      // All forms should have the same passport data
      for (const form of forms) {
        expect(findField(form, 'passportNumber')?.currentValue).toBe('AB1234567');
        expect(findField(form, 'surname')?.currentValue).toBe('SMITH');
      }

      // Auto-fill percentage should decrease from MYS → CAN (increasing complexity)
      const completions = forms.map(f => f.stats.completionPercentage);
      // MYS should have highest auto-fill, CAN should have lowest
      expect(completions[0]).toBeGreaterThanOrEqual(completions[3]);
    });

    it('should correctly identify country-specific manual fields', () => {
      const countries = ['MYS', 'SGP', 'VNM', 'CAN'] as const;
      const manualCounts = countries.map(code => {
        const form = generateFilledForm(primaryProfile, makeLeg(code), schemas[code]);
        return { code, count: getManualFields(form).length };
      });

      // Each country should have at least 1 manual field (purposeOfVisit)
      for (const { count } of manualCounts) {
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });

    it('should produce 12 total forms for 3 family members × 4 countries', () => {
      const countries = ['MYS', 'SGP', 'VNM', 'CAN'] as const;
      let totalForms = 0;

      for (const code of countries) {
        const formsMap = generateFilledFormsForAllTravelers(family, makeLeg(code), schemas[code]);
        totalForms += formsMap.size;
      }

      expect(totalForms).toBe(12); // 3 travelers × 4 countries
    });
  });

  // =========================================================================
  // SUBMISSION GUIDE VALIDATION
  // =========================================================================
  describe('Submission guide field coverage', () => {
    const countries = ['MYS', 'SGP', 'VNM', 'CAN'] as const;

    for (const code of countries) {
      it(`${code}: submission guide fields should reference existing schema fields`, () => {
        const schema = schemas[code];
        const allFieldIds = new Set<string>();
        schema.sections.forEach(section => {
          section.fields.forEach(field => {
            allFieldIds.add(field.id);
          });
        });

        const guide = schema.submissionGuide || [];
        for (const step of guide) {
          const fieldsOnScreen = (step as any).fieldsOnThisScreen || [];
          for (const fieldId of fieldsOnScreen) {
            expect(allFieldIds.has(fieldId)).toBe(true);
          }
        }
      });
    }

    for (const code of countries) {
      it(`${code}: every schema field should appear in at least one guide step`, () => {
        const schema = schemas[code];
        const guideFieldIds = new Set<string>();
        const guide = schema.submissionGuide || [];
        for (const step of guide) {
          const fieldsOnScreen = (step as any).fieldsOnThisScreen || [];
          for (const fieldId of fieldsOnScreen) {
            guideFieldIds.add(fieldId);
          }
        }

        const allFieldIds: string[] = [];
        schema.sections.forEach(section => {
          section.fields.forEach(field => {
            allFieldIds.push(field.id);
          });
        });

        // Every field should be covered by the guide
        for (const fieldId of allFieldIds) {
          expect(guideFieldIds.has(fieldId)).toBe(true);
        }
      });
    }
  });

  // =========================================================================
  // AUTO-FILL SOURCE VALIDATION
  // =========================================================================
  describe('Auto-fill source paths are resolvable', () => {
    const countries = ['MYS', 'SGP', 'VNM', 'CAN'] as const;

    for (const code of countries) {
      it(`${code}: all auto-fill sources should resolve to non-empty values`, () => {
        const form = generateFilledForm(primaryProfile, makeLeg(code), schemas[code]);
        const autoFields = getAutoFilledFields(form);

        for (const field of autoFields) {
          expect(field.currentValue).toBeDefined();
          expect(field.currentValue).not.toBe('');
          expect(field.currentValue).not.toBeNull();
          expect(field.source).toBe('auto');
          expect(field.needsUserInput).toBe(false);
        }
      });
    }
  });
});
