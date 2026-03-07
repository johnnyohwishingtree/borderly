// Use performance API (available in Node.js and browsers)
import {
  generateFilledForm,
  clearAllCaches,
  getCacheStats,
} from '../../src/services/forms/formEngine';
import { clearPathCache } from '../../src/services/forms/fieldMapper';
import { clearSchemaCache } from '../../src/services/schemas/schemaLoader';
import { TravelerProfile } from '../../src/types/profile';
import { TripLeg } from '../../src/types/trip';
import { CountryFormSchema } from '../../src/types/schema';

// Mock data for performance testing
const mockProfile: TravelerProfile = {
  id: 'test-profile-123',
  passportNumber: 'AB1234567',
  givenNames: 'John',
  surname: 'Doe',
  dateOfBirth: '1990-01-01',
  nationality: 'US',
  gender: 'M',
  passportExpiry: '2030-01-01',
  issuingCountry: 'US',
  homeAddress: {
    line1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
  },
  email: 'john.doe@example.com',
  phoneNumber: '+1234567890',
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

const mockLeg: TripLeg = {
  id: 'test-leg-456',
  tripId: 'test-trip-123',
  destinationCountry: 'JPN',
  arrivalDate: '2024-06-01',
  departureDate: '2024-06-07',
  accommodation: {
    name: 'Hotel Tokyo',
    address: {
      line1: '1-1-1 Shibuya',
      city: 'Tokyo',
      state: 'Tokyo',
      postalCode: '150-0002',
      country: 'JP',
    },
    phone: '+81-3-1234-5678',
  },
  formStatus: 'not_started',
  order: 1,
};

const mockSchema: CountryFormSchema = {
  countryCode: 'JPN',
  countryName: 'Japan',
  schemaVersion: '2024.1',
  lastUpdated: '2024-01-01',
  portalUrl: 'https://www.vjw.digital.go.jp/',
  portalName: 'Visit Japan Web',
  submission: {
    earliestBeforeArrival: '24 hours',
    latestBeforeArrival: '1 hour',
    recommended: '72 hours',
  },
  sections: [
    {
      id: 'personal',
      title: 'Personal Information',
      fields: [
        {
          id: 'family_name',
          label: 'Family Name',
          type: 'text',
          required: true,
          autoFillSource: 'profile.surname',
          countrySpecific: false,
        },
        {
          id: 'given_name',
          label: 'Given Name',
          type: 'text',
          required: true,
          autoFillSource: 'profile.givenNames',
          countrySpecific: false,
        },
        {
          id: 'passport_number',
          label: 'Passport Number',
          type: 'text',
          required: true,
          autoFillSource: 'profile.passportNumber',
          countrySpecific: false,
        },
        {
          id: 'date_of_birth',
          label: 'Date of Birth',
          type: 'date',
          required: true,
          autoFillSource: 'profile.dateOfBirth',
          countrySpecific: false,
        },
        {
          id: 'nationality',
          label: 'Nationality',
          type: 'select',
          required: true,
          autoFillSource: 'profile.nationality',
          countrySpecific: false,
          options: [
            { value: 'US', label: 'United States' },
            { value: 'CA', label: 'Canada' },
            { value: 'GB', label: 'United Kingdom' },
          ],
        },
      ],
    },
    {
      id: 'travel',
      title: 'Travel Information',
      fields: [
        {
          id: 'arrival_date',
          label: 'Arrival Date',
          type: 'date',
          required: true,
          autoFillSource: 'leg.arrivalDate',
          countrySpecific: false,
        },
        {
          id: 'departure_date',
          label: 'Departure Date',
          type: 'date',
          required: true,
          autoFillSource: 'leg.departureDate',
          countrySpecific: false,
        },
        {
          id: 'duration_of_stay',
          label: 'Duration of Stay (days)',
          type: 'number',
          required: true,
          autoFillSource: 'leg._calculatedDuration',
          countrySpecific: false,
        },
        {
          id: 'purpose_of_visit',
          label: 'Purpose of Visit',
          type: 'select',
          required: true,
          autoFillSource: 'leg.purpose',
          countrySpecific: false,
          options: [
            { value: 'Tourism', label: 'Tourism' },
            { value: 'Business', label: 'Business' },
            { value: 'Transit', label: 'Transit' },
          ],
        },
      ],
    },
    {
      id: 'accommodation',
      title: 'Accommodation Details',
      fields: [
        {
          id: 'hotel_name',
          label: 'Hotel Name',
          type: 'text',
          required: true,
          autoFillSource: 'leg.accommodation.name',
          countrySpecific: false,
        },
        {
          id: 'hotel_address',
          label: 'Hotel Address',
          type: 'textarea',
          required: true,
          autoFillSource: 'leg.accommodation.address._formatted',
          countrySpecific: false,
        },
        {
          id: 'hotel_phone',
          label: 'Hotel Phone',
          type: 'text',
          required: false,
          autoFillSource: 'leg.accommodation.phone',
          countrySpecific: false,
        },
        {
          id: 'arrival_flight',
          label: 'Arrival Flight',
          type: 'text',
          required: false,
          countrySpecific: true,
        },
      ],
    },
  ],
  submissionGuide: [
    {
      order: 1,
      title: 'Login to Visit Japan Web',
      description: 'Access the official portal',
      fieldsOnThisScreen: [],
    },
    {
      order: 2,
      title: 'Fill Personal Information',
      description: 'Enter your passport and personal details',
      fieldsOnThisScreen: ['family_name', 'given_name', 'passport_number', 'date_of_birth', 'nationality'],
    },
    {
      order: 3,
      title: 'Fill Travel Information',
      description: 'Enter your travel dates and purpose',
      fieldsOnThisScreen: ['arrival_date', 'departure_date', 'duration_of_stay', 'purpose_of_visit'],
    },
    {
      order: 4,
      title: 'Fill Accommodation Details',
      description: 'Enter your hotel information',
      fieldsOnThisScreen: ['hotel_name', 'hotel_address', 'hotel_phone'],
    },
  ],
};

describe('Form Engine Performance', () => {
  beforeEach(() => {
    // Clear all caches before each test to ensure consistent measurements
    clearAllCaches();
    clearPathCache();
    clearSchemaCache();
  });

  describe('Form Generation Performance', () => {
    it('should generate a form in under 500ms (cold cache)', () => {
      const startTime = performance.now();
      
      const result = generateFilledForm(mockProfile, mockLeg, mockSchema);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500);
      expect(result).toBeDefined();
      expect(result.sections).toHaveLength(3);
      expect(result.stats.totalFields).toBe(13);
      
      // Cold cache generation completed
    });

    it('should generate a form much faster with warm cache', () => {
      // First generation (cold cache)
      const coldStart = performance.now();
      generateFilledForm(mockProfile, mockLeg, mockSchema);
      const coldEnd = performance.now();
      const coldDuration = coldEnd - coldStart;

      // Second generation (warm cache)
      const warmStart = performance.now();
      const result = generateFilledForm(mockProfile, mockLeg, mockSchema);
      const warmEnd = performance.now();
      const warmDuration = warmEnd - warmStart;

      expect(warmDuration).toBeLessThan(coldDuration);
      expect(warmDuration).toBeLessThan(50); // Should be much faster with cache
      expect(result).toBeDefined();
      
      // Cache speedup verification completed
    });

    it('should handle multiple form generations efficiently', () => {
      const iterations = 100;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        generateFilledForm(mockProfile, mockLeg, mockSchema);
      }
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / iterations;
      
      expect(avgDuration).toBeLessThan(10); // Average should be very fast due to caching
      
      // Multiple iterations test completed
    });

    it('should efficiently handle different profiles with similar data', () => {
      const profiles = Array.from({ length: 10 }, (_, i) => ({
        ...mockProfile,
        id: `profile-${i}`,
        givenNames: `John${i}`,
        passportNumber: `AB${i.toString().padStart(7, '0')}`,
      }));

      const startTime = performance.now();
      
      const results = profiles.map(profile => 
        generateFilledForm(profile, mockLeg, mockSchema)
      );
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / profiles.length;
      
      expect(avgDuration).toBeLessThan(100); // Should benefit from field-level caching
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.stats.totalFields).toBe(13);
      });
      
      // Different profiles test completed
    });
  });

  describe('Cache Efficiency', () => {
    it('should populate caches during form generation', () => {
      const initialStats = getCacheStats();
      expect(initialStats.formCache.size).toBe(0);
      expect(initialStats.fieldCache.size).toBe(0);

      generateFilledForm(mockProfile, mockLeg, mockSchema);

      const afterStats = getCacheStats();
      expect(afterStats.formCache.size).toBeGreaterThan(0);
      expect(afterStats.fieldCache.size).toBeGreaterThan(0);
      
      // Cache population verified
    });

    it('should handle cache misses gracefully with different inputs', () => {
      const profile1 = { ...mockProfile, id: 'profile-1' };
      const profile2 = { ...mockProfile, id: 'profile-2' };
      const leg1 = { ...mockLeg, id: 'leg-1' };
      const leg2 = { ...mockLeg, id: 'leg-2', arrivalDate: '2024-07-01' };

      const startTime = performance.now();
      
      // Generate forms with different combinations
      generateFilledForm(profile1, leg1, mockSchema);
      generateFilledForm(profile1, leg2, mockSchema);
      generateFilledForm(profile2, leg1, mockSchema);
      generateFilledForm(profile2, leg2, mockSchema);
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      expect(totalDuration).toBeLessThan(2000); // 4 generations should complete within 2s
      
      // Unique combinations test completed
    });
  });

  describe('Memory Management', () => {
    it('should maintain reasonable cache sizes', () => {
      // Generate many forms to test cache growth
      for (let i = 0; i < 50; i++) {
        const profile = { ...mockProfile, id: `profile-${i}` };
        const leg = { ...mockLeg, id: `leg-${i}`, tripId: `trip-${i}`, arrivalDate: `2024-${(i % 12 + 1).toString().padStart(2, '0')}-01` };
        generateFilledForm(profile, leg, mockSchema);
      }

      const stats = getCacheStats();
      
      // Cache should grow but not unboundedly
      expect(stats.formCache.size).toBeLessThan(100);
      expect(stats.fieldCache.size).toBeLessThan(700);
      
      // Memory management test completed
    });
  });

  describe('Edge Cases Performance', () => {
    it('should handle schemas with many fields efficiently', () => {
      const largeSchema: CountryFormSchema = {
        ...mockSchema,
        sections: [
          ...mockSchema.sections,
          {
            id: 'additional',
            title: 'Additional Fields',
            fields: Array.from({ length: 50 }, (_, i) => ({
              id: `field_${i}`,
              label: `Field ${i}`,
              type: 'text' as const,
              required: false,
              countrySpecific: i % 3 === 0,
            })),
          },
        ],
      };

      const startTime = performance.now();
      const result = generateFilledForm(mockProfile, mockLeg, largeSchema);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should handle large schemas under 1s
      expect(result.stats.totalFields).toBe(63); // 13 original + 50 additional
      
      // Large schema test completed
    });

    it('should handle forms with existing data efficiently', () => {
      const existingData = {
        family_name: 'Smith',
        given_name: 'Jane',
        custom_field: 'custom_value',
      };

      const startTime = performance.now();
      const result = generateFilledForm(mockProfile, mockLeg, mockSchema, existingData);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500);
      expect(result.stats.userFilled).toBeGreaterThan(0);
      
      // Existing data test completed
    });
  });
});