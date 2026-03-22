/**
 * Form engine integration tests for Canada (CAN), United Kingdom (GBR),
 * and United States (USA).
 *
 * These tests verify that generateFilledForm() correctly auto-fills fields
 * from a mock traveler profile, identifies fields that need manual input,
 * and produces accurate fill statistics for each country.
 *
 * Equivalent deep coverage to formEngine.tha.test.ts and formEngine.vnm.test.ts.
 */

import {
  generateFilledForm,
  clearAllCaches,
} from '../../src/services/forms/formEngine';
import { clearPathCache } from '../../src/services/forms/fieldMapper';
import { clearSchemaCache } from '../../src/services/schemas/schemaLoader';
import {
  validateField,
  validateFormWithCrossChecks,
} from '../../src/services/forms/validators';
import { TravelerProfile } from '../../src/types/profile';
import { TripLeg } from '../../src/types/trip';
import { CountryFormSchema } from '../../src/types/schema';
import canSchemaJson from '../../src/schemas/CAN.json';
import gbrSchemaJson from '../../src/schemas/GBR.json';
import usaSchemaJson from '../../src/schemas/USA.json';

const canSchema = canSchemaJson as CountryFormSchema;
const gbrSchema = gbrSchemaJson as CountryFormSchema;
const usaSchema = usaSchemaJson as CountryFormSchema;

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

/** Realistic traveler profile used across all three country tests. */
const mockProfile: TravelerProfile = {
  id: 'test-can-gbr-usa-profile',
  passportNumber: 'B98765432',
  surname: 'JOHNSON',
  givenNames: 'ALEX MORGAN',
  nationality: 'AUS',
  dateOfBirth: '1990-03-22',
  gender: 'M',
  passportExpiry: '2032-03-21',
  issuingCountry: 'AUS',
  email: 'alex.johnson@example.com',
  phoneNumber: '+61400123456',
  homeAddress: {
    line1: '10 Federation Square',
    city: 'Melbourne',
    state: 'VIC',
    postalCode: '3000',
    country: 'AUS',
  },
  occupation: 'Software Engineer',
  defaultDeclarations: {
    hasItemsToDeclare: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/** Profile with an expired passport for edge-case validation tests. */
const expiredPassportProfile: TravelerProfile = {
  ...mockProfile,
  id: 'test-expired-passport-profile',
  passportExpiry: '2020-01-15', // Past date — expired
};

// ---------------------------------------------------------------------------
// Trip legs
// ---------------------------------------------------------------------------

const mockCanLeg: TripLeg = {
  id: 'test-can-leg-id',
  tripId: 'test-trip-id',
  destinationCountry: 'CAN',
  arrivalDate: '2026-06-10',
  departureDate: '2026-06-24',
  flightNumber: 'AC033',
  airlineCode: 'AC',
  arrivalAirport: 'YYZ',
  accommodation: {
    name: 'Fairmont Royal York',
    address: {
      line1: '100 Front Street West',
      city: 'Toronto',
      state: 'ON',
      postalCode: 'M5J 1E3',
      country: 'CAN',
    },
    phone: '+1-416-368-2511',
  },
  formStatus: 'not_started',
  order: 1,
};

const mockGbrLeg: TripLeg = {
  id: 'test-gbr-leg-id',
  tripId: 'test-trip-id',
  destinationCountry: 'GBR',
  arrivalDate: '2026-07-15',
  departureDate: '2026-07-28',
  flightNumber: 'BA016',
  airlineCode: 'BA',
  arrivalAirport: 'LHR',
  accommodation: {
    name: 'The Savoy',
    address: {
      line1: 'Strand',
      city: 'London',
      state: 'England',
      postalCode: 'WC2R 0EZ',
      country: 'GBR',
    },
    phone: '+44-20-7836-4343',
  },
  formStatus: 'not_started',
  order: 1,
};

const mockUsaLeg: TripLeg = {
  id: 'test-usa-leg-id',
  tripId: 'test-trip-id',
  destinationCountry: 'USA',
  arrivalDate: '2026-08-05',
  departureDate: '2026-08-19',
  flightNumber: 'UA101',
  airlineCode: 'UA',
  arrivalAirport: 'JFK',
  accommodation: {
    name: 'The Plaza Hotel',
    address: {
      line1: '768 Fifth Avenue',
      city: 'New York',
      state: 'NY',
      postalCode: '10019',
      country: 'USA',
    },
    phone: '+1-212-759-3000',
  },
  formStatus: 'not_started',
  order: 1,
};

// ===========================================================================
// Canada (CAN)
// ===========================================================================

describe('FormEngine — Canada (CAN) Integration', () => {
  beforeEach(() => {
    clearAllCaches();
    clearPathCache();
    clearSchemaCache();
  });

  it('should load CAN schema without throwing (archived status graceful degradation)', () => {
    // CAN has implementationStatus: "archived" — generating a form must not throw.
    expect(() => {
      const result = generateFilledForm(mockProfile, mockCanLeg, canSchema);
      expect(result.countryCode).toBe('CAN');
    }).not.toThrow();

    // Confirm the archived metadata is present and intact.
    expect(canSchema.metadata?.implementationStatus).toBe('archived');
  });

  describe('generateFilledForm() with CAN schema', () => {
    it('should return a FilledForm with the correct country metadata', () => {
      const result = generateFilledForm(mockProfile, mockCanLeg, canSchema);

      expect(result.countryCode).toBe('CAN');
      expect(result.countryName).toBe('Canada');
      expect(result.portalName).toBe('Electronic Travel Authorization (eTA) — Archived');
      expect(result.sections).toHaveLength(canSchema.sections.length);
    });

    it('should auto-fill core profile fields (surname, givenNames, passportNumber, nationality, dateOfBirth, gender, passportExpiry)', () => {
      const result = generateFilledForm(mockProfile, mockCanLeg, canSchema);
      const allFields = result.sections.flatMap(s => s.fields);
      const fieldMap = Object.fromEntries(allFields.map(f => [f.id, f]));

      // surname → profile.surname
      expect(fieldMap.surname.currentValue).toBe('JOHNSON');
      expect(fieldMap.surname.source).toBe('auto');
      expect(fieldMap.surname.needsUserInput).toBe(false);

      // givenNames → profile.givenNames
      expect(fieldMap.givenNames.currentValue).toBe('ALEX MORGAN');
      expect(fieldMap.givenNames.source).toBe('auto');
      expect(fieldMap.givenNames.needsUserInput).toBe(false);

      // passportNumber → profile.passportNumber
      expect(fieldMap.passportNumber.currentValue).toBe('B98765432');
      expect(fieldMap.passportNumber.source).toBe('auto');
      expect(fieldMap.passportNumber.needsUserInput).toBe(false);

      // nationality → profile.nationality
      expect(fieldMap.nationality.currentValue).toBe('AUS');
      expect(fieldMap.nationality.source).toBe('auto');
      expect(fieldMap.nationality.needsUserInput).toBe(false);

      // dateOfBirth → profile.dateOfBirth
      expect(fieldMap.dateOfBirth.currentValue).toBe('1990-03-22');
      expect(fieldMap.dateOfBirth.source).toBe('auto');
      expect(fieldMap.dateOfBirth.needsUserInput).toBe(false);

      // gender → profile.gender
      expect(fieldMap.gender.currentValue).toBe('M');
      expect(fieldMap.gender.source).toBe('auto');
      expect(fieldMap.gender.needsUserInput).toBe(false);

      // passportExpiryDate → profile.passportExpiry
      expect(fieldMap.passportExpiryDate.currentValue).toBe('2032-03-21');
      expect(fieldMap.passportExpiryDate.source).toBe('auto');
      expect(fieldMap.passportExpiryDate.needsUserInput).toBe(false);
    });

    it('should identify country-specific required fields that need user input (smart delta)', () => {
      const result = generateFilledForm(mockProfile, mockCanLeg, canSchema);
      const allFields = result.sections.flatMap(s => s.fields);
      const fieldsNeedingInput = allFields.filter(f => f.needsUserInput && f.required);
      const needsInputIds = fieldsNeedingInput.map(f => f.id);

      // CAN-specific fields without an autoFillSource:
      // previousNames, dualCitizenship, criminalOffence are boolean — false default is a valid answer
      expect(needsInputIds).not.toContain('previousNames');
      expect(needsInputIds).not.toContain('dualCitizenship');
      expect(needsInputIds).not.toContain('criminalOffence');
      expect(needsInputIds).toContain('maritalStatus');    // personal — country-specific
      expect(needsInputIds).toContain('immigrationStatus'); // nationality — country-specific
      expect(needsInputIds).toContain('purposeOfVisit');   // travel — country-specific
      expect(needsInputIds).toContain('fundingSource');    // travel — country-specific
    });

    it('should report correct fill statistics (autoFilled vs requiredManualCount)', () => {
      const result = generateFilledForm(mockProfile, mockCanLeg, canSchema);

      // At least the core passport/profile fields are auto-filled.
      expect(result.stats.autoFilled).toBeGreaterThan(0);
      // Country-specific fields remain for the user to answer.
      expect(result.stats.remaining).toBeGreaterThan(0);
      // The three buckets must sum to the total.
      expect(result.stats.totalFields).toBe(
        result.stats.autoFilled + result.stats.userFilled + result.stats.remaining
      );
      // There should be meaningful progress.
      expect(result.stats.completionPercentage).toBeGreaterThan(0);
      expect(result.stats.completionPercentage).toBeLessThanOrEqual(100);
    });

    it('should flag an expired passport in field-level validation output', () => {
      // The form engine still auto-fills the expired date — it does not validate.
      const result = generateFilledForm(expiredPassportProfile, mockCanLeg, canSchema);
      const allFields = result.sections.flatMap(s => s.fields);
      const fieldMap = Object.fromEntries(allFields.map(f => [f.id, f]));

      expect(fieldMap.passportExpiryDate.currentValue).toBe('2020-01-15');
      expect(fieldMap.passportExpiryDate.source).toBe('auto');

      // Running the field validator on the expired date must fail.
      const schemaField = canSchema.sections
        .flatMap(s => s.fields)
        .find(f => f.id === 'passportExpiryDate')!;

      const validation = validateField(schemaField, '2020-01-15');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeTruthy();
    });

    it('should have correct total field count matching the schema definition', () => {
      const result = generateFilledForm(mockProfile, mockCanLeg, canSchema);
      const expectedTotal = canSchema.sections.reduce(
        (sum, section) => sum + section.fields.length,
        0
      );
      expect(result.stats.totalFields).toBe(expectedTotal);
    });
  });
});

// ===========================================================================
// United Kingdom (GBR)
// ===========================================================================

describe('FormEngine — United Kingdom (GBR) Integration', () => {
  beforeEach(() => {
    clearAllCaches();
    clearPathCache();
    clearSchemaCache();
  });

  describe('generateFilledForm() with GBR schema', () => {
    it('should return a FilledForm with the correct country metadata', () => {
      const result = generateFilledForm(mockProfile, mockGbrLeg, gbrSchema);

      expect(result.countryCode).toBe('GBR');
      expect(result.countryName).toBe('United Kingdom');
      expect(result.portalName).toBe('UK Electronic Travel Authorisation (ETA)');
      expect(result.sections).toHaveLength(gbrSchema.sections.length);
    });

    it('should auto-fill core profile fields (familyName/surname, givenNames, passportNumber, nationality, dateOfBirth, gender, passportExpiry)', () => {
      const result = generateFilledForm(mockProfile, mockGbrLeg, gbrSchema);
      const allFields = result.sections.flatMap(s => s.fields);
      const fieldMap = Object.fromEntries(allFields.map(f => [f.id, f]));

      // familyName → profile.surname (GBR uses "familyName" for the surname field)
      expect(fieldMap.familyName.currentValue).toBe('JOHNSON');
      expect(fieldMap.familyName.source).toBe('auto');
      expect(fieldMap.familyName.needsUserInput).toBe(false);

      // givenNames → profile.givenNames
      expect(fieldMap.givenNames.currentValue).toBe('ALEX MORGAN');
      expect(fieldMap.givenNames.source).toBe('auto');
      expect(fieldMap.givenNames.needsUserInput).toBe(false);

      // passportNumber → profile.passportNumber
      expect(fieldMap.passportNumber.currentValue).toBe('B98765432');
      expect(fieldMap.passportNumber.source).toBe('auto');
      expect(fieldMap.passportNumber.needsUserInput).toBe(false);

      // nationality → profile.nationality
      expect(fieldMap.nationality.currentValue).toBe('AUS');
      expect(fieldMap.nationality.source).toBe('auto');
      expect(fieldMap.nationality.needsUserInput).toBe(false);

      // dateOfBirth → profile.dateOfBirth
      expect(fieldMap.dateOfBirth.currentValue).toBe('1990-03-22');
      expect(fieldMap.dateOfBirth.source).toBe('auto');
      expect(fieldMap.dateOfBirth.needsUserInput).toBe(false);

      // gender → profile.gender
      expect(fieldMap.gender.currentValue).toBe('M');
      expect(fieldMap.gender.source).toBe('auto');
      expect(fieldMap.gender.needsUserInput).toBe(false);

      // passportExpiryDate → profile.passportExpiry
      expect(fieldMap.passportExpiryDate.currentValue).toBe('2032-03-21');
      expect(fieldMap.passportExpiryDate.source).toBe('auto');
      expect(fieldMap.passportExpiryDate.needsUserInput).toBe(false);
    });

    it('should auto-fill trip leg fields (arrivalDate and UK accommodation address)', () => {
      const result = generateFilledForm(mockProfile, mockGbrLeg, gbrSchema);
      const travel = result.sections.find(s => s.id === 'travel');
      expect(travel).toBeDefined();
      const fieldMap = Object.fromEntries(travel!.fields.map(f => [f.id, f]));

      // arrivalDate → leg.arrivalDate
      expect(fieldMap.arrivalDate.currentValue).toBe('2026-07-15');
      expect(fieldMap.arrivalDate.source).toBe('auto');
      expect(fieldMap.arrivalDate.needsUserInput).toBe(false);

      // ukAddress → formatted from leg.accommodation.address (no country field in formatAddress)
      expect(fieldMap.ukAddress.currentValue).toBe('Strand, London, England, WC2R 0EZ');
      expect(fieldMap.ukAddress.source).toBe('auto');
      expect(fieldMap.ukAddress.needsUserInput).toBe(false);
    });

    it('should identify country-specific required fields that need user input (smart delta)', () => {
      const result = generateFilledForm(mockProfile, mockGbrLeg, gbrSchema);
      const allFields = result.sections.flatMap(s => s.fields);
      const fieldsNeedingInput = allFields.filter(f => f.needsUserInput && f.required);
      const needsInputIds = fieldsNeedingInput.map(f => f.id);

      // GBR-specific required fields without autoFillSource:
      expect(needsInputIds).toContain('employmentStatus');      // employment — country-specific
      expect(needsInputIds).toContain('visitPurpose');          // travel — country-specific
      // criminalRecord, immigrationBreach, ukRefusal, terrorismAssociation are boolean — false default is a valid answer
      expect(needsInputIds).not.toContain('criminalRecord');
      expect(needsInputIds).not.toContain('immigrationBreach');
      expect(needsInputIds).not.toContain('ukRefusal');
      expect(needsInputIds).not.toContain('terrorismAssociation');
    });

    it('should report correct fill statistics (autoFilled vs requiredManualCount)', () => {
      const result = generateFilledForm(mockProfile, mockGbrLeg, gbrSchema);

      expect(result.stats.autoFilled).toBeGreaterThan(0);
      expect(result.stats.remaining).toBeGreaterThan(0);
      expect(result.stats.totalFields).toBe(
        result.stats.autoFilled + result.stats.userFilled + result.stats.remaining
      );
      expect(result.stats.completionPercentage).toBeGreaterThan(0);
      expect(result.stats.completionPercentage).toBeLessThanOrEqual(100);
    });

    it('should flag an expired passport in field-level validation output', () => {
      const result = generateFilledForm(expiredPassportProfile, mockGbrLeg, gbrSchema);
      const allFields = result.sections.flatMap(s => s.fields);
      const fieldMap = Object.fromEntries(allFields.map(f => [f.id, f]));

      // Engine fills the value regardless of expiry — validation is a separate step.
      expect(fieldMap.passportExpiryDate.currentValue).toBe('2020-01-15');
      expect(fieldMap.passportExpiryDate.source).toBe('auto');

      // The field validator must reject an expired passport date.
      const schemaField = gbrSchema.sections
        .flatMap(s => s.fields)
        .find(f => f.id === 'passportExpiryDate')!;

      const validation = validateField(schemaField, '2020-01-15');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeTruthy();
    });

    it('should have correct total field count matching the schema definition', () => {
      const result = generateFilledForm(mockProfile, mockGbrLeg, gbrSchema);
      const expectedTotal = gbrSchema.sections.reduce(
        (sum, section) => sum + section.fields.length,
        0
      );
      expect(result.stats.totalFields).toBe(expectedTotal);
    });
  });
});

// ===========================================================================
// United States (USA)
// ===========================================================================

describe('FormEngine — United States (USA) Integration', () => {
  beforeEach(() => {
    clearAllCaches();
    clearPathCache();
    clearSchemaCache();
  });

  describe('generateFilledForm() with USA schema', () => {
    it('should return a FilledForm with the correct country metadata', () => {
      const result = generateFilledForm(mockProfile, mockUsaLeg, usaSchema);

      expect(result.countryCode).toBe('USA');
      expect(result.countryName).toBe('United States');
      expect(result.portalName).toBe('CBP One (Customs Declaration)');
      expect(result.sections).toHaveLength(usaSchema.sections.length);
    });

    it('should auto-fill core profile fields (surname, firstName/givenNames, passportNumber, dateOfBirth, gender, passportExpiry)', () => {
      const result = generateFilledForm(mockProfile, mockUsaLeg, usaSchema);
      const allFields = result.sections.flatMap(s => s.fields);
      const fieldMap = Object.fromEntries(allFields.map(f => [f.id, f]));

      // surname → profile.surname
      expect(fieldMap.surname.currentValue).toBe('JOHNSON');
      expect(fieldMap.surname.source).toBe('auto');
      expect(fieldMap.surname.needsUserInput).toBe(false);

      // firstName → profile.givenNames (USA maps givenNames to "firstName")
      expect(fieldMap.firstName.currentValue).toBe('ALEX MORGAN');
      expect(fieldMap.firstName.source).toBe('auto');
      expect(fieldMap.firstName.needsUserInput).toBe(false);

      // passportNumber → profile.passportNumber
      expect(fieldMap.passportNumber.currentValue).toBe('B98765432');
      expect(fieldMap.passportNumber.source).toBe('auto');
      expect(fieldMap.passportNumber.needsUserInput).toBe(false);

      // dateOfBirth → profile.dateOfBirth
      expect(fieldMap.dateOfBirth.currentValue).toBe('1990-03-22');
      expect(fieldMap.dateOfBirth.source).toBe('auto');
      expect(fieldMap.dateOfBirth.needsUserInput).toBe(false);

      // gender → profile.gender
      expect(fieldMap.gender.currentValue).toBe('M');
      expect(fieldMap.gender.source).toBe('auto');
      expect(fieldMap.gender.needsUserInput).toBe(false);

      // passportExpirationDate → profile.passportExpiry
      expect(fieldMap.passportExpirationDate.currentValue).toBe('2032-03-21');
      expect(fieldMap.passportExpirationDate.source).toBe('auto');
      expect(fieldMap.passportExpirationDate.needsUserInput).toBe(false);
    });

    it('should auto-fill US accommodation address from the trip leg', () => {
      const result = generateFilledForm(mockProfile, mockUsaLeg, usaSchema);
      const travel = result.sections.find(s => s.id === 'travel');
      expect(travel).toBeDefined();
      const fieldMap = Object.fromEntries(travel!.fields.map(f => [f.id, f]));

      // addressInUS → formatted from leg.accommodation.address
      expect(fieldMap.addressInUS.currentValue).toBe(
        '768 Fifth Avenue, New York, NY, 10019'
      );
      expect(fieldMap.addressInUS.source).toBe('auto');
      expect(fieldMap.addressInUS.needsUserInput).toBe(false);
    });

    it('should identify country-specific required fields that need user input (smart delta)', () => {
      const result = generateFilledForm(mockProfile, mockUsaLeg, usaSchema);
      const allFields = result.sections.flatMap(s => s.fields);
      const fieldsNeedingInput = allFields.filter(f => f.needsUserInput && f.required);
      const needsInputIds = fieldsNeedingInput.map(f => f.id);

      // USA-specific required fields without autoFillSource:
      // aliases, mentalDisorder, terrorism are boolean — false default is a valid answer
      expect(needsInputIds).not.toContain('aliases');
      expect(needsInputIds).not.toContain('mentalDisorder');
      expect(needsInputIds).not.toContain('terrorism');
      expect(needsInputIds).toContain('emergencyContactName');  // emergency — country-specific
      expect(needsInputIds).toContain('emergencyContactPhone'); // emergency — country-specific
      expect(needsInputIds).toContain('purposeOfTravel');       // travel — country-specific
    });

    it('should report correct fill statistics (autoFilled vs requiredManualCount)', () => {
      const result = generateFilledForm(mockProfile, mockUsaLeg, usaSchema);

      expect(result.stats.autoFilled).toBeGreaterThan(0);
      expect(result.stats.remaining).toBeGreaterThan(0);
      expect(result.stats.totalFields).toBe(
        result.stats.autoFilled + result.stats.userFilled + result.stats.remaining
      );
      expect(result.stats.completionPercentage).toBeGreaterThan(0);
      expect(result.stats.completionPercentage).toBeLessThanOrEqual(100);
    });

    it('should flag an expired passport via cross-field validation output', () => {
      // Generate the form — the engine fills passportExpirationDate with the expired value.
      const result = generateFilledForm(expiredPassportProfile, mockUsaLeg, usaSchema);
      const allFields = result.sections.flatMap(s => s.fields);
      const fieldMap = Object.fromEntries(allFields.map(f => [f.id, f]));

      expect(fieldMap.passportExpirationDate.currentValue).toBe('2020-01-15');
      expect(fieldMap.passportExpirationDate.source).toBe('auto');

      // validateFormWithCrossChecks uses the generic `passportExpiry` + `arrivalDate`
      // keys to detect an expired passport against the travel date.
      const allSchemaFields = usaSchema.sections.flatMap(s => s.fields);
      const validation = validateFormWithCrossChecks(
        allSchemaFields,
        { passportExpiry: '2020-01-15', arrivalDate: mockUsaLeg.arrivalDate },
        { countryCode: 'USA' }
      );

      expect(validation.crossFieldErrors).toContain('Passport expires before travel date');
    });

    it('should have correct total field count matching the schema definition', () => {
      const result = generateFilledForm(mockProfile, mockUsaLeg, usaSchema);
      const expectedTotal = usaSchema.sections.reduce(
        (sum, section) => sum + section.fields.length,
        0
      );
      expect(result.stats.totalFields).toBe(expectedTotal);
    });
  });
});
