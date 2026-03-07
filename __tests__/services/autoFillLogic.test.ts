import {
  intelligentAutoFill,
  batchAutoFill,
  calculateAutoFillMetrics,
  AutoFillOptions,
} from '../../src/services/forms/autoFillLogic';
import { FormField } from '../../src/types/schema';
import { TravelerProfile } from '../../src/types/profile';
import { TripLeg } from '../../src/types/trip';

const mockProfile: TravelerProfile = {
  id: '123',
  passportNumber: 'AB123456',
  surname: 'Johnson',
  givenNames: 'John Michael',
  nationality: 'USA',
  dateOfBirth: '1990-05-15',
  gender: 'M',
  passportExpiry: '2030-05-15',
  issuingCountry: 'USA',
  email: 'john.johnson@example.com',
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

const mockTripLeg: TripLeg = {
  id: 'leg-1',
  tripId: 'trip-1',
  destinationCountry: 'JPN',
  arrivalDate: '2025-07-15',
  departureDate: '2025-07-25',
  flightNumber: 'NH123',
  airlineCode: 'NH',
  arrivalAirport: 'NRT',
  accommodation: {
    name: 'Tokyo Imperial Hotel',
    address: {
      line1: '1-1-1 Uchisaiwaicho',
      line2: '',
      city: 'Chiyoda-ku',
      state: 'Tokyo',
      postalCode: '100-8558',
      country: 'JPN',
    },
    phone: '+81-3-3504-1111',
    bookingReference: 'TIH123456',
  },
  formStatus: 'not_started',
  order: 1,
};

const defaultOptions: AutoFillOptions = {
  enableSmartDefaults: true,
  enableFallbacks: true,
  confidenceThreshold: 0.7,
  countryCode: 'JPN',
};

describe('Auto-Fill Logic', () => {
  describe('intelligentAutoFill', () => {
    it('should auto-fill from profile data with high confidence', () => {
      const field: FormField = {
        id: 'surname',
        label: 'Surname',
        type: 'text',
        required: true,
        countrySpecific: false,
        autoFillSource: 'profile.surname',
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(result).not.toBeNull();
      expect(result!.value).toBe('Johnson');
      expect(result!.source).toBe('profile');
      expect(result!.confidence).toBeGreaterThan(0.9);
    });

    it('should auto-fill from trip data', () => {
      const field: FormField = {
        id: 'arrivalDate',
        label: 'Arrival Date',
        type: 'date',
        required: true,
        countrySpecific: false,
        autoFillSource: 'leg.arrivalDate',
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(result).not.toBeNull();
      expect(result!.value).toBe('2025-07-15');
      expect(result!.source).toBe('trip');
      expect(result!.confidence).toBeGreaterThan(0.9);
    });

    it('should compute duration automatically', () => {
      const field: FormField = {
        id: 'durationOfStay',
        label: 'Duration of Stay',
        type: 'number',
        required: true,
        countrySpecific: false,
        autoFillSource: 'leg._calculatedDuration',
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(result).not.toBeNull();
      expect(result!.value).toBe(10); // 10 days between arrival and departure
      expect(result!.source).toBe('computed');
      expect(result!.confidence).toBeGreaterThan(0.9);
    });

    it('should provide smart nationality prediction', () => {
      const field: FormField = {
        id: 'nationality',
        label: 'Nationality',
        type: 'text',
        required: true,
        countrySpecific: false,
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(result).not.toBeNull();
      expect(result!.value).toBe('United States');
      expect(result!.source).toBe('smart');
      expect(result!.confidence).toBeGreaterThan(0.8);
    });

    it('should predict purpose of visit', () => {
      const field: FormField = {
        id: 'purposeOfVisit',
        label: 'Purpose of Visit',
        type: 'select',
        required: true,
        countrySpecific: true,
        options: [
          { value: 'tourism', label: 'Tourism' },
          { value: 'business', label: 'Business' },
        ],
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(result).not.toBeNull();
      expect(result!.value).toBe('tourism');
      expect(result!.source).toBe('smart');
    });

    it('should provide smart declaration defaults', () => {
      const field: FormField = {
        id: 'carryingProhibitedItems',
        label: 'Carrying Prohibited Items',
        type: 'boolean',
        required: true,
        countrySpecific: false,
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(result).not.toBeNull();
      expect(result!.value).toBe(false);
      expect(result!.source).toBe('smart');
      expect(result!.confidence).toBeGreaterThan(0.8);
    });

    it('should extract airline from flight number', () => {
      const field: FormField = {
        id: 'airlineCode',
        label: 'Airline Code',
        type: 'text',
        required: true,
        countrySpecific: false,
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(result).not.toBeNull();
      expect(result!.value).toBe('NH');
      expect(result!.source).toBe('smart');
    });

    it('should provide fallback for given names to first name', () => {
      const field: FormField = {
        id: 'firstName',
        label: 'First Name',
        type: 'text',
        required: true,
        countrySpecific: false,
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(result).not.toBeNull();
      expect(result!.value).toBe('John');
      expect(result!.source).toBe('profile');
    });

    it('should respect confidence threshold', () => {
      const field: FormField = {
        id: 'unknownField',
        label: 'Unknown Field',
        type: 'text',
        required: true,
        countrySpecific: true,
      };

      const highThresholdOptions: AutoFillOptions = {
        ...defaultOptions,
        confidenceThreshold: 0.99,
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, highThresholdOptions);

      expect(result).toBeNull(); // Should not auto-fill due to low confidence
    });

    it('should handle boolean currency threshold fields', () => {
      const field: FormField = {
        id: 'currencyOver1M',
        label: 'Carrying over ¥1M',
        type: 'boolean',
        required: true,
        countrySpecific: true,
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(result).not.toBeNull();
      expect(result!.value).toBe(false);
      expect(result!.source).toBe('smart');
    });

    it('should format address intelligently', () => {
      const field: FormField = {
        id: 'homeAddress',
        label: 'Home Address',
        type: 'text',
        required: true,
        countrySpecific: false,
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(result).not.toBeNull();
      expect(result!.value).toContain('123 Main Street');
      expect(result!.value).toContain('New York');
      expect(result!.source).toBe('smart');
    });
  });

  describe('batchAutoFill', () => {
    const testFields: FormField[] = [
      {
        id: 'surname',
        label: 'Surname',
        type: 'text',
        required: true,
        countrySpecific: false,
        autoFillSource: 'profile.surname',
      },
      {
        id: 'givenNames',
        label: 'Given Names',
        type: 'text',
        required: true,
        countrySpecific: false,
        autoFillSource: 'profile.givenNames',
      },
      {
        id: 'purposeOfVisit',
        label: 'Purpose of Visit',
        type: 'select',
        required: true,
        countrySpecific: true,
        options: [
          { value: 'tourism', label: 'Tourism' },
          { value: 'business', label: 'Business' },
        ],
      },
    ];

    it('should auto-fill multiple fields at once', () => {
      const results = batchAutoFill(testFields, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(Object.keys(results)).toHaveLength(3);
      expect(results.surname.value).toBe('Johnson');
      expect(results.givenNames.value).toBe('John Michael');
      expect(results.purposeOfVisit.value).toBe('tourism');
    });

    it('should skip fields that cannot be auto-filled', () => {
      const fieldsWithUnfillable: FormField[] = [
        ...testFields,
        {
          id: 'unknownField',
          label: 'Unknown Field',
          type: 'text',
          required: true,
          countrySpecific: true,
        },
      ];

      const results = batchAutoFill(fieldsWithUnfillable, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(Object.keys(results)).toHaveLength(3); // Should not include unknownField
      expect('unknownField' in results).toBe(false);
    });
  });

  describe('calculateAutoFillMetrics', () => {
    const testFields: FormField[] = [
      {
        id: 'surname',
        label: 'Surname',
        type: 'text',
        required: true,
        countrySpecific: false,
        autoFillSource: 'profile.surname',
      },
      {
        id: 'givenNames',
        label: 'Given Names',
        type: 'text',
        required: true,
        countrySpecific: false,
        autoFillSource: 'profile.givenNames',
      },
      {
        id: 'purposeOfVisit',
        label: 'Purpose of Visit',
        type: 'select',
        required: true,
        countrySpecific: true,
      },
      {
        id: 'unknownField',
        label: 'Unknown Field',
        type: 'text',
        required: true,
        countrySpecific: true,
      },
    ];

    it('should calculate auto-fill metrics correctly', () => {
      const metrics = calculateAutoFillMetrics(testFields, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(metrics.totalFields).toBe(4);
      expect(metrics.autoFillableFields).toBeGreaterThan(0);
      expect(metrics.autoFillableFields).toBeLessThanOrEqual(4);
      expect(metrics.averageConfidence).toBeGreaterThan(0);
      expect(metrics.averageConfidence).toBeLessThanOrEqual(1);
      expect(metrics.highConfidenceFields).toBeGreaterThan(0);
    });

    it('should handle empty field list', () => {
      const metrics = calculateAutoFillMetrics([], { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(metrics.totalFields).toBe(0);
      expect(metrics.autoFillableFields).toBe(0);
      expect(metrics.averageConfidence).toBe(0);
      expect(metrics.highConfidenceFields).toBe(0);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing profile data gracefully', () => {
      const incompleteProfile: Partial<TravelerProfile> = {
        id: '123',
        surname: 'Johnson',
        // Missing other required fields
      };

      const field: FormField = {
        id: 'givenNames',
        label: 'Given Names',
        type: 'text',
        required: true,
        countrySpecific: false,
        autoFillSource: 'profile.givenNames',
      };

      const result = intelligentAutoFill(
        field,
        { profile: incompleteProfile as TravelerProfile, leg: mockTripLeg },
        defaultOptions
      );

      // Should either return null or a fallback value
      expect(result).toBeDefined();
    });

    it('should handle missing trip leg data gracefully', () => {
      const incompleteLeg: Partial<TripLeg> = {
        id: 'leg-1',
        tripId: 'trip-1',
        destinationCountry: 'JPN',
        // Missing dates and other data
      };

      const field: FormField = {
        id: 'durationOfStay',
        label: 'Duration of Stay',
        type: 'number',
        required: true,
        countrySpecific: false,
        autoFillSource: 'leg._calculatedDuration',
      };

      const result = intelligentAutoFill(
        field,
        { profile: mockProfile, leg: incompleteLeg as TripLeg },
        defaultOptions
      );

      // Should handle missing departure date gracefully
      expect(result).toBeDefined();
    });

    it('should handle invalid field types gracefully', () => {
      const field: FormField = {
        id: 'invalidField',
        label: 'Invalid Field',
        type: 'unknown' as any,
        required: true,
        countrySpecific: false,
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, defaultOptions);

      expect(result).toBeDefined(); // Should not crash
    });
  });

  describe('Country-specific behavior', () => {
    it('should adjust behavior for Japan', () => {
      const japanOptions: AutoFillOptions = {
        ...defaultOptions,
        countryCode: 'JPN',
      };

      const durationField: FormField = {
        id: 'durationOfStay',
        label: 'Duration of Stay',
        type: 'number',
        required: true,
        countrySpecific: false,
      };

      // When no departure date, should use Japan-specific default
      const { departureDate: _, ...legWithoutDepartureBase } = mockTripLeg;
      const legWithoutDeparture = legWithoutDepartureBase as TripLeg;

      const result = intelligentAutoFill(
        durationField,
        { profile: mockProfile, leg: legWithoutDeparture },
        japanOptions
      );

      expect(result).not.toBeNull();
      expect(result!.value).toBe(14); // Japan common stay duration
    });

    it('should adjust behavior for Singapore', () => {
      const singaporeOptions: AutoFillOptions = {
        ...defaultOptions,
        countryCode: 'SGP',
      };

      const durationField: FormField = {
        id: 'durationOfStay',
        label: 'Duration of Stay',
        type: 'number',
        required: true,
        countrySpecific: false,
      };

      const { departureDate: _dep, ...legWithoutDepartureBase2 } = mockTripLeg;
      const legWithoutDeparture = { ...legWithoutDepartureBase2, destinationCountry: 'SGP' } as TripLeg;

      const result = intelligentAutoFill(
        durationField,
        { profile: mockProfile, leg: legWithoutDeparture },
        singaporeOptions
      );

      expect(result).not.toBeNull();
      expect(result!.value).toBe(5); // Singapore common stay duration
    });
  });

  describe('Smart defaults with different confidence thresholds', () => {
    it('should work with low confidence threshold', () => {
      const lowThresholdOptions: AutoFillOptions = {
        ...defaultOptions,
        confidenceThreshold: 0.5,
      };

      const field: FormField = {
        id: 'purposeOfVisit',
        label: 'Purpose of Visit',
        type: 'select',
        required: true,
        countrySpecific: true,
        options: [
          { value: 'tourism', label: 'Tourism' },
          { value: 'business', label: 'Business' },
        ],
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, lowThresholdOptions);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThan(0.5);
    });

    it('should filter out low-confidence results with high threshold', () => {
      const highThresholdOptions: AutoFillOptions = {
        ...defaultOptions,
        confidenceThreshold: 0.95,
      };

      const field: FormField = {
        id: 'purposeOfVisit',
        label: 'Purpose of Visit',
        type: 'select',
        required: true,
        countrySpecific: true,
        options: [
          { value: 'tourism', label: 'Tourism' },
          { value: 'business', label: 'Business' },
        ],
      };

      const result = intelligentAutoFill(field, { profile: mockProfile, leg: mockTripLeg }, highThresholdOptions);

      // Purpose prediction might not meet 0.95 confidence threshold
      if (result) {
        expect(result.confidence).toBeGreaterThanOrEqual(0.95);
      }
    });
  });
});