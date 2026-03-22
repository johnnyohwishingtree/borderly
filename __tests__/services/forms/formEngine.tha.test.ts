/**
 * Integration tests for the Form Engine using the Thailand (THA) schema.
 *
 * These tests verify that generateFilledForm() correctly auto-fills fields
 * from a mock traveler profile, identifies fields that need manual input,
 * and produces accurate fill statistics.
 */

import {
  generateFilledForm,
  clearAllCaches,
} from '../../../src/services/forms/formEngine';
import { clearPathCache } from '../../../src/services/forms/fieldMapper';
import { clearSchemaCache } from '../../../src/services/schemas/schemaLoader';
import { TravelerProfile } from '../../../src/types/profile';
import { TripLeg } from '../../../src/types/trip';
import { CountryFormSchema } from '../../../src/types/schema';
import thaSchemaJson from '../../../src/schemas/THA.json';

const thaSchema = thaSchemaJson as CountryFormSchema;

// Mock traveler profile with realistic passport data
const mockProfile: TravelerProfile = {
  id: 'test-tha-profile-id',
  passportNumber: 'A12345678',
  surname: 'SMITH',
  givenNames: 'JANE ALICE',
  nationality: 'GBR',
  dateOfBirth: '1985-06-15',
  gender: 'F',
  passportExpiry: '2031-06-14',
  issuingCountry: 'GBR',
  email: 'jane.smith@example.com',
  phoneNumber: '+447712345678',
  homeAddress: {
    line1: '45 Baker Street',
    city: 'London',
    state: 'England',
    postalCode: 'NW1 6XE',
    country: 'GBR',
  },
  occupation: 'Teacher',
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

// Mock trip leg for Thailand
const mockThaLeg: TripLeg = {
  id: 'test-tha-leg-id',
  tripId: 'test-trip-id',
  destinationCountry: 'THA',
  arrivalDate: '2026-04-10',
  departureDate: '2026-04-24',
  flightNumber: 'TG916',
  airlineCode: 'TG',
  arrivalAirport: 'BKK',
  accommodation: {
    name: 'Mandarin Oriental Bangkok',
    address: {
      line1: '48 Oriental Avenue',
      city: 'Bangkok',
      state: 'Bangkok',
      postalCode: '10500',
      country: 'THA',
    },
    phone: '+66-2-659-9000',
  },
  formStatus: 'not_started',
  order: 1,
};

describe('FormEngine — Thailand (THA) Integration', () => {
  beforeEach(() => {
    clearAllCaches();
    clearPathCache();
    clearSchemaCache();
  });

  describe('generateFilledForm() with THA schema', () => {
    it('should return a FilledForm with the correct country metadata', () => {
      const result = generateFilledForm(mockProfile, mockThaLeg, thaSchema);

      expect(result.countryCode).toBe('THA');
      expect(result.countryName).toBe('Thailand');
      expect(result.portalName).toBe('Thailand Digital Arrival Card (Coming Soon)');
      expect(result.sections).toHaveLength(4); // personal, travel, accommodation, health
    });

    it('should auto-fill personal information fields from the profile', () => {
      const result = generateFilledForm(mockProfile, mockThaLeg, thaSchema);
      const personal = result.sections.find(s => s.id === 'personal');
      expect(personal).toBeDefined();

      const fields = personal!.fields;
      const fieldMap = Object.fromEntries(fields.map(f => [f.id, f]));

      // First name → profile.givenNames
      expect(fieldMap.firstName.currentValue).toBe('JANE ALICE');
      expect(fieldMap.firstName.source).toBe('auto');
      expect(fieldMap.firstName.needsUserInput).toBe(false);

      // Last name → profile.surname
      expect(fieldMap.lastName.currentValue).toBe('SMITH');
      expect(fieldMap.lastName.source).toBe('auto');
      expect(fieldMap.lastName.needsUserInput).toBe(false);

      // Date of birth → profile.dateOfBirth
      expect(fieldMap.dateOfBirth.currentValue).toBe('1985-06-15');
      expect(fieldMap.dateOfBirth.source).toBe('auto');
      expect(fieldMap.dateOfBirth.needsUserInput).toBe(false);

      // Nationality → profile.nationality
      expect(fieldMap.nationality.currentValue).toBe('GBR');
      expect(fieldMap.nationality.source).toBe('auto');
      expect(fieldMap.nationality.needsUserInput).toBe(false);

      // Passport number → profile.passportNumber
      expect(fieldMap.passportNumber.currentValue).toBe('A12345678');
      expect(fieldMap.passportNumber.source).toBe('auto');
      expect(fieldMap.passportNumber.needsUserInput).toBe(false);

      // Passport expiry → profile.passportExpiry
      expect(fieldMap.passportExpiry.currentValue).toBe('2031-06-14');
      expect(fieldMap.passportExpiry.source).toBe('auto');
      expect(fieldMap.passportExpiry.needsUserInput).toBe(false);
    });

    it('should auto-fill travel information fields from the trip leg', () => {
      const result = generateFilledForm(mockProfile, mockThaLeg, thaSchema);
      const travel = result.sections.find(s => s.id === 'travel');
      expect(travel).toBeDefined();

      const fieldMap = Object.fromEntries(travel!.fields.map(f => [f.id, f]));

      // Arrival date → leg.arrivalDate
      expect(fieldMap.arrivalDate.currentValue).toBe('2026-04-10');
      expect(fieldMap.arrivalDate.source).toBe('auto');
      expect(fieldMap.arrivalDate.needsUserInput).toBe(false);

      // Flight number → leg.flightNumber
      expect(fieldMap.flightNumber.currentValue).toBe('TG916');
      expect(fieldMap.flightNumber.source).toBe('auto');
      expect(fieldMap.flightNumber.needsUserInput).toBe(false);

      // Length of stay → computed from departure - arrival (14 days)
      expect(fieldMap.lengthOfStay.currentValue).toBe(14);
      expect(fieldMap.lengthOfStay.source).toBe('auto');
      expect(fieldMap.lengthOfStay.needsUserInput).toBe(false);
    });

    it('should auto-fill accommodation fields from the trip leg', () => {
      const result = generateFilledForm(mockProfile, mockThaLeg, thaSchema);
      const accommodation = result.sections.find(s => s.id === 'accommodation');
      expect(accommodation).toBeDefined();

      const fieldMap = Object.fromEntries(accommodation!.fields.map(f => [f.id, f]));

      // Hotel name → leg.accommodation.name
      expect(fieldMap.hotelName.currentValue).toBe('Mandarin Oriental Bangkok');
      expect(fieldMap.hotelName.source).toBe('auto');
      expect(fieldMap.hotelName.needsUserInput).toBe(false);

      // Hotel address → formatted from leg.accommodation.address
      expect(fieldMap.hotelAddress.currentValue).toBe('48 Oriental Avenue, Bangkok, Bangkok, 10500');
      expect(fieldMap.hotelAddress.source).toBe('auto');
      expect(fieldMap.hotelAddress.needsUserInput).toBe(false);

      // Hotel phone → leg.accommodation.phone
      expect(fieldMap.hotelPhone.currentValue).toBe('+66-2-659-9000');
      expect(fieldMap.hotelPhone.source).toBe('auto');
    });

    it('should identify required fields that need user input (smart delta)', () => {
      const result = generateFilledForm(mockProfile, mockThaLeg, thaSchema);

      const allFields = result.sections.flatMap(s => s.fields);
      const fieldsNeedingInput = allFields.filter(f => f.needsUserInput && f.required);

      // These trip-specific/country-specific fields cannot be auto-filled:
      const needsInputIds = fieldsNeedingInput.map(f => f.id);
      expect(needsInputIds).toContain('departureCountry'); // no autoFillSource
      expect(needsInputIds).toContain('purposeOfVisit');   // country-specific, no autoFill
      expect(needsInputIds).toContain('accommodationType'); // country-specific, no autoFill
      expect(needsInputIds).toContain('vaccinationStatus'); // health/country-specific
      // hasInsurance is boolean — false default is a valid answer
      expect(needsInputIds).not.toContain('hasInsurance');
      expect(needsInputIds).toContain('emergencyContact');  // health/country-specific
    });

    it('should report autoFilled count > 0 in fill statistics', () => {
      const result = generateFilledForm(mockProfile, mockThaLeg, thaSchema);

      expect(result.stats.autoFilled).toBeGreaterThan(0);
      expect(result.stats.totalFields).toBeGreaterThan(0);
      expect(result.stats.remaining).toBeGreaterThan(0);
    });

    it('should have correct total field count matching schema sections', () => {
      const result = generateFilledForm(mockProfile, mockThaLeg, thaSchema);

      const expectedTotal = thaSchema.sections.reduce(
        (sum, section) => sum + section.fields.length,
        0
      );
      expect(result.stats.totalFields).toBe(expectedTotal);
    });

    it('should report a non-zero completion percentage', () => {
      const result = generateFilledForm(mockProfile, mockThaLeg, thaSchema);

      expect(result.stats.completionPercentage).toBeGreaterThan(0);
      expect(result.stats.completionPercentage).toBeLessThan(100);
    });

    it('should use existing form data when provided for previously answered fields', () => {
      const existingData = {
        purposeOfVisit: 'tourism',
        vaccinationStatus: 'fully_vaccinated',
        hasInsurance: true,
        emergencyContact: 'Mandarin Oriental Bangkok: +66-2-659-9000',
        departureCountry: 'Singapore',
        accommodationType: 'hotel',
      };

      const result = generateFilledForm(mockProfile, mockThaLeg, thaSchema, existingData);
      const allFields = result.sections.flatMap(s => s.fields);
      const fieldMap = Object.fromEntries(allFields.map(f => [f.id, f]));

      expect(fieldMap.purposeOfVisit.currentValue).toBe('tourism');
      expect(fieldMap.purposeOfVisit.source).toBe('user');
      expect(fieldMap.purposeOfVisit.needsUserInput).toBe(false);

      expect(fieldMap.vaccinationStatus.currentValue).toBe('fully_vaccinated');
      expect(fieldMap.vaccinationStatus.source).toBe('user');
      expect(fieldMap.vaccinationStatus.needsUserInput).toBe(false);
    });

    it('should ensure all required fields are present in the output', () => {
      const result = generateFilledForm(mockProfile, mockThaLeg, thaSchema);
      const allFields = result.sections.flatMap(s => s.fields);
      const requiredFieldIds = thaSchema.sections
        .flatMap(s => s.fields)
        .filter(f => f.required)
        .map(f => f.id);

      const outputFieldIds = allFields.map(f => f.id);
      for (const id of requiredFieldIds) {
        expect(outputFieldIds).toContain(id);
      }
    });
  });
});
