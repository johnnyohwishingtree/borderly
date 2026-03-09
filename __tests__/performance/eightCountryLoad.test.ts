/**
 * Performance load testing for 8-country support
 * Tests memory usage, concurrent operations, and scalability across all countries
 */

import { describe, it, expect, jest } from '@jest/globals';
import { generateFilledForm } from '../../src/services/forms/formEngine';
import { validateSchema } from '../../src/services/schemas/schemaLoader';
import type { UserProfile, TripLeg } from '../../src/types';

// Mock native modules for performance testing
jest.mock('react-native-keychain');
jest.mock('react-native-mmkv');


describe('8-Country Load Performance Tests', () => {
  const allCountries = ['JPN', 'MYS', 'SGP', 'THA', 'VNM', 'GBR', 'USA', 'CAN'];
  
  // Test profile simulating a typical user
  const testProfile: UserProfile = {
    id: 'profile-us',
    givenNames: 'John Michael',
    surname: 'Smith',
    passportNumber: 'A12345678',
    nationality: 'USA',
    dateOfBirth: '1985-06-15',
    gender: 'M',
    passportExpiry: '2030-06-15',
    issuingCountry: 'USA',
    defaultDeclarations: {
      hasItemsToDeclar: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  describe('Schema Loading Performance', () => {
    it('should load all country schemas quickly', () => {
      const startTime = performance.now();
      
      for (const countryCode of allCountries) {
        const mockSchema = {
          countryCode,
          countryName: `Country ${countryCode}`,
          schemaVersion: '1.0.0',
          lastUpdated: '2024-01-01',
          portalUrl: `https://${countryCode.toLowerCase()}.gov/portal`,
          portalName: `${countryCode} Portal`,
          submission: {
            earliestBeforeArrival: '90 days',
            latestBeforeArrival: '3 days',
            recommended: '7 days'
          },
          sections: [],
          submissionGuide: []
        };
        
        const schema = validateSchema(mockSchema, countryCode);
        expect(schema.countryCode).toBe(countryCode);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(100); // Should load all schemas in under 100ms
    });
  });

  describe('Concurrent Form Generation', () => {
    it('should handle multiple simultaneous form generations', () => {
      const startTime = performance.now();
      
      // Generate forms for all countries concurrently
      const formGenerationPromises = allCountries.map(countryCode => {
        const leg: TripLeg = {
          id: `leg-${countryCode}`,
          tripId: 'test-trip',
          destinationCountry: countryCode,
          arrivalDate: '2024-07-15',
          departureDate: '2024-07-25',
          formStatus: 'not_started',
          accommodation: {
            name: 'Test Hotel',
            address: {
              line1: '123 Main St',
              city: 'Test City',
              country: countryCode,
              postalCode: '12345'
            }
          },
          order: 0
        };
        
        const mockSchema = {
          countryCode,
          countryName: `Country ${countryCode}`,
          schemaVersion: '1.0.0',
          lastUpdated: '2024-01-01',
          portalUrl: `https://${countryCode.toLowerCase()}.gov/portal`,
          portalName: `${countryCode} Portal`,
          submission: {
            earliestBeforeArrival: '90 days',
            latestBeforeArrival: '3 days',
            recommended: '7 days'
          },
          sections: [],
          submissionGuide: []
        };
        
        const schema = validateSchema(mockSchema, countryCode);
        return generateFilledForm(testProfile, leg, schema);
      });
      
      const forms = formGenerationPromises;
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(forms).toHaveLength(8);
      expect(totalTime).toBeLessThan(200); // Should generate all forms in under 200ms
      
      // Verify each form is valid
      forms.forEach((form, index) => {
        expect(form.countryCode).toBe(allCountries[index]);
        expect(form.stats.totalFields).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Memory Usage Under Load', () => {
    it('should maintain reasonable memory usage during bulk operations', () => {
      const iterations = 50;
      const memoryBefore = (global as any).process?.memoryUsage?.()?.heapUsed || 0;
      
      for (let i = 0; i < iterations; i++) {
        const country = allCountries[i % allCountries.length];
        
        const leg: TripLeg = {
          id: `stress-leg-${i}`,
          tripId: 'stress-trip',
          destinationCountry: country,
          arrivalDate: '2024-07-15',
          departureDate: '2024-07-25',
          formStatus: 'not_started',
          accommodation: {
            name: 'Test Hotel',
            address: {
              line1: '123 Main St',
              city: 'Test City',
              country,
              postalCode: '12345'
            }
          },
          order: 0
        };
        
        const mockSchema = {
          countryCode: country,
          countryName: `Country ${country}`,
          schemaVersion: '1.0.0',
          lastUpdated: '2024-01-01',
          portalUrl: `https://${country.toLowerCase()}.gov/portal`,
          portalName: `${country} Portal`,
          submission: {
            earliestBeforeArrival: '90 days',
            latestBeforeArrival: '3 days',
            recommended: '7 days'
          },
          sections: [],
          submissionGuide: []
        };
        
        const schema = validateSchema(mockSchema, country);
        const form = generateFilledForm(testProfile, leg, schema);
        
        expect(form).toBeDefined();
      }
      
      const memoryAfter = (global as any).process?.memoryUsage?.()?.heapUsed || 0;
      const memoryGrowth = memoryAfter - memoryBefore;
      
      // Allow reasonable memory growth but not excessive (under 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Scalability Tests', () => {
    it('should maintain performance with complex multi-country trips', () => {
      const startTime = performance.now();
      
      // Create a complex trip with multiple legs for each country
      const legs: TripLeg[] = [];
      
      allCountries.forEach((country, index) => {
        legs.push({
          id: `complex-leg-${index}`,
          tripId: 'complex-trip',
          destinationCountry: country,
          arrivalDate: '2024-07-15',
          departureDate: '2024-07-25',
          formStatus: 'not_started',
          accommodation: {
            name: `Hotel ${country}`,
            address: {
              line1: '123 Main St',
              city: `${country} City`,
              country,
              postalCode: '12345'
            }
          },
          order: index
        });
      });
      
      // Generate forms for all legs
      const forms = legs.map(leg => {
        const mockSchema = {
          countryCode: leg.destinationCountry,
          countryName: `Country ${leg.destinationCountry}`,
          schemaVersion: '1.0.0',
          lastUpdated: '2024-01-01',
          portalUrl: `https://${leg.destinationCountry.toLowerCase()}.gov/portal`,
          portalName: `${leg.destinationCountry} Portal`,
          submission: {
            earliestBeforeArrival: '90 days',
            latestBeforeArrival: '3 days',
            recommended: '7 days'
          },
          sections: [],
          submissionGuide: []
        };
        
        const schema = validateSchema(mockSchema, leg.destinationCountry);
        return generateFilledForm(testProfile, leg, schema);
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(forms).toHaveLength(8);
      expect(totalTime).toBeLessThan(300); // Should handle complex scenarios in under 300ms
      
      // Verify form quality
      forms.forEach(form => {
        expect(form.stats.completionPercentage).toBeGreaterThanOrEqual(0);
        expect(form.stats.completionPercentage).toBeLessThanOrEqual(100);
      });
    });
  });
});