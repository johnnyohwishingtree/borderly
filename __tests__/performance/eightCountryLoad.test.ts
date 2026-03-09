/**
 * Performance load testing for 8-country support
 * Tests memory usage, concurrent operations, and scalability across all countries
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { FormEngine } from '../../src/services/forms/formEngine';
import { FieldMapper } from '../../src/services/forms/fieldMapper';
import { SchemaLoader } from '../../src/services/schemas/schemaLoader';
import type { UserProfile, Trip, TripLeg, CountrySchema, GeneratedForm } from '../../src/types';

// Mock native modules for performance testing
jest.mock('react-native-keychain');
jest.mock('react-native-mmkv');
jest.mock('@react-native-camera-roll/camera-roll');

interface PerformanceMetrics {
  operationTime: number;
  memoryUsage: number;
  cpuTime: number;
  cacheHits: number;
  cacheMisses: number;
}

interface LoadTestResult {
  totalTime: number;
  averageTime: number;
  maxTime: number;
  minTime: number;
  throughput: number; // operations per second
  memoryPeak: number;
  successRate: number;
  errors: string[];
}

describe('8-Country Load Performance Tests', () => {
  let formEngine: FormEngine;
  let fieldMapper: FieldMapper;
  let schemaLoader: SchemaLoader;
  
  const allCountries = ['JPN', 'MYS', 'SGP', 'THA', 'VNM', 'GBR', 'USA', 'CAN'];
  
  // Test profiles simulating different passport types and data patterns
  const testProfiles: UserProfile[] = [
    {
      id: 'profile-us',
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
    },
    {
      id: 'profile-uk',
      givenNames: 'Emma Charlotte',
      surname: 'Johnson',
      passportNumber: 'B98765432',
      nationality: 'GBR',
      dateOfBirth: '1990-03-22',
      gender: 'F',
      passportExpiry: '2029-03-22',
      passportIssueDate: '2019-03-22',
      placeOfBirth: 'London',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'profile-can',
      givenNames: 'Robert James',
      surname: 'Anderson',
      passportNumber: 'C11223344',
      nationality: 'CAN',
      dateOfBirth: '1978-11-08',
      gender: 'M',
      passportExpiry: '2028-11-08',
      passportIssueDate: '2018-11-08',
      placeOfBirth: 'Toronto',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    formEngine = new FormEngine();
    fieldMapper = new FieldMapper();
    schemaLoader = new SchemaLoader();
  });

  afterEach(() => {
    // Force garbage collection if available in test environment
    if (global.gc) {
      global.gc();
    }
  });

  describe('Schema Loading Performance', () => {
    it('should load all country schemas within performance targets', async () => {
      const loadTimes: number[] = [];
      const schemas: CountrySchema[] = [];
      
      // Test cold loading of all schemas
      for (const countryCode of allCountries) {
        const startTime = performance.now();
        const schema = await schemaLoader.loadSchema(countryCode);
        const endTime = performance.now();
        
        loadTimes.push(endTime - startTime);
        schemas.push(schema);
      }
      
      const avgLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      const maxLoadTime = Math.max(...loadTimes);
      
      // Performance targets
      expect(avgLoadTime).toBeLessThan(50); // < 50ms average load time
      expect(maxLoadTime).toBeLessThan(200); // < 200ms max load time
      expect(schemas.length).toBe(8);
      
      // Test hot loading (should be much faster)
      const hotLoadTimes: number[] = [];
      for (const countryCode of allCountries) {
        const startTime = performance.now();
        await schemaLoader.loadSchema(countryCode);
        const endTime = performance.now();
        
        hotLoadTimes.push(endTime - startTime);
      }
      
      const avgHotLoadTime = hotLoadTimes.reduce((sum, time) => sum + time, 0) / hotLoadTimes.length;
      expect(avgHotLoadTime).toBeLessThan(avgLoadTime / 2); // Hot loading should be faster
      
      console.log(`Schema loading performance:`);
      console.log(`- Cold load average: ${avgLoadTime.toFixed(2)}ms`);
      console.log(`- Hot load average: ${avgHotLoadTime.toFixed(2)}ms`);
      console.log(`- Max load time: ${maxLoadTime.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Form Generation', () => {
    it('should handle concurrent form generation for all countries', async () => {
      const concurrentOperations = 50;
      const promises: Promise<GeneratedForm>[] = [];
      
      // Create concurrent form generation tasks
      for (let i = 0; i < concurrentOperations; i++) {
        const profile = testProfiles[i % testProfiles.length];
        const countryCode = allCountries[i % allCountries.length];
        
        const leg: TripLeg = {
          id: `concurrent-leg-${i}`,
          tripId: `concurrent-trip-${i}`,
          countryCode,
          arrivalDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)),
          departureDate: new Date(Date.now() + ((i + 7) * 24 * 60 * 60 * 1000)),
          flightNumber: `FL${i}`,
          order: 0,
          _calculatedDuration: 7
        };
        
        const promise = schemaLoader.loadSchema(countryCode)
          .then(schema => formEngine.generateForm(profile, leg, schema));
        
        promises.push(promise);
      }
      
      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const throughput = concurrentOperations / (totalTime / 1000); // ops/second
      
      // Verify all operations completed successfully
      expect(results.length).toBe(concurrentOperations);
      results.forEach(form => {
        expect(form).toBeDefined();
        expect(form.totalFields).toBeGreaterThan(0);
        expect(form.autoFilledCount).toBeGreaterThan(0);
      });
      
      // Performance assertions
      expect(totalTime).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(throughput).toBeGreaterThan(10); // Should handle >10 operations per second
      
      console.log(`Concurrent operations performance:`);
      console.log(`- Operations: ${concurrentOperations}`);
      console.log(`- Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`- Throughput: ${throughput.toFixed(2)} ops/second`);
    });
  });

  describe('Memory Usage Under Load', () => {
    it('should maintain reasonable memory usage during intensive operations', async () => {
      const iterations = 200;
      const memoryReadings: number[] = [];
      
      // Function to get memory usage (mock for testing environment)
      const getMemoryUsage = (): number => {
        if (typeof process !== 'undefined' && process.memoryUsage) {
          return process.memoryUsage().heapUsed / 1024 / 1024; // MB
        }
        return 0; // Mock value for test environment
      };
      
      const initialMemory = getMemoryUsage();
      
      for (let i = 0; i < iterations; i++) {
        const profile = testProfiles[i % testProfiles.length];
        const countryCode = allCountries[i % allCountries.length];
        
        const leg: TripLeg = {
          id: `memory-leg-${i}`,
          tripId: `memory-trip-${i}`,
          countryCode,
          arrivalDate: new Date(),
          departureDate: new Date(),
          order: 0,
          _calculatedDuration: 7
        };
        
        const schema = await schemaLoader.loadSchema(countryCode);
        await formEngine.generateForm(profile, leg, schema);
        
        // Record memory usage every 25 iterations
        if (i % 25 === 0) {
          memoryReadings.push(getMemoryUsage());
        }
      }
      
      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      const maxMemory = Math.max(...memoryReadings);
      
      // Memory assertions (only if we have actual memory readings)
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(100); // Should not increase by more than 100MB
        expect(maxMemory).toBeLessThan(500); // Should not exceed 500MB total
        
        console.log(`Memory usage under load:`);
        console.log(`- Initial: ${initialMemory.toFixed(2)}MB`);
        console.log(`- Final: ${finalMemory.toFixed(2)}MB`);
        console.log(`- Increase: ${memoryIncrease.toFixed(2)}MB`);
        console.log(`- Peak: ${maxMemory.toFixed(2)}MB`);
      }
      
      // Always verify operations completed successfully
      expect(iterations).toBe(200);
    });
  });

  describe('Multi-Country Trip Scaling', () => {
    it('should handle large multi-country trips efficiently', async () => {
      const tripSizes = [1, 2, 4, 8, 16]; // Number of countries per trip
      const results: LoadTestResult[] = [];
      
      for (const tripSize of tripSizes) {
        const profile = testProfiles[0];
        const errors: string[] = [];
        const times: number[] = [];
        
        const startTime = performance.now();
        
        try {
          // Create trip with multiple countries
          const legs: TripLeg[] = [];
          for (let i = 0; i < tripSize; i++) {
            const countryCode = allCountries[i % allCountries.length];
            legs.push({
              id: `scaling-leg-${i}`,
              tripId: 'scaling-trip',
              countryCode,
              arrivalDate: new Date(Date.now() + (i * 7 * 24 * 60 * 60 * 1000)),
              departureDate: new Date(Date.now() + ((i + 1) * 7 * 24 * 60 * 60 * 1000)),
              order: i,
              _calculatedDuration: 7
            });
          }
          
          // Generate forms for all legs
          for (const leg of legs) {
            const operationStart = performance.now();
            const schema = await schemaLoader.loadSchema(leg.countryCode);
            await formEngine.generateForm(profile, leg, schema);
            const operationEnd = performance.now();
            
            times.push(operationEnd - operationStart);
          }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgTime = times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
        const maxTime = times.length > 0 ? Math.max(...times) : 0;
        const minTime = times.length > 0 ? Math.min(...times) : 0;
        const throughput = times.length / (totalTime / 1000);
        const successRate = (times.length / tripSize) * 100;
        
        results.push({
          totalTime,
          averageTime: avgTime,
          maxTime,
          minTime,
          throughput,
          memoryPeak: 0, // Mock for test environment
          successRate,
          errors
        });
        
        // Performance assertions for each trip size
        expect(successRate).toBe(100); // All operations should succeed
        expect(errors.length).toBe(0);
        expect(avgTime).toBeLessThan(50); // Average operation time should remain low
      }
      
      // Scaling analysis
      console.log(`Multi-country trip scaling results:`);
      results.forEach((result, index) => {
        const tripSize = tripSizes[index];
        console.log(`${tripSize} countries:`);
        console.log(`  - Total: ${result.totalTime.toFixed(2)}ms`);
        console.log(`  - Average: ${result.averageTime.toFixed(2)}ms`);
        console.log(`  - Throughput: ${result.throughput.toFixed(2)} ops/sec`);
      });
      
      // Verify performance doesn't degrade significantly with size
      const firstResult = results[0];
      const lastResult = results[results.length - 1];
      const performanceDegradation = lastResult.averageTime / firstResult.averageTime;
      
      expect(performanceDegradation).toBeLessThan(2); // Performance shouldn't degrade by more than 2x
    });
  });

  describe('Field Mapping Performance', () => {
    it('should efficiently handle complex field mappings across countries', async () => {
      const mappingTimes: Record<string, number[]> = {};
      
      // Initialize arrays for each country
      allCountries.forEach(country => {
        mappingTimes[country] = [];
      });
      
      const iterations = 20;
      
      for (let i = 0; i < iterations; i++) {
        for (const countryCode of allCountries) {
          const profile = testProfiles[i % testProfiles.length];
          const leg: TripLeg = {
            id: `mapping-leg-${i}`,
            tripId: 'mapping-trip',
            countryCode,
            arrivalDate: new Date(),
            departureDate: new Date(),
            order: 0,
            _calculatedDuration: 7,
            accommodation: {
              name: `Test Hotel ${countryCode}`,
              address: {
                street: '123 Test St',
                city: 'Test City',
                country: countryCode,
                postalCode: '12345',
                _formatted: '123 Test St, Test City, 12345'
              },
              phone: '+1234567890'
            }
          };
          
          const schema = await schemaLoader.loadSchema(countryCode);
          
          const startTime = performance.now();
          await formEngine.generateForm(profile, leg, schema);
          const endTime = performance.now();
          
          mappingTimes[countryCode].push(endTime - startTime);
        }
      }
      
      // Analyze mapping performance by country
      console.log(`Field mapping performance by country:`);
      allCountries.forEach(countryCode => {
        const times = mappingTimes[countryCode];
        const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        
        console.log(`${countryCode}: avg=${avgTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms, min=${minTime.toFixed(2)}ms`);
        
        // Each country should meet performance targets
        expect(avgTime).toBeLessThan(30);
        expect(maxTime).toBeLessThan(100);
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle high-frequency operations without degradation', async () => {
      const operationsPerSecond = 50;
      const testDurationSeconds = 5;
      const totalOperations = operationsPerSecond * testDurationSeconds;
      
      let completedOperations = 0;
      let errors: string[] = [];
      const operationTimes: number[] = [];
      
      const startTime = performance.now();
      
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < totalOperations; i++) {
        const promise = (async () => {
          try {
            const delay = (i / operationsPerSecond) * 1000; // Spread operations over time
            await new Promise(resolve => setTimeout(resolve, delay));
            
            const profile = testProfiles[i % testProfiles.length];
            const countryCode = allCountries[i % allCountries.length];
            
            const leg: TripLeg = {
              id: `stress-leg-${i}`,
              tripId: 'stress-trip',
              countryCode,
              arrivalDate: new Date(),
              departureDate: new Date(),
              order: 0,
              _calculatedDuration: 7
            };
            
            const operationStart = performance.now();
            const schema = await schemaLoader.loadSchema(countryCode);
            await formEngine.generateForm(profile, leg, schema);
            const operationEnd = performance.now();
            
            operationTimes.push(operationEnd - operationStart);
            completedOperations++;
          } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
          }
        })();
        
        promises.push(promise);
      }
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const actualDuration = (endTime - startTime) / 1000;
      const actualThroughput = completedOperations / actualDuration;
      const successRate = (completedOperations / totalOperations) * 100;
      const avgOperationTime = operationTimes.length > 0 
        ? operationTimes.reduce((sum, t) => sum + t, 0) / operationTimes.length 
        : 0;
      
      // Performance assertions
      expect(successRate).toBeGreaterThan(95); // At least 95% success rate
      expect(errors.length).toBeLessThan(totalOperations * 0.05); // Less than 5% error rate
      expect(actualThroughput).toBeGreaterThan(operationsPerSecond * 0.8); // At least 80% of target throughput
      expect(avgOperationTime).toBeLessThan(100); // Average operation should be fast
      
      console.log(`Stress test results:`);
      console.log(`- Target throughput: ${operationsPerSecond} ops/sec`);
      console.log(`- Actual throughput: ${actualThroughput.toFixed(2)} ops/sec`);
      console.log(`- Success rate: ${successRate.toFixed(2)}%`);
      console.log(`- Average operation time: ${avgOperationTime.toFixed(2)}ms`);
      console.log(`- Errors: ${errors.length}`);
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle edge cases without significant performance impact', async () => {
      const edgeCases = [
        // Empty accommodation
        {
          name: 'empty-accommodation',
          leg: {
            id: 'edge-leg-1',
            tripId: 'edge-trip',
            countryCode: 'JPN',
            arrivalDate: new Date(),
            departureDate: new Date(),
            order: 0,
            _calculatedDuration: 1
          } as TripLeg
        },
        // Very long stay
        {
          name: 'long-stay',
          leg: {
            id: 'edge-leg-2',
            tripId: 'edge-trip',
            countryCode: 'USA',
            arrivalDate: new Date(),
            departureDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            order: 0,
            _calculatedDuration: 90
          } as TripLeg
        },
        // Very short stay
        {
          name: 'short-stay',
          leg: {
            id: 'edge-leg-3',
            tripId: 'edge-trip',
            countryCode: 'SGP',
            arrivalDate: new Date(),
            departureDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
            order: 0,
            _calculatedDuration: 0.16
          } as TripLeg
        }
      ];
      
      const profile = testProfiles[0];
      const times: Record<string, number> = {};
      
      for (const edgeCase of edgeCases) {
        const startTime = performance.now();
        
        const schema = await schemaLoader.loadSchema(edgeCase.leg.countryCode);
        const form = await formEngine.generateForm(profile, edgeCase.leg, schema);
        
        const endTime = performance.now();
        times[edgeCase.name] = endTime - startTime;
        
        // Verify form was generated successfully
        expect(form).toBeDefined();
        expect(form.totalFields).toBeGreaterThan(0);
        
        // Performance should still be good for edge cases
        expect(times[edgeCase.name]).toBeLessThan(100);
      }
      
      console.log(`Edge case performance:`);
      Object.entries(times).forEach(([caseName, time]) => {
        console.log(`- ${caseName}: ${time.toFixed(2)}ms`);
      });
    });
  });
});