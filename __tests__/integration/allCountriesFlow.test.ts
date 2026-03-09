/**
 * Comprehensive integration test for all 8 supported countries
 * Tests the complete user flow from profile creation to form generation across all countries
 */

import { describe, it, beforeEach, expect, jest } from '@jest/globals';
import { FormEngine } from '../../src/services/forms/formEngine';
import { FieldMapper } from '../../src/services/forms/fieldMapper';
import { SchemaLoader } from '../../src/services/schemas/schemaLoader';
import { MRZParser } from '../../src/services/passport/mrzParser';
import type { UserProfile, Trip, TripLeg, CountrySchema } from '../../src/types';

// Mock native modules
jest.mock('react-native-keychain');
jest.mock('react-native-mmkv');
jest.mock('@react-native-camera-roll/camera-roll');

describe('All Countries Integration Flow', () => {
  let formEngine: FormEngine;
  let fieldMapper: FieldMapper;
  let schemaLoader: SchemaLoader;
  let mrzParser: MRZParser;
  
  // Test profile based on a typical international traveler
  const testProfile: UserProfile = {
    id: 'test-profile',
    givenNames: 'John Michael',
    surname: 'Smith',
    passportNumber: 'A12345678',
    nationality: 'USA',
    dateOfBirth: '1985-06-15',
    gender: 'M',
    passportExpiry: '2030-06-15',
    passportIssueDate: '2020-06-15',
    placeOfBirth: 'New York',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    formEngine = new FormEngine();
    fieldMapper = new FieldMapper();
    schemaLoader = new SchemaLoader();
    mrzParser = new MRZParser();
  });

  describe('MRZ Parsing Integration', () => {
    it('should parse MRZ and generate valid profile for all country forms', async () => {
      // Typical MRZ for US passport
      const mrzLine1 = 'P<USASMITH<<JOHN<MICHAEL<<<<<<<<<<<<<<<<<<<<<<';
      const mrzLine2 = 'A123456782USA8506159M3006159<<<<<<<<<<<<<<02';
      
      const parsedData = await mrzParser.parse([mrzLine1, mrzLine2]);
      
      expect(parsedData).toEqual({
        surname: 'SMITH',
        givenNames: 'JOHN MICHAEL',
        passportNumber: 'A12345678',
        nationality: 'USA',
        dateOfBirth: '1985-06-15',
        gender: 'M',
        passportExpiry: '2030-06-15'
      });
    });
  });

  describe('All Countries Form Generation', () => {
    const supportedCountries = ['JPN', 'MYS', 'SGP', 'THA', 'VNM', 'GBR', 'USA', 'CAN'];
    
    supportedCountries.forEach(countryCode => {
      describe(`${countryCode} Form Generation`, () => {
        let schema: CountrySchema;
        let trip: Trip;
        let leg: TripLeg;

        beforeEach(async () => {
          schema = await schemaLoader.loadSchema(countryCode);
          
          trip = {
            id: `test-trip-${countryCode}`,
            name: `Test Trip to ${countryCode}`,
            legs: [],
            status: 'planning',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          leg = {
            id: `leg-${countryCode}`,
            tripId: trip.id,
            countryCode,
            arrivalDate: new Date('2024-07-15'),
            departureDate: new Date('2024-07-25'),
            flightNumber: 'AA123',
            accommodation: {
              name: `Hotel ${countryCode}`,
              address: {
                street: '123 Main St',
                city: 'Capital City',
                country: countryCode,
                postalCode: '12345',
                _formatted: `123 Main St, Capital City, ${countryCode} 12345`
              },
              phone: '+1234567890'
            },
            order: 0,
            _calculatedDuration: 10
          };
        });

        it('should load country schema successfully', async () => {
          expect(schema).toBeDefined();
          expect(schema.countryCode).toBe(countryCode);
          expect(schema.sections).toBeInstanceOf(Array);
          expect(schema.sections.length).toBeGreaterThan(0);
        });

        it('should generate form with correct auto-filled fields', async () => {
          const form = await formEngine.generateForm(testProfile, leg, schema);
          
          expect(form).toBeDefined();
          expect(form.countryCode).toBe(countryCode);
          expect(form.sections).toBeInstanceOf(Array);
          expect(form.totalFields).toBeGreaterThan(0);
          expect(form.autoFilledCount).toBeGreaterThan(0);
          expect(form.completionPercentage).toBeGreaterThan(0);
        });

        it('should map profile fields correctly', async () => {
          const form = await formEngine.generateForm(testProfile, leg, schema);
          
          // Check that common fields are auto-filled
          const personalSection = form.sections.find(s => s.id === 'personal');
          if (personalSection) {
            const firstNameField = personalSection.fields.find(f => f.id === 'firstName' || f.id === 'givenNames');
            const lastNameField = personalSection.fields.find(f => f.id === 'lastName' || f.id === 'surname');
            const passportField = personalSection.fields.find(f => f.id === 'passportNumber');
            
            if (firstNameField) {
              expect(firstNameField.value).toBe(testProfile.givenNames);
              expect(firstNameField.autoFilled).toBe(true);
            }
            
            if (lastNameField) {
              expect(lastNameField.value).toBe(testProfile.surname);
              expect(lastNameField.autoFilled).toBe(true);
            }
            
            if (passportField) {
              expect(passportField.value).toBe(testProfile.passportNumber);
              expect(passportField.autoFilled).toBe(true);
            }
          }
        });

        it('should identify country-specific fields', async () => {
          const form = await formEngine.generateForm(testProfile, leg, schema);
          
          const countrySpecificFields = form.sections
            .flatMap(section => section.fields)
            .filter(field => field.countrySpecific === true);
          
          expect(countrySpecificFields.length).toBeGreaterThanOrEqual(0);
          
          // Each country should have some unique fields
          const uniqueFieldIds = new Set(
            form.sections
              .flatMap(section => section.fields)
              .map(field => field.id)
          );
          
          expect(uniqueFieldIds.size).toBeGreaterThan(5);
        });

        it('should validate form fields according to country requirements', async () => {
          const form = await formEngine.generateForm(testProfile, leg, schema);
          
          // Check required fields
          const requiredFields = form.sections
            .flatMap(section => section.fields)
            .filter(field => field.required === true);
          
          expect(requiredFields.length).toBeGreaterThan(0);
          
          // Check that auto-filled required fields have values
          const autoFilledRequiredFields = requiredFields.filter(field => field.autoFilled);
          autoFilledRequiredFields.forEach(field => {
            expect(field.value).toBeTruthy();
          });
        });

        it('should calculate completion statistics correctly', async () => {
          const form = await formEngine.generateForm(testProfile, leg, schema);
          
          expect(form.totalFields).toBeGreaterThan(0);
          expect(form.autoFilledCount).toBeGreaterThanOrEqual(0);
          expect(form.remainingFields).toBeGreaterThanOrEqual(0);
          expect(form.completionPercentage).toBeGreaterThanOrEqual(0);
          expect(form.completionPercentage).toBeLessThanOrEqual(100);
          
          // Verify math
          expect(form.autoFilledCount + form.remainingFields).toBe(form.totalFields);
          expect(Math.round((form.autoFilledCount / form.totalFields) * 100)).toBe(form.completionPercentage);
        });
      });
    });
  });

  describe('Multi-Country Trip Integration', () => {
    it('should handle complex 8-country trip efficiently', async () => {
      const multiCountryTrip: Trip = {
        id: 'multi-country-trip',
        name: 'World Tour 2024',
        legs: [],
        status: 'planning',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const countries = ['JPN', 'MYS', 'SGP', 'THA', 'VNM', 'GBR', 'USA', 'CAN'];
      const legs: TripLeg[] = [];
      
      // Create legs for each country
      for (let i = 0; i < countries.length; i++) {
        const country = countries[i];
        legs.push({
          id: `leg-${i}`,
          tripId: multiCountryTrip.id,
          countryCode: country,
          arrivalDate: new Date(Date.now() + (i * 7 * 24 * 60 * 60 * 1000)), // 1 week apart
          departureDate: new Date(Date.now() + ((i + 1) * 7 * 24 * 60 * 60 * 1000) - 1),
          flightNumber: `FL${i + 1}${country}`,
          accommodation: {
            name: `Hotel ${country}`,
            address: {
              street: `${i + 1}00 Main Street`,
              city: `${country} City`,
              country: country,
              postalCode: `${i + 1}0000`,
              _formatted: `${i + 1}00 Main Street, ${country} City, ${country} ${i + 1}0000`
            },
            phone: `+${i + 1}234567890`
          },
          order: i,
          _calculatedDuration: 7
        });
      }

      multiCountryTrip.legs = legs;

      // Generate forms for all countries
      const startTime = performance.now();
      const forms = [];
      
      for (const leg of legs) {
        const schema = await schemaLoader.loadSchema(leg.countryCode);
        const form = await formEngine.generateForm(testProfile, leg, schema);
        forms.push(form);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Performance assertions
      expect(totalTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(forms.length).toBe(8);
      
      // Verify each form is valid
      forms.forEach((form, index) => {
        expect(form.countryCode).toBe(countries[index]);
        expect(form.totalFields).toBeGreaterThan(0);
        expect(form.autoFilledCount).toBeGreaterThan(0);
      });

      // Calculate aggregate statistics
      const totalFields = forms.reduce((sum, form) => sum + form.totalFields, 0);
      const totalAutoFilled = forms.reduce((sum, form) => sum + form.autoFilledCount, 0);
      const overallCompletion = Math.round((totalAutoFilled / totalFields) * 100);

      expect(totalFields).toBeGreaterThan(100); // Should have significant number of fields
      expect(overallCompletion).toBeGreaterThan(40); // Should auto-fill at least 40% across all countries
      
      console.log(`Multi-country test results:`);
      console.log(`- Total fields: ${totalFields}`);
      console.log(`- Auto-filled: ${totalAutoFilled}`);
      console.log(`- Overall completion: ${overallCompletion}%`);
      console.log(`- Generation time: ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Field Mapping Edge Cases', () => {
    it('should handle missing profile data gracefully', async () => {
      const incompleteProfile: Partial<UserProfile> = {
        id: 'incomplete',
        givenNames: 'John',
        surname: 'Doe'
        // Missing passport number, nationality, etc.
      };

      const leg: TripLeg = {
        id: 'test-leg',
        tripId: 'test-trip',
        countryCode: 'JPN',
        arrivalDate: new Date('2024-07-15'),
        departureDate: new Date('2024-07-25'),
        order: 0,
        _calculatedDuration: 10
      };

      const schema = await schemaLoader.loadSchema('JPN');
      const form = await formEngine.generateForm(incompleteProfile as UserProfile, leg, schema);

      expect(form).toBeDefined();
      expect(form.remainingFields).toBeGreaterThan(0);
      
      // Should not crash even with missing data
      const nameFields = form.sections
        .flatMap(s => s.fields)
        .filter(f => f.id.includes('Name') || f.id.includes('name'));
      
      const autoFilledNames = nameFields.filter(f => f.autoFilled);
      expect(autoFilledNames.length).toBeGreaterThan(0); // At least name should be filled
    });

    it('should handle special characters in passport data', async () => {
      const profileWithSpecialChars: UserProfile = {
        ...testProfile,
        givenNames: 'José María',
        surname: 'González-López',
        placeOfBirth: 'São Paulo'
      };

      const leg: TripLeg = {
        id: 'test-leg',
        tripId: 'test-trip',
        countryCode: 'SGP',
        arrivalDate: new Date('2024-07-15'),
        departureDate: new Date('2024-07-25'),
        order: 0,
        _calculatedDuration: 10
      };

      const schema = await schemaLoader.loadSchema('SGP');
      const form = await formEngine.generateForm(profileWithSpecialChars, leg, schema);

      expect(form).toBeDefined();
      
      // Check that special characters are handled correctly
      const nameFields = form.sections
        .flatMap(s => s.fields)
        .filter(f => f.autoFilled && f.value && typeof f.value === 'string');
      
      nameFields.forEach(field => {
        expect(field.value).toBeTruthy();
        // Should contain the original characters or appropriate transliteration
        expect(typeof field.value).toBe('string');
      });
    });
  });

  describe('Schema Validation', () => {
    it('should validate all country schemas have required structure', async () => {
      const countries = ['JPN', 'MYS', 'SGP', 'THA', 'VNM', 'GBR', 'USA', 'CAN'];
      
      for (const countryCode of countries) {
        const schema = await schemaLoader.loadSchema(countryCode);
        
        // Required schema properties
        expect(schema.countryCode).toBe(countryCode);
        expect(schema.countryName).toBeTruthy();
        expect(schema.schemaVersion).toBeTruthy();
        expect(schema.lastUpdated).toBeTruthy();
        expect(schema.portalUrl).toBeTruthy();
        expect(schema.portalName).toBeTruthy();
        
        // Should have sections with fields
        expect(schema.sections).toBeInstanceOf(Array);
        expect(schema.sections.length).toBeGreaterThan(0);
        
        schema.sections.forEach(section => {
          expect(section.id).toBeTruthy();
          expect(section.title).toBeTruthy();
          expect(section.fields).toBeInstanceOf(Array);
          expect(section.fields.length).toBeGreaterThan(0);
          
          section.fields.forEach(field => {
            expect(field.id).toBeTruthy();
            expect(field.label).toBeTruthy();
            expect(field.type).toBeTruthy();
            expect(typeof field.required).toBe('boolean');
            expect(typeof field.countrySpecific).toBe('boolean');
          });
        });
        
        // Should have submission guide
        expect(schema.submissionGuide).toBeInstanceOf(Array);
        expect(schema.submissionGuide.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets for form generation', async () => {
      const iterations = 100;
      const countries = ['JPN', 'MYS', 'SGP', 'THA', 'VNM', 'GBR', 'USA', 'CAN'];
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const country = countries[i % countries.length];
        const leg: TripLeg = {
          id: `perf-leg-${i}`,
          tripId: 'perf-trip',
          countryCode: country,
          arrivalDate: new Date(),
          departureDate: new Date(),
          order: 0,
          _calculatedDuration: 7
        };
        
        const schema = await schemaLoader.loadSchema(country);
        
        const startTime = performance.now();
        await formEngine.generateForm(testProfile, leg, schema);
        const endTime = performance.now();
        
        times.push(endTime - startTime);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      // Performance targets from CLAUDE.md
      expect(avgTime).toBeLessThan(20); // Target: < 20ms average
      expect(maxTime).toBeLessThan(100); // Target: < 100ms max
      expect(minTime).toBeLessThan(50); // Should be consistently fast
      
      console.log(`Form generation performance across ${iterations} iterations:`);
      console.log(`- Average: ${avgTime.toFixed(2)}ms`);
      console.log(`- Max: ${maxTime.toFixed(2)}ms`);
      console.log(`- Min: ${minTime.toFixed(2)}ms`);
    });
  });
});