import {
  generateFilledForm,
  updateFormData,
  validateFormCompletion,
  exportFormData,
  calculateFormProgress,
  getCountrySpecificFields,
} from '../../src/services/forms/formEngine';
import { testProfiles } from '../fixtures/testProfiles';
import { testTrips, tripLegsByCountry } from '../fixtures/testTrips';
import JPN_SCHEMA from '../../src/schemas/JPN.json';
import MYS_SCHEMA from '../../src/schemas/MYS.json';
import SGP_SCHEMA from '../../src/schemas/SGP.json';
import { CountryFormSchema } from '../../src/types/schema';

/**
 * Integration tests for the complete form generation pipeline.
 * Tests end-to-end functionality with real country schemas and test data.
 */

describe('Form Flow Integration Tests', () => {
  const schemas = {
    JPN: JPN_SCHEMA as CountryFormSchema,
    MYS: MYS_SCHEMA as CountryFormSchema,
    SGP: SGP_SCHEMA as CountryFormSchema,
  };

  describe('Complete Form Generation Pipeline', () => {
    it('should generate forms for all three countries with USA profile', () => {
      const profile = testProfiles.usa;

      Object.entries(schemas).forEach(([countryCode, schema]) => {
        const legs = tripLegsByCountry[countryCode as keyof typeof tripLegsByCountry];
        
        legs.forEach(leg => {
          const form = generateFilledForm(profile, leg, schema);
          
          // Basic form structure validation
          expect(form.countryCode).toBe(countryCode);
          expect(form.sections.length).toBeGreaterThan(0);
          expect(form.stats.totalFields).toBeGreaterThan(0);
          
          // Auto-fill validation - should auto-fill basic passport data
          expect(form.stats.autoFilled).toBeGreaterThan(0);
          
          // Find surname field in any section and verify it's auto-filled
          const surnameField = form.sections
            .flatMap(s => s.fields)
            .find(f => f.id === 'surname');
          
          if (surnameField) {
            expect(surnameField.currentValue).toBe('JOHNSON');
            expect(surnameField.source).toBe('auto');
            expect(surnameField.needsUserInput).toBe(false);
          }
        });
      });
    });

    it('should handle multi-country trip with consistent data', () => {
      const profile = testProfiles.usa;
      const trip = testTrips.asiaTrip;
      const formsGenerated: Array<{ countryCode: string; form: any }> = [];

      // Generate forms for each leg of the trip
      trip.legs.forEach(leg => {
        const schema = schemas[leg.destinationCountry as keyof typeof schemas];
        const form = generateFilledForm(profile, leg, schema);
        formsGenerated.push({ countryCode: leg.destinationCountry, form });
      });

      expect(formsGenerated).toHaveLength(3); // Japan, Malaysia, Singapore

      // Verify passport data is consistent across all forms
      formsGenerated.forEach(({ countryCode, form }) => {
        const passportField = form.sections
          .flatMap((s: any) => s.fields)
          .find((f: any) => f.id === 'passportNumber');
        
        if (passportField) {
          expect(passportField.currentValue).toBe('L898902C3');
          expect(passportField.source).toBe('auto');
        }
      });
    });
  });

  describe('User Input and Form Updates', () => {
    it('should handle user input workflow for Japan form', () => {
      const profile = testProfiles.usa;
      const leg = tripLegsByCountry.JPN[0];
      const schema = schemas.JPN;

      // 1. Generate initial form
      const initialForm = generateFilledForm(profile, leg, schema);
      expect(initialForm.stats.remaining).toBeGreaterThan(0);

      // 2. Identify country-specific fields needing input
      const countrySpecific = getCountrySpecificFields(initialForm);
      expect(countrySpecific.length).toBeGreaterThan(0);

      // 3. Simulate user filling country-specific fields
      let formData: Record<string, unknown> = {};
      
      // Find purpose of visit field and fill it
      const purposeField = countrySpecific.find(f => f.id === 'purposeOfVisit');
      if (purposeField) {
        formData = updateFormData(formData, 'purposeOfVisit', 'tourism');
      }

      // Find currency field and fill it
      const currencyField = countrySpecific.find(f => f.id === 'currencyOver1M');
      if (currencyField) {
        formData = updateFormData(formData, 'currencyOver1M', false);
      }

      // Find meat products field and fill it
      const meatField = countrySpecific.find(f => f.id === 'meatProducts');
      if (meatField) {
        formData = updateFormData(formData, 'meatProducts', false);
      }

      // Find plant products field and fill it
      const plantField = countrySpecific.find(f => f.id === 'plantProducts');
      if (plantField) {
        formData = updateFormData(formData, 'plantProducts', false);
      }

      // 4. Regenerate form with user input
      const updatedForm = generateFilledForm(profile, leg, schema, formData);

      // 5. Verify form completion improved
      expect(updatedForm.stats.userFilled).toBeGreaterThan(initialForm.stats.userFilled);
      expect(updatedForm.stats.remaining).toBeLessThan(initialForm.stats.remaining);
    });

    it('should complete Malaysia form workflow', () => {
      const profile = testProfiles.uk; // UK profile for variation
      const leg = tripLegsByCountry.MYS[0];
      const schema = schemas.MYS;

      // Generate initial form
      const initialForm = generateFilledForm(profile, leg, schema);
      const validation = validateFormCompletion(initialForm);
      expect(validation.isComplete).toBe(false);

      // Fill in Malaysia-specific required fields
      let formData: Record<string, unknown> = {};
      
      validation.missingFields.forEach(fieldId => {
        const field = initialForm.sections
          .flatMap(s => s.fields)
          .find(f => f.id === fieldId);
        
        if (field) {
          switch (field.type) {
            case 'select':
              formData = updateFormData(formData, fieldId, field.options?.[0]?.value || 'other');
              break;
            case 'boolean':
              formData = updateFormData(formData, fieldId, false);
              break;
            default:
              if (field.countrySpecific) {
                formData = updateFormData(formData, fieldId, `Sample ${fieldId} value`);
              }
          }
        }
      });

      // Regenerate and validate completion
      const completedForm = generateFilledForm(profile, leg, schema, formData);
      const finalValidation = validateFormCompletion(completedForm);
      
      // Should be much closer to completion
      expect(finalValidation.missingFields.length).toBeLessThan(validation.missingFields.length);
    });
  });

  describe('Form Export and Submission Preparation', () => {
    it('should export complete Japan form data', () => {
      const profile = testProfiles.business; // Business traveler with more declarations
      const leg = tripLegsByCountry.JPN[1]; // Business leg
      const schema = schemas.JPN;

      // Fill out complete form
      const formData = {
        purposeOfVisit: 'business',
        currencyOver1M: false,
        meatProducts: false,
        plantProducts: false,
        // Add any other required fields that aren't auto-filled
      };

      const form = generateFilledForm(profile, leg, schema, formData);
      const exportedData = exportFormData(form);

      // Verify exported data includes auto-filled passport info
      expect(exportedData.surname).toBe('TANAKA');
      expect(exportedData.givenNames).toBe('HIROSHI');
      expect(exportedData.passportNumber).toBe('B9876543');
      expect(exportedData.purposeOfVisit).toBe('business');

      // Verify travel information is included
      expect(exportedData.arrivalDate).toBe('2025-08-10');
      expect(exportedData.durationOfStay).toBe(3); // 3-day business trip

      // Verify accommodation details
      expect(exportedData.hotelName).toBe('Hotel New Otani Tokyo');
      expect(exportedData.hotelAddress).toContain('Kioi-cho');
    });

    it('should calculate form progress accurately', () => {
      const profile = testProfiles.student;
      const leg = tripLegsByCountry.SGP[0];
      const schema = schemas.SGP;

      const form = generateFilledForm(profile, leg, schema);
      const progress = calculateFormProgress(form);

      expect(progress.totalSections).toBe(schema.sections.length);
      expect(progress.completedSections).toBeGreaterThanOrEqual(0);
      expect(progress.sectionProgress).toHaveLength(schema.sections.length);

      // Each section should have valid progress tracking
      progress.sectionProgress.forEach(section => {
        expect(section.completed).toBeGreaterThanOrEqual(0);
        expect(section.total).toBeGreaterThan(0);
        expect(section.completed).toBeLessThanOrEqual(section.total);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle profile with missing optional data', () => {
      const profile = testProfiles.minimal; // Profile with minimal data
      
      Object.entries(schemas).forEach(([countryCode, schema]) => {
        const leg = tripLegsByCountry[countryCode as keyof typeof tripLegsByCountry][0];
        
        expect(() => {
          const form = generateFilledForm(profile, leg, schema);
          expect(form.stats.totalFields).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });

    it('should handle trip leg with missing accommodation details', () => {
      const profile = testProfiles.usa;
      const leg = tripLegsByCountry.JPN[2]; // Minimal accommodation leg
      const schema = schemas.JPN;

      const form = generateFilledForm(profile, leg, schema);
      
      // Form should still be generated even with missing accommodation
      expect(form.sections).toHaveLength(schema.sections.length);
      
      // Accommodation fields should need user input
      const accommodationSection = form.sections.find(s => s.id === 'accommodation');
      if (accommodationSection) {
        const addressField = accommodationSection.fields.find(f => f.id === 'hotelAddress');
        if (addressField) {
          expect(addressField.needsUserInput).toBe(true);
        }
      }
    });

    it('should handle open-ended trip (no departure date)', () => {
      const profile = testProfiles.australian;
      const leg = tripLegsByCountry.MYS[2]; // Open-ended leg
      const schema = schemas.MYS;

      const form = generateFilledForm(profile, leg, schema);
      
      // Duration field should need user input
      const durationField = form.sections
        .flatMap(s => s.fields)
        .find(f => f.id === 'durationOfStay');
      
      if (durationField) {
        expect(durationField.needsUserInput).toBe(true);
        expect(durationField.source).toBe('default');
      }
    });

    it('should maintain data consistency across form regenerations', () => {
      const profile = testProfiles.uk;
      const leg = tripLegsByCountry.JPN[0];
      const schema = schemas.JPN;

      // Generate initial form
      const form1 = generateFilledForm(profile, leg, schema);
      
      // Add user input
      const formData = { purposeOfVisit: 'business', currencyOver1M: true };
      const form2 = generateFilledForm(profile, leg, schema, formData);
      
      // Add more user input
      const formData2 = { ...formData, meatProducts: false };
      const form3 = generateFilledForm(profile, leg, schema, formData2);

      // Auto-filled data should remain consistent
      [form1, form2, form3].forEach(form => {
        const surnameField = form.sections
          .flatMap(s => s.fields)
          .find(f => f.id === 'surname');
        
        if (surnameField) {
          expect(surnameField.currentValue).toBe('SMITH-JONES');
          expect(surnameField.source).toBe('auto');
        }
      });

      // User input should accumulate correctly
      const purposeFieldForm3 = form3.sections
        .flatMap(s => s.fields)
        .find(f => f.id === 'purposeOfVisit');
      
      if (purposeFieldForm3) {
        expect(purposeFieldForm3.currentValue).toBe('business');
        expect(purposeFieldForm3.source).toBe('user');
      }
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle rapid form generation for multiple profiles', () => {
      const startTime = performance.now();
      const results: any[] = [];

      // Generate forms for all profiles with all countries
      Object.values(testProfiles).forEach(profile => {
        Object.entries(schemas).forEach(([countryCode, schema]) => {
          const leg = tripLegsByCountry[countryCode as keyof typeof tripLegsByCountry][0];
          const form = generateFilledForm(profile, leg, schema);
          results.push(form);
        });
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(Object.keys(testProfiles).length * 3); // 6 profiles * 3 countries
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle large form data objects efficiently', () => {
      const profile = testProfiles.business;
      const leg = tripLegsByCountry.MYS[0]; // Malaysia has the most fields
      const schema = schemas.MYS;

      // Generate large form data object
      const formData: Record<string, unknown> = {};
      schema.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.type === 'text') {
            formData[field.id] = 'Test value '.repeat(100); // Long text
          } else if (field.type === 'select' && field.options) {
            formData[field.id] = field.options[0].value;
          } else if (field.type === 'boolean') {
            formData[field.id] = false;
          } else if (field.type === 'number') {
            formData[field.id] = 42;
          }
        });
      });

      const startTime = performance.now();
      const form = generateFilledForm(profile, leg, schema, formData);
      const endTime = performance.now();

      expect(form.stats.totalFields).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should handle large data quickly
    });
  });
});