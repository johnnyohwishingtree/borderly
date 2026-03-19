/**
 * Integration tests for the Form Engine using the Vietnam (VNM) schema.
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
import vnmSchemaJson from '../../../src/schemas/VNM.json';

const vnmSchema = vnmSchemaJson as CountryFormSchema;

// Mock traveler profile with realistic passport data
const mockProfile: TravelerProfile = {
  id: 'test-vnm-profile-id',
  passportNumber: 'EC1234567',
  surname: 'NGUYEN',
  givenNames: 'DAVID',
  nationality: 'AUS',
  dateOfBirth: '1988-09-21',
  gender: 'M',
  passportExpiry: '2032-09-20',
  issuingCountry: 'AUS',
  email: 'david.nguyen@example.com',
  phoneNumber: '+61412345678',
  homeAddress: {
    line1: '22 Harbour Drive',
    city: 'Sydney',
    state: 'NSW',
    postalCode: '2000',
    country: 'AUS',
  },
  occupation: 'Engineer',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock trip leg for Vietnam
const mockVnmLeg: TripLeg = {
  id: 'test-vnm-leg-id',
  tripId: 'test-trip-id',
  destinationCountry: 'VNM',
  arrivalDate: '2026-05-15',
  departureDate: '2026-05-25',
  flightNumber: 'VN780',
  airlineCode: 'VN',
  arrivalAirport: 'SGN',
  accommodation: {
    name: 'Park Hyatt Saigon',
    address: {
      line1: '2 Lam Son Square',
      city: 'Ho Chi Minh City',
      state: 'Ho Chi Minh',
      postalCode: '700000',
      country: 'VNM',
    },
    phone: '+84-28-3824-1234',
  },
  formStatus: 'not_started',
  order: 1,
};

describe('FormEngine — Vietnam (VNM) Integration', () => {
  beforeEach(() => {
    clearAllCaches();
    clearPathCache();
    clearSchemaCache();
  });

  describe('generateFilledForm() with VNM schema', () => {
    it('should return a FilledForm with the correct country metadata', () => {
      const result = generateFilledForm(mockProfile, mockVnmLeg, vnmSchema);

      expect(result.countryCode).toBe('VNM');
      expect(result.countryName).toBe('Vietnam');
      expect(result.portalName).toBe('Vietnam e-Visa Portal');
      expect(result.sections).toHaveLength(5); // personal, passport, travel, accommodation, contact
    });

    it('should auto-fill personal information fields from the profile', () => {
      const result = generateFilledForm(mockProfile, mockVnmLeg, vnmSchema);
      const personal = result.sections.find(s => s.id === 'personal');
      expect(personal).toBeDefined();

      const fieldMap = Object.fromEntries(personal!.fields.map(f => [f.id, f]));

      // Surname → profile.surname
      expect(fieldMap.surname.currentValue).toBe('NGUYEN');
      expect(fieldMap.surname.source).toBe('auto');
      expect(fieldMap.surname.needsUserInput).toBe(false);

      // Given name → profile.givenNames
      expect(fieldMap.givenName.currentValue).toBe('DAVID');
      expect(fieldMap.givenName.source).toBe('auto');
      expect(fieldMap.givenName.needsUserInput).toBe(false);

      // Date of birth → profile.dateOfBirth
      expect(fieldMap.dateOfBirth.currentValue).toBe('1988-09-21');
      expect(fieldMap.dateOfBirth.source).toBe('auto');
      expect(fieldMap.dateOfBirth.needsUserInput).toBe(false);

      // Gender → profile.gender
      expect(fieldMap.gender.currentValue).toBe('M');
      expect(fieldMap.gender.source).toBe('auto');
      expect(fieldMap.gender.needsUserInput).toBe(false);

      // Nationality → profile.nationality
      expect(fieldMap.nationality.currentValue).toBe('AUS');
      expect(fieldMap.nationality.source).toBe('auto');
      expect(fieldMap.nationality.needsUserInput).toBe(false);
    });

    it('should auto-fill passport information fields from the profile', () => {
      const result = generateFilledForm(mockProfile, mockVnmLeg, vnmSchema);
      const passport = result.sections.find(s => s.id === 'passport');
      expect(passport).toBeDefined();

      const fieldMap = Object.fromEntries(passport!.fields.map(f => [f.id, f]));

      // Passport number → profile.passportNumber
      expect(fieldMap.passportNumber.currentValue).toBe('EC1234567');
      expect(fieldMap.passportNumber.source).toBe('auto');
      expect(fieldMap.passportNumber.needsUserInput).toBe(false);

      // Passport expiry → profile.passportExpiry
      expect(fieldMap.passportExpiry.currentValue).toBe('2032-09-20');
      expect(fieldMap.passportExpiry.source).toBe('auto');
      expect(fieldMap.passportExpiry.needsUserInput).toBe(false);
    });

    it('should auto-fill travel information fields from the trip leg', () => {
      const result = generateFilledForm(mockProfile, mockVnmLeg, vnmSchema);
      const travel = result.sections.find(s => s.id === 'travel');
      expect(travel).toBeDefined();

      const fieldMap = Object.fromEntries(travel!.fields.map(f => [f.id, f]));

      // Entry date → leg.arrivalDate
      expect(fieldMap.entryDate.currentValue).toBe('2026-05-15');
      expect(fieldMap.entryDate.source).toBe('auto');
      expect(fieldMap.entryDate.needsUserInput).toBe(false);

      // Stay duration → computed from departure - arrival (10 days)
      expect(fieldMap.stayDuration.currentValue).toBe(10);
      expect(fieldMap.stayDuration.source).toBe('auto');
      expect(fieldMap.stayDuration.needsUserInput).toBe(false);
    });

    it('should auto-fill accommodation fields from the trip leg', () => {
      const result = generateFilledForm(mockProfile, mockVnmLeg, vnmSchema);
      const accommodation = result.sections.find(s => s.id === 'accommodation');
      expect(accommodation).toBeDefined();

      const fieldMap = Object.fromEntries(accommodation!.fields.map(f => [f.id, f]));

      // Hotel name → leg.accommodation.name
      expect(fieldMap.hotelName.currentValue).toBe('Park Hyatt Saigon');
      expect(fieldMap.hotelName.source).toBe('auto');
      expect(fieldMap.hotelName.needsUserInput).toBe(false);

      // Hotel address → formatted from leg.accommodation.address
      expect(fieldMap.hotelAddress.currentValue).toBe('2 Lam Son Square, Ho Chi Minh City, Ho Chi Minh, 700000');
      expect(fieldMap.hotelAddress.source).toBe('auto');
      expect(fieldMap.hotelAddress.needsUserInput).toBe(false);

      // Hotel phone → leg.accommodation.phone
      expect(fieldMap.hotelPhone.currentValue).toBe('+84-28-3824-1234');
      expect(fieldMap.hotelPhone.source).toBe('auto');
      expect(fieldMap.hotelPhone.needsUserInput).toBe(false);
    });

    it('should auto-fill email from the profile in the contact section', () => {
      const result = generateFilledForm(mockProfile, mockVnmLeg, vnmSchema);
      const contact = result.sections.find(s => s.id === 'contact');
      expect(contact).toBeDefined();

      const fieldMap = Object.fromEntries(contact!.fields.map(f => [f.id, f]));

      // Email → profile.email
      expect(fieldMap.email.currentValue).toBe('david.nguyen@example.com');
      expect(fieldMap.email.source).toBe('auto');
      expect(fieldMap.email.needsUserInput).toBe(false);
    });

    it('should identify required fields that need user input (smart delta)', () => {
      const result = generateFilledForm(mockProfile, mockVnmLeg, vnmSchema);
      const allFields = result.sections.flatMap(s => s.fields);
      const fieldsNeedingInput = allFields.filter(f => f.needsUserInput && f.required);

      const needsInputIds = fieldsNeedingInput.map(f => f.id);

      // Vietnam-specific fields that cannot be auto-filled from profile:
      expect(needsInputIds).toContain('religion');              // country-specific, no autoFill
      expect(needsInputIds).toContain('purposeOfVisit');        // country-specific, no autoFill
      expect(needsInputIds).toContain('entryPort');             // country-specific, no autoFill
      expect(needsInputIds).toContain('previousVietnamVisit');  // country-specific, no autoFill
      expect(needsInputIds).toContain('accommodationType');     // country-specific, no autoFill
      expect(needsInputIds).toContain('cityOfStay');            // country-specific, no autoFill
      expect(needsInputIds).toContain('emergencyContactName');  // country-specific, no autoFill
      expect(needsInputIds).toContain('emergencyContactPhone'); // country-specific, no autoFill
    });

    it('should report autoFilled count > 0 in fill statistics', () => {
      const result = generateFilledForm(mockProfile, mockVnmLeg, vnmSchema);

      expect(result.stats.autoFilled).toBeGreaterThan(0);
      expect(result.stats.totalFields).toBeGreaterThan(0);
      expect(result.stats.remaining).toBeGreaterThan(0);
    });

    it('should have correct total field count matching schema sections', () => {
      const result = generateFilledForm(mockProfile, mockVnmLeg, vnmSchema);

      const expectedTotal = vnmSchema.sections.reduce(
        (sum, section) => sum + section.fields.length,
        0
      );
      expect(result.stats.totalFields).toBe(expectedTotal);
    });

    it('should report a non-zero completion percentage', () => {
      const result = generateFilledForm(mockProfile, mockVnmLeg, vnmSchema);

      expect(result.stats.completionPercentage).toBeGreaterThan(0);
      expect(result.stats.completionPercentage).toBeLessThan(100);
    });

    it('should use existing form data for previously answered country-specific fields', () => {
      const existingData = {
        religion: 'none',
        purposeOfVisit: 'tourism',
        entryPort: 'SGN',
        previousVietnamVisit: false,
        accommodationType: 'hotel',
        cityOfStay: 'ho_chi_minh',
        emergencyContactName: 'Mary Nguyen',
        emergencyContactPhone: '+61412345679',
        passportType: 'ordinary',
        passportIssuingAuthority: 'Australian Passport Office',
      };

      const result = generateFilledForm(mockProfile, mockVnmLeg, vnmSchema, existingData);
      const allFields = result.sections.flatMap(s => s.fields);
      const fieldMap = Object.fromEntries(allFields.map(f => [f.id, f]));

      expect(fieldMap.religion.currentValue).toBe('none');
      expect(fieldMap.religion.source).toBe('user');
      expect(fieldMap.religion.needsUserInput).toBe(false);

      expect(fieldMap.purposeOfVisit.currentValue).toBe('tourism');
      expect(fieldMap.purposeOfVisit.source).toBe('user');
      expect(fieldMap.purposeOfVisit.needsUserInput).toBe(false);

      expect(fieldMap.entryPort.currentValue).toBe('SGN');
      expect(fieldMap.entryPort.source).toBe('user');
      expect(fieldMap.entryPort.needsUserInput).toBe(false);
    });

    it('should ensure all required fields are present in the output', () => {
      const result = generateFilledForm(mockProfile, mockVnmLeg, vnmSchema);
      const allFields = result.sections.flatMap(s => s.fields);
      const requiredFieldIds = vnmSchema.sections
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
