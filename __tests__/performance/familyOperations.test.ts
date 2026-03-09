/**
 * Family Operations Performance Tests
 * 
 * Tests performance of multi-traveler operations to ensure family workflows
 * remain responsive with multiple profiles and form generation operations.
 */

import { performance } from 'perf_hooks';
import { TravelerProfile } from '@/types/profile';
import { FamilyProfileCollection, ProfileMetadata } from '@/types/family';
import { validateFamilyTripTravelers, validateFamilyMemberProfile } from '@/utils/familyValidation';

// Mock large dataset for performance testing
function createMockFamilyProfile(index: number): TravelerProfile {
  return {
    id: `profile-${index}`,
    givenNames: `FirstName${index}`,
    surname: `LastName${index}`,
    passportNumber: `PP${String(index).padStart(6, '0')}`,
    nationality: 'USA',
    dateOfBirth: `${1980 + (index % 40)}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
    gender: index % 2 === 0 ? 'M' : 'F',
    passportExpiry: `${2025 + (index % 10)}-12-31`,
    placeOfBirth: `City${index}`,
    updatedAt: '2024-01-01T00:00:00Z'
  };
}

function createMockFamilyCollection(size: number): FamilyProfileCollection {
  const profiles = new Map<string, ProfileMetadata>();
  
  for (let i = 0; i < Math.min(size, 8); i++) {
    const profileId = `profile-${i}`;
    profiles.set(profileId, {
      id: profileId,
      relationship: i === 0 ? 'self' : (i === 1 ? 'spouse' : 'child'),
      isPrimary: i === 0,
      isActive: true,
      biometricEnabled: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });
  }

  return {
    profiles,
    primaryProfileId: 'profile-0',
    maxProfiles: 8,
    version: 1,
    lastModified: '2024-01-01T00:00:00Z'
  };
}

function measureExecutionTime<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, duration: end - start };
}

describe('Family Operations Performance Tests', () => {
  describe('Family Profile Validation Performance', () => {
    it('should validate single family member profile within performance threshold', () => {
      const profile = createMockFamilyProfile(1);
      
      const { duration } = measureExecutionTime(() => {
        return validateFamilyMemberProfile(profile);
      });

      // Profile validation should complete within 1ms
      expect(duration).toBeLessThan(1);
    });

    it('should validate multiple family member profiles efficiently', () => {
      const profiles = Array.from({ length: 8 }, (_, i) => createMockFamilyProfile(i));
      
      const { duration } = measureExecutionTime(() => {
        return profiles.map(profile => validateFamilyMemberProfile(profile));
      });

      // Validating 8 profiles should complete within 10ms
      expect(duration).toBeLessThan(10);
    });

    it('should handle batch validation operations efficiently', () => {
      const profiles = Array.from({ length: 50 }, (_, i) => createMockFamilyProfile(i));
      
      const { duration } = measureExecutionTime(() => {
        return profiles.map(profile => validateFamilyMemberProfile(profile));
      });

      // Large batch validation should complete within 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Family Trip Validation Performance', () => {
    it('should validate family trip with maximum travelers efficiently', () => {
      const familyCollection = createMockFamilyCollection(8);
      const passportProfiles = new Map<string, TravelerProfile>();
      const travelerIds: string[] = [];

      // Create profiles for all 8 family members
      for (let i = 0; i < 8; i++) {
        const profileId = `profile-${i}`;
        passportProfiles.set(profileId, createMockFamilyProfile(i));
        travelerIds.push(profileId);
      }

      const { duration } = measureExecutionTime(() => {
        return validateFamilyTripTravelers(travelerIds, familyCollection, passportProfiles);
      });

      // Trip validation with max family size should complete within 5ms
      expect(duration).toBeLessThan(5);
    });

    it('should handle repeated trip validation calls efficiently', () => {
      const familyCollection = createMockFamilyCollection(4);
      const passportProfiles = new Map<string, TravelerProfile>();
      const travelerIds = ['profile-0', 'profile-1', 'profile-2', 'profile-3'];

      for (const id of travelerIds) {
        passportProfiles.set(id, createMockFamilyProfile(parseInt(id.split('-')[1])));
      }

      const { duration } = measureExecutionTime(() => {
        // Simulate multiple validation calls (e.g., during form switching)
        for (let i = 0; i < 100; i++) {
          validateFamilyTripTravelers(travelerIds, familyCollection, passportProfiles);
        }
      });

      // 100 repeated validations should complete within 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Family Collection Operations Performance', () => {
    it('should serialize and deserialize family collection efficiently', () => {
      const familyCollection = createMockFamilyCollection(8);
      
      const { duration: serializeDuration } = measureExecutionTime(() => {
        return {
          profiles: Object.fromEntries(familyCollection.profiles),
          primaryProfileId: familyCollection.primaryProfileId,
          maxProfiles: familyCollection.maxProfiles,
          version: familyCollection.version,
          lastModified: familyCollection.lastModified,
        };
      });

      // Serialization should complete within 1ms
      expect(serializeDuration).toBeLessThan(1);

      const serialized = {
        profiles: Object.fromEntries(familyCollection.profiles),
        primaryProfileId: familyCollection.primaryProfileId,
        maxProfiles: familyCollection.maxProfiles,
        version: familyCollection.version,
        lastModified: familyCollection.lastModified,
      };

      const { duration: deserializeDuration } = measureExecutionTime(() => {
        return {
          profiles: new Map(Object.entries(serialized.profiles)),
          primaryProfileId: serialized.primaryProfileId,
          maxProfiles: serialized.maxProfiles,
          version: serialized.version,
          lastModified: serialized.lastModified,
        };
      });

      // Deserialization should complete within 1ms
      expect(deserializeDuration).toBeLessThan(1);
    });

    it('should efficiently search through family members', () => {
      const familyCollection = createMockFamilyCollection(8);
      
      const { duration } = measureExecutionTime(() => {
        // Simulate common search operations
        const results = [];
        
        // Find primary profile
        for (const [id, metadata] of familyCollection.profiles) {
          if (metadata.isPrimary) {
            results.push(id);
            break;
          }
        }
        
        // Find all children
        for (const [id, metadata] of familyCollection.profiles) {
          if (metadata.relationship === 'child') {
            results.push(id);
          }
        }
        
        // Find active profiles
        for (const [id, metadata] of familyCollection.profiles) {
          if (metadata.isActive) {
            results.push(id);
          }
        }
        
        return results;
      });

      // Family search operations should complete within 1ms
      expect(duration).toBeLessThan(1);
    });
  });

  describe('Memory Usage and Scalability', () => {
    it('should maintain reasonable memory usage with multiple profiles', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create multiple family collections
      const collections = [];
      for (let i = 0; i < 100; i++) {
        collections.push(createMockFamilyCollection(8));
      }

      const afterMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterMemory - initialMemory;
      const memoryPerCollection = memoryIncrease / 100;

      // Each family collection should use less than 10KB
      expect(memoryPerCollection).toBeLessThan(10 * 1024);
    });

    it('should handle concurrent validation operations', async () => {
      const familyCollection = createMockFamilyCollection(8);
      const profiles = Array.from({ length: 8 }, (_, i) => createMockFamilyProfile(i));

      const { duration } = measureExecutionTime(() => {
        // Simulate concurrent validation operations
        const promises = profiles.map(async (profile) => {
          return validateFamilyMemberProfile(profile);
        });
        
        return Promise.all(promises);
      });

      // Concurrent validations should complete within 5ms
      expect(duration).toBeLessThan(5);
    });
  });

  describe('Form Generation Performance', () => {
    it('should simulate multi-traveler form generation efficiently', () => {
      const travelers = Array.from({ length: 8 }, (_, i) => createMockFamilyProfile(i));
      
      const { duration } = measureExecutionTime(() => {
        // Simulate form field mapping for multiple travelers
        const formData = travelers.map(traveler => ({
          travelerId: traveler.id,
          fields: {
            passportNumber: traveler.passportNumber,
            givenNames: traveler.givenNames,
            surname: traveler.surname,
            nationality: traveler.nationality,
            dateOfBirth: traveler.dateOfBirth,
            gender: traveler.gender,
            passportExpiry: traveler.passportExpiry,
            // Additional computed fields
            age: Math.floor((Date.now() - new Date(traveler.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
            fullName: `${traveler.givenNames} ${traveler.surname}`,
            isMinor: Math.floor((Date.now() - new Date(traveler.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) < 18
          }
        }));
        
        return formData;
      });

      // Form generation for 8 travelers should complete within 5ms
      expect(duration).toBeLessThan(5);
    });

    it('should handle form switching simulation efficiently', () => {
      const travelers = Array.from({ length: 4 }, (_, i) => createMockFamilyProfile(i));
      
      const { duration } = measureExecutionTime(() => {
        // Simulate rapid form switching (user clicking between travelers)
        for (let i = 0; i < 50; i++) {
          const currentTraveler = travelers[i % travelers.length];
          
          // Simulate form field population
          const formFields = {
            passportNumber: currentTraveler.passportNumber,
            givenNames: currentTraveler.givenNames,
            surname: currentTraveler.surname,
            nationality: currentTraveler.nationality,
            dateOfBirth: currentTraveler.dateOfBirth,
            gender: currentTraveler.gender,
            passportExpiry: currentTraveler.passportExpiry,
          };
          
          // Simulate validation
          validateFamilyMemberProfile(currentTraveler);
        }
      });

      // 50 form switches should complete within 25ms
      expect(duration).toBeLessThan(25);
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle typical family trip creation workflow efficiently', () => {
      const { duration } = measureExecutionTime(() => {
        // Step 1: Create family collection
        const familyCollection = createMockFamilyCollection(4);
        
        // Step 2: Create traveler profiles
        const travelerProfiles = new Map<string, TravelerProfile>();
        for (let i = 0; i < 4; i++) {
          const profile = createMockFamilyProfile(i);
          travelerProfiles.set(profile.id, profile);
        }
        
        // Step 3: Validate each family member
        const validationResults = [];
        for (const profile of travelerProfiles.values()) {
          validationResults.push(validateFamilyMemberProfile(profile));
        }
        
        // Step 4: Validate trip travelers
        const travelerIds = Array.from(travelerProfiles.keys());
        const tripValidation = validateFamilyTripTravelers(
          travelerIds,
          familyCollection,
          travelerProfiles
        );
        
        // Step 5: Generate form data for each traveler
        const formDataSets = [];
        for (const profile of travelerProfiles.values()) {
          formDataSets.push({
            travelerId: profile.id,
            passportData: profile,
            validationResult: validateFamilyMemberProfile(profile)
          });
        }
        
        return {
          familyCollection,
          validationResults,
          tripValidation,
          formDataSets
        };
      });

      // Complete family trip creation workflow should complete within 10ms
      expect(duration).toBeLessThan(10);
    });

    it('should maintain performance with frequent family management operations', () => {
      let familyCollection = createMockFamilyCollection(1); // Start with just primary
      
      const { duration } = measureExecutionTime(() => {
        // Simulate adding family members one by one
        for (let i = 1; i < 8; i++) {
          const newProfile = createMockFamilyProfile(i);
          
          // Validate new member
          validateFamilyMemberProfile(newProfile);
          
          // Add to collection
          familyCollection.profiles.set(`profile-${i}`, {
            id: `profile-${i}`,
            relationship: i === 1 ? 'spouse' : 'child',
            isPrimary: false,
            isActive: true,
            biometricEnabled: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          });
          
          // Validate collection after each addition
          const profiles = Array.from(familyCollection.profiles.values());
          profiles.forEach(p => p.id); // Access each profile
        }
      });

      // Adding 7 family members with validation should complete within 15ms
      expect(duration).toBeLessThan(15);
    });
  });

  describe('Performance Regression Detection', () => {
    // Baseline performance metrics for comparison
    const PERFORMANCE_BASELINES = {
      singleProfileValidation: 1, // ms
      batchProfileValidation: 10, // ms (8 profiles)
      tripValidation: 5, // ms (8 travelers)
      formGeneration: 5, // ms (8 travelers)
      familyWorkflow: 10, // ms (complete workflow)
    };

    it('should detect validation performance regression', () => {
      const profile = createMockFamilyProfile(1);
      const iterations = 1000;
      
      const { duration } = measureExecutionTime(() => {
        for (let i = 0; i < iterations; i++) {
          validateFamilyMemberProfile(profile);
        }
      });

      const averageTime = duration / iterations;
      expect(averageTime).toBeLessThan(PERFORMANCE_BASELINES.singleProfileValidation);
    });

    it('should monitor family collection operation performance', () => {
      const iterations = 100;
      
      const { duration } = measureExecutionTime(() => {
        for (let i = 0; i < iterations; i++) {
          const collection = createMockFamilyCollection(8);
          
          // Perform typical operations
          collection.profiles.get('profile-0');
          Array.from(collection.profiles.values()).filter(p => p.isActive);
          collection.profiles.set('temp-profile', {
            id: 'temp-profile',
            relationship: 'other',
            isPrimary: false,
            isActive: true,
            biometricEnabled: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          });
          collection.profiles.delete('temp-profile');
        }
      });

      const averageTime = duration / iterations;
      
      // Average collection operations should be very fast
      expect(averageTime).toBeLessThan(0.5);
    });
  });
});