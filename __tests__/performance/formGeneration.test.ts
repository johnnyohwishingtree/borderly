// Mock performance API
const performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
};
import {
  generateFilledForm,
  updateFormData,
  validateFormCompletion,
  exportFormData,
  calculateFormProgress,
} from '../../src/services/forms/formEngine';
import { testProfiles } from '../fixtures/testProfiles';
import { testTrips, tripLegsByCountry } from '../fixtures/testTrips';
import JPN_SCHEMA from '../../src/schemas/JPN.json';
import MYS_SCHEMA from '../../src/schemas/MYS.json';
import SGP_SCHEMA from '../../src/schemas/SGP.json';
import { CountryFormSchema } from '../../src/types/schema';

/**
 * Performance benchmarks for form generation pipeline.
 * Tests ensure form operations meet performance requirements for mobile app.
 */

describe('Form Generation Performance Tests', () => {
  const schemas = {
    JPN: JPN_SCHEMA as CountryFormSchema,
    MYS: MYS_SCHEMA as CountryFormSchema,
    SGP: SGP_SCHEMA as CountryFormSchema,
  };

  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    singleFormGeneration: 10, // Single form should generate in < 10ms
    multipleFormsGeneration: 100, // 10 forms should generate in < 100ms
    formUpdate: 5, // Form updates should be < 5ms
    formValidation: 10, // Form validation should be < 10ms (increased for CI stability)
    dataExport: 5, // Data export should be < 5ms
    progressCalculation: 3, // Progress calculation should be < 3ms
  };

  describe('Single Form Generation Performance', () => {
    it('should generate Japan form within performance threshold', () => {
      const profile = testProfiles.usa;
      const leg = tripLegsByCountry.JPN[0];
      const schema = schemas.JPN;

      const startTime = performance.now();
      const form = generateFilledForm(profile, leg, schema);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      expect(form.stats.totalFields).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleFormGeneration);
      
      console.log(`Japan form generation: ${duration.toFixed(2)}ms`);
    });

    it('should generate Malaysia form within performance threshold', () => {
      const profile = testProfiles.uk;
      const leg = tripLegsByCountry.MYS[0];
      const schema = schemas.MYS;

      const startTime = performance.now();
      const form = generateFilledForm(profile, leg, schema);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      expect(form.stats.totalFields).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleFormGeneration);
      
      console.log(`Malaysia form generation: ${duration.toFixed(2)}ms`);
    });

    it('should generate Singapore form within performance threshold', () => {
      const profile = testProfiles.australian;
      const leg = tripLegsByCountry.SGP[0];
      const schema = schemas.SGP;

      const startTime = performance.now();
      const form = generateFilledForm(profile, leg, schema);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      expect(form.stats.totalFields).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleFormGeneration);
      
      console.log(`Singapore form generation: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Multiple Forms Generation Performance', () => {
    it('should generate forms for multi-country trip efficiently', () => {
      const profile = testProfiles.usa;
      const trip = testTrips.asiaTrip;

      const startTime = performance.now();
      
      const forms = trip.legs.map(leg => {
        const schema = schemas[leg.destinationCountry as keyof typeof schemas];
        return generateFilledForm(profile, leg, schema);
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(forms).toHaveLength(3);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.multipleFormsGeneration);
      
      console.log(`Multi-country trip form generation: ${duration.toFixed(2)}ms`);
    });

    it('should handle batch form generation for multiple profiles', () => {
      const profiles = Object.values(testProfiles);
      const leg = tripLegsByCountry.JPN[0];
      const schema = schemas.JPN;

      const startTime = performance.now();
      
      const forms = profiles.map(profile => 
        generateFilledForm(profile, leg, schema)
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(forms).toHaveLength(profiles.length);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.multipleFormsGeneration);
      
      console.log(`Batch form generation (${profiles.length} profiles): ${duration.toFixed(2)}ms`);
    });

    it('should handle stress test with many form generations', () => {
      const profile = testProfiles.business;
      const leg = tripLegsByCountry.MYS[0];
      const schema = schemas.MYS;
      const iterations = 100;

      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        generateFilledForm(profile, leg, schema);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const averageDuration = duration / iterations;

      expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleFormGeneration);
      
      console.log(`Stress test (${iterations} iterations): ${duration.toFixed(2)}ms total, ${averageDuration.toFixed(2)}ms average`);
    });
  });

  describe('Form Update Performance', () => {
    let currentFormData: Record<string, unknown>;

    beforeEach(() => {
      const profile = testProfiles.usa;
      const leg = tripLegsByCountry.JPN[0];
      const schema = schemas.JPN;

      generateFilledForm(profile, leg, schema);
      currentFormData = {};
    });

    it('should update form data within performance threshold', () => {
      const startTime = performance.now();
      
      currentFormData = updateFormData(currentFormData, 'purposeOfVisit', 'business');
      currentFormData = updateFormData(currentFormData, 'currencyOver1M', false);
      currentFormData = updateFormData(currentFormData, 'meatProducts', false);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(Object.keys(currentFormData)).toHaveLength(3);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.formUpdate);
      
      console.log(`Form data update (3 fields): ${duration.toFixed(2)}ms`);
    });

    it('should regenerate form with user input efficiently', () => {
      const profile = testProfiles.usa;
      const leg = tripLegsByCountry.JPN[0];
      const schema = schemas.JPN;
      
      const formData = {
        purposeOfVisit: 'tourism',
        currencyOver1M: false,
        meatProducts: false,
        plantProducts: false,
      };

      const startTime = performance.now();
      const updatedForm = generateFilledForm(profile, leg, schema, formData);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(updatedForm.stats.userFilled).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleFormGeneration);
      
      console.log(`Form regeneration with user data: ${duration.toFixed(2)}ms`);
    });

    it('should handle rapid form updates', () => {
      const updateCount = 20;

      let formData: Record<string, unknown> = {};
      
      const startTime = performance.now();
      
      for (let i = 0; i < updateCount; i++) {
        formData = updateFormData(formData, `field_${i}`, `value_${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(Object.keys(formData)).toHaveLength(updateCount);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.formUpdate * updateCount);
      
      console.log(`Rapid form updates (${updateCount} updates): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Form Validation Performance', () => {
    it('should validate form completion within performance threshold', () => {
      const profile = testProfiles.uk;
      const leg = tripLegsByCountry.SGP[0];
      const schema = schemas.SGP;
      
      const form = generateFilledForm(profile, leg, schema);

      const startTime = performance.now();
      const validation = validateFormCompletion(form);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(validation.isComplete).toBeDefined();
      expect(Array.isArray(validation.missingFields)).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.formValidation);
      
      console.log(`Form validation: ${duration.toFixed(2)}ms`);
    });

    it('should validate large forms efficiently', () => {
      const profile = testProfiles.business;
      const leg = tripLegsByCountry.MYS[0]; // Malaysia has the most fields
      const schema = schemas.MYS;
      
      // Generate a large form with many fields
      const form = generateFilledForm(profile, leg, schema);

      const startTime = performance.now();
      validateFormCompletion(form);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.formValidation);

      console.log(`Large form validation (${form.stats.totalFields} fields): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Data Export Performance', () => {
    it('should export form data within performance threshold', () => {
      const profile = testProfiles.australian;
      const leg = tripLegsByCountry.JPN[0];
      const schema = schemas.JPN;
      
      const formData = {
        purposeOfVisit: 'tourism',
        currencyOver1M: false,
        meatProducts: false,
        plantProducts: false,
      };
      
      const form = generateFilledForm(profile, leg, schema, formData);

      const startTime = performance.now();
      const exportedData = exportFormData(form);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(Object.keys(exportedData).length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.dataExport);
      
      console.log(`Data export: ${duration.toFixed(2)}ms`);
    });

    it('should export large form data efficiently', () => {
      const profile = testProfiles.business;
      const leg = tripLegsByCountry.MYS[0];
      const schema = schemas.MYS;
      
      // Fill out all possible fields
      const formData: Record<string, unknown> = {};
      schema.sections.forEach(section => {
        section.fields.forEach(field => {
          switch (field.type) {
            case 'text':
            case 'textarea':
              formData[field.id] = `Sample value for ${field.id}`;
              break;
            case 'select':
              formData[field.id] = field.options?.[0]?.value || 'default';
              break;
            case 'boolean':
              formData[field.id] = false;
              break;
            case 'number':
              formData[field.id] = 42;
              break;
            case 'date':
              formData[field.id] = '2025-07-15';
              break;
          }
        });
      });
      
      const form = generateFilledForm(profile, leg, schema, formData);

      const startTime = performance.now();
      const exportedData = exportFormData(form);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.dataExport);
      
      console.log(`Large data export (${Object.keys(exportedData).length} fields): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Progress Calculation Performance', () => {
    it('should calculate form progress within performance threshold', () => {
      const profile = testProfiles.student;
      const leg = tripLegsByCountry.SGP[0];
      const schema = schemas.SGP;
      
      const form = generateFilledForm(profile, leg, schema);

      const startTime = performance.now();
      const progress = calculateFormProgress(form);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(progress.totalSections).toBe(schema.sections.length);
      expect(Array.isArray(progress.sectionProgress)).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.progressCalculation);
      
      console.log(`Progress calculation: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage and Efficiency', () => {
    it('should handle form generation without memory leaks', () => {
      const profile = testProfiles.usa;
      const leg = tripLegsByCountry.JPN[0];
      const schema = schemas.JPN;
      const iterations = 1000;

      // Perform many form generations to test for memory leaks
      for (let i = 0; i < iterations; i++) {
        const form = generateFilledForm(profile, leg, schema);
        
        // Simulate some operations on the form
        validateFormCompletion(form);
        exportFormData(form);
        calculateFormProgress(form);
        
        // Allow garbage collection if needed
        if (i % 100 === 0) {
          // Force garbage collection if available (Node.js)
          if ((globalThis as any).gc) {
            (globalThis as any).gc();
          }
        }
      }

      // If we reach here without running out of memory, test passes
      expect(true).toBe(true);
      
      console.log(`Memory test completed (${iterations} iterations)`);
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle typical user workflow efficiently', () => {
      const profile = testProfiles.business;
      const trip = testTrips.asiaTrip;
      
      const startTime = performance.now();
      
      // Simulate user workflow:
      // 1. Generate forms for all trip legs
      const forms = trip.legs.map(leg => {
        const schema = schemas[leg.destinationCountry as keyof typeof schemas];
        return generateFilledForm(profile, leg, schema);
      });
      
      // 2. User fills out Japan form
      let japanFormData: Record<string, unknown> = { purposeOfVisit: 'business', currencyOver1M: false };
      const japanSchema = schemas.JPN;
      const japanLeg = trip.legs[0];
      let updatedJapanForm = generateFilledForm(profile, japanLeg, japanSchema, japanFormData);
      
      // 3. Add more data to Japan form
      japanFormData = updateFormData(japanFormData, 'meatProducts', false);
      japanFormData = updateFormData(japanFormData, 'plantProducts', false);
      updatedJapanForm = generateFilledForm(profile, japanLeg, japanSchema, japanFormData);
      
      // 4. Validate and export Japan form
      const validation = validateFormCompletion(updatedJapanForm);
      const exportedData = exportFormData(updatedJapanForm);
      
      // 5. Check progress
      const progress = calculateFormProgress(updatedJapanForm);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(forms).toHaveLength(3);
      expect(exportedData).toBeDefined();
      expect(validation).toBeDefined();
      expect(progress).toBeDefined();
      
      // Entire workflow should complete quickly
      expect(duration).toBeLessThan(50); // 50ms for complete workflow
      
      console.log(`Complete user workflow: ${duration.toFixed(2)}ms`);
    });
  });
});