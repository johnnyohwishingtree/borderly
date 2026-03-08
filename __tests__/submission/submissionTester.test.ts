/**
 * Tests for SubmissionTester
 * 
 * Tests the mock-only submission testing framework
 */

import { SubmissionTester } from '@/services/testing/submissionTester';
import { TestDataFactory } from '@/utils/testHelpers';
import { FilledForm } from '@/services/forms/formEngine';
import { TripLeg } from '@/types/trip';
import { CountryFormSchema } from '@/types/schema';

describe('SubmissionTester', () => {
  let submissionTester: SubmissionTester;
  let sampleLeg: TripLeg;
  let sampleForm: FilledForm;
  let sampleSchema: CountryFormSchema;

  beforeEach(() => {
    submissionTester = new SubmissionTester({
      simulateNetworkDelay: false // Disable delays for faster tests
    });

    sampleLeg = TestDataFactory.createSampleTripLeg();
    sampleForm = TestDataFactory.createSampleFilledForm();
    sampleSchema = TestDataFactory.createSampleSchema();
  });

  afterEach(() => {
    submissionTester.clearTestResults();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const tester = new SubmissionTester();
      expect(tester).toBeInstanceOf(SubmissionTester);
    });

    it('should accept custom config', () => {
      const tester = new SubmissionTester({
        enableFieldValidation: false,
        simulateNetworkDelay: false
      });
      expect(tester).toBeInstanceOf(SubmissionTester);
    });
  });

  describe('testSubmission', () => {
    it('should successfully test valid form submission', async () => {
      const result = await submissionTester.testSubmission(sampleLeg, sampleForm, sampleSchema);

      expect(result.success).toBe(true);
      expect(result.submissionId).toBeDefined();
      expect(result.confirmationNumber).toBeDefined();
      expect(result.qrCode).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(result.testMetadata.formValidationPassed).toBe(true);
      expect(result.testMetadata.fieldMappingCorrect).toBe(true);
      expect(result.testMetadata.requiredFieldsPresent).toBe(true);
      expect(result.testMetadata.dataFormatValid).toBe(true);
    });

    it('should detect incomplete forms', async () => {
      const incompleteForm = TestDataFactory.createIncompleteForm();
      const result = await submissionTester.testSubmission(sampleLeg, incompleteForm, sampleSchema);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.testMetadata.requiredFieldsPresent).toBe(false);
      expect(result.errors.some(e => e.errorType === 'required_missing')).toBe(true);
    });

    it('should detect invalid data formats', async () => {
      const invalidForm = TestDataFactory.createInvalidForm();
      const result = await submissionTester.testSubmission(sampleLeg, invalidForm, sampleSchema);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.testMetadata.dataFormatValid).toBe(false);
      expect(result.errors.some(e => e.errorType === 'invalid_format')).toBe(true);
    });

    it('should generate unique submission IDs', async () => {
      const result1 = await submissionTester.testSubmission(sampleLeg, sampleForm, sampleSchema);
      const result2 = await submissionTester.testSubmission(sampleLeg, sampleForm, sampleSchema);

      expect(result1.submissionId).not.toBe(result2.submissionId);
    });

    it('should measure processing time', async () => {
      // Use a tester with network delay enabled to measure processing time
      const delayTester = new SubmissionTester({ simulateNetworkDelay: true });
      const result = await delayTester.testSubmission(sampleLeg, sampleForm, sampleSchema);

      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should handle different countries', async () => {
      const malaysiaSchema = TestDataFactory.createSampleSchema({
        countryCode: 'MYS',
        countryName: 'Malaysia',
        portalName: 'Malaysia Digital Arrival Card',
        sections: [
          {
            id: 'personal',
            title: 'Personal Information',
            fields: [
              {
                id: 'fullName',
                label: 'Full Name',
                type: 'text',
                required: true,
                autoFillSource: 'passport.fullName',
                countrySpecific: false
              },
              {
                id: 'passportNumber',
                label: 'Passport Number',
                type: 'text',
                required: true,
                autoFillSource: 'passport.documentNumber',
                countrySpecific: false
              },
              {
                id: 'arrivalDate',
                label: 'Arrival Date',
                type: 'date',
                required: true,
                autoFillSource: 'trip.arrivalDate',
                countrySpecific: false
              },
              {
                id: 'accommodationAddress',
                label: 'Accommodation Address',
                type: 'text',
                required: true,
                countrySpecific: true
              }
            ]
          }
        ]
      });

      // Create Malaysia-specific form with required fields
      const malaysiaForm = TestDataFactory.createSampleFilledForm({
        countryCode: 'MYS',
        sections: [
          {
            id: 'personal',
            title: 'Personal Information',
            fields: [
              {
                id: 'fullName',
                label: 'Full Name',
                type: 'text',
                required: true,
                currentValue: 'John Doe',
                source: 'auto',
                needsUserInput: false,
                countrySpecific: false
              },
              {
                id: 'passportNumber',
                label: 'Passport Number',
                type: 'text',
                required: true,
                currentValue: 'A1234567',
                source: 'auto',
                needsUserInput: false,
                countrySpecific: false
              },
              {
                id: 'arrivalDate',
                label: 'Arrival Date',
                type: 'date',
                required: true,
                currentValue: '2026-06-10',
                source: 'auto',
                needsUserInput: false,
                countrySpecific: false
              },
              {
                id: 'accommodationAddress',
                label: 'Accommodation Address',
                type: 'text',
                required: true,
                currentValue: 'Test Hotel KL',
                source: 'user',
                needsUserInput: false,
                countrySpecific: true
              }
            ]
          }
        ]
      });

      const result = await submissionTester.testSubmission(sampleLeg, malaysiaForm, malaysiaSchema);

      expect(result.success).toBe(true);
      expect(result.confirmationNumber).toContain('MYS');
    });

    it('should validate critical fields for each country', async () => {
      // Test Japan requirements
      const jpnForm = TestDataFactory.createSampleFilledForm();
      jpnForm.sections[0].fields = jpnForm.sections[0].fields.filter(f => f.id !== 'passportNumber');
      
      const result = await submissionTester.testSubmission(sampleLeg, jpnForm, sampleSchema);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.fieldId === 'passportNumber')).toBe(true);
    });
  });

  describe('field validation', () => {
    it('should validate required fields', async () => {
      const form = TestDataFactory.createSampleFilledForm();
      form.sections[0].fields[0].currentValue = ''; // Remove surname
      form.sections[0].fields[0].required = true;

      const result = await submissionTester.testSubmission(sampleLeg, form, sampleSchema);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.errorType === 'required_missing')).toBe(true);
      expect(result.testMetadata.formValidationPassed).toBe(false);
    });

    it('should validate field formats', async () => {
      const form = TestDataFactory.createSampleFilledForm();
      form.sections[0].fields.push({
        id: 'email',
        label: 'Email',
        type: 'email' as any,
        required: true,
        currentValue: 'invalid-email',
        validation: { pattern: 'email' },
        source: 'user',
        needsUserInput: true,
        countrySpecific: false
      });

      const result = await submissionTester.testSubmission(sampleLeg, form, sampleSchema);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.errorType === 'invalid_format')).toBe(true);
    });

    it('should warn about country-specific fields', async () => {
      const form = TestDataFactory.createSampleFilledForm();
      form.sections[0].fields.push({
        id: 'visaNumber',
        label: 'Visa Number',
        type: 'text',
        required: false,
        currentValue: '',
        source: 'user',
        needsUserInput: true,
        countrySpecific: true
      });

      const result = await submissionTester.testSubmission(sampleLeg, form, sampleSchema);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Country-specific'))).toBe(true);
    });
  });

  describe('field mapping validation', () => {
    it('should detect missing required schema fields', async () => {
      const schema = TestDataFactory.createSampleSchema();
      schema.sections[0].fields.push({
        id: 'missingRequiredField',
        label: 'Missing Required Field',
        type: 'text',
        required: true,
        countrySpecific: true
      });

      const result = await submissionTester.testSubmission(sampleLeg, sampleForm, schema);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.errorType === 'mapping_error')).toBe(true);
      expect(result.testMetadata.fieldMappingCorrect).toBe(false);
    });

    it('should warn about missing optional schema fields', async () => {
      const schema = TestDataFactory.createSampleSchema();
      schema.sections[0].fields.push({
        id: 'missingOptionalField',
        label: 'Missing Optional Field',
        type: 'text',
        required: false,
        countrySpecific: false
      });

      const result = await submissionTester.testSubmission(sampleLeg, sampleForm, schema);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('missingOptionalField'))).toBe(true);
    });
  });

  describe('test result tracking', () => {
    it('should track test results by country', async () => {
      await submissionTester.testSubmission(sampleLeg, sampleForm, sampleSchema);
      await submissionTester.testSubmission(sampleLeg, sampleForm, sampleSchema);

      const results = submissionTester.getTestResults('JPN');
      expect(results).toHaveLength(2);
    });

    it('should calculate success rates', async () => {
      // Add successful test
      await submissionTester.testSubmission(sampleLeg, sampleForm, sampleSchema);
      
      // Add failed test
      const invalidForm = TestDataFactory.createIncompleteForm();
      await submissionTester.testSubmission(sampleLeg, invalidForm, sampleSchema);

      const successRate = submissionTester.getTestSuccessRate('JPN');
      expect(successRate).toBe(50); // 1 out of 2 successful
    });

    it('should generate test summary', async () => {
      await submissionTester.testSubmission(sampleLeg, sampleForm, sampleSchema);
      
      const malaysiaLeg = TestDataFactory.createSampleTripLeg({ destinationCountry: 'MYS' });
      const malaysiaSchema = TestDataFactory.createSampleSchema({ countryCode: 'MYS' });
      await submissionTester.testSubmission(malaysiaLeg, sampleForm, malaysiaSchema);

      const summary = submissionTester.getTestSummary();
      expect(summary.totalTests).toBe(2);
      expect(summary.countriesTested).toContain('JPN');
      expect(summary.countriesTested).toContain('MYS');
    });

    it('should limit stored test results', async () => {
      // Create more than the limit
      for (let i = 0; i < 60; i++) {
        await submissionTester.testSubmission(sampleLeg, sampleForm, sampleSchema);
      }

      const results = submissionTester.getTestResults('JPN');
      expect(results.length).toBeLessThanOrEqual(50); // Should be limited to 50
    });
  });

  describe('mock data generation', () => {
    it('should generate valid confirmation numbers', async () => {
      const result = await submissionTester.testSubmission(sampleLeg, sampleForm, sampleSchema);

      expect(result.confirmationNumber).toBeDefined();
      expect(result.confirmationNumber!.startsWith('JPN')).toBe(true);
      expect(result.confirmationNumber!.length).toBeGreaterThan(8);
    });

    it('should generate mock QR codes', async () => {
      const result = await submissionTester.testSubmission(sampleLeg, sampleForm, sampleSchema);

      expect(result.qrCode).toBeDefined();
      expect(result.qrCode!.startsWith('QR_MOCK_')).toBe(true);
      expect(result.qrCode!).toContain(result.confirmationNumber!);
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidSchema = TestDataFactory.createSampleSchema();
      // @ts-expect-error - Intentionally invalid schema for testing
      invalidSchema.sections = null;

      const result = await submissionTester.testSubmission(sampleLeg, sampleForm, invalidSchema);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.fieldId === 'system')).toBe(true);
    });

    it('should provide helpful error messages', async () => {
      const incompleteForm = TestDataFactory.createIncompleteForm();
      const result = await submissionTester.testSubmission(sampleLeg, incompleteForm, sampleSchema);

      result.errors.forEach(error => {
        expect(error.message).toBeTruthy();
        expect(error.suggestion).toBeTruthy();
      });
    });
  });

  describe('country-specific validation', () => {
    const testCountries = [
      { code: 'JPN', name: 'Japan' },
      { code: 'MYS', name: 'Malaysia' },
      { code: 'SGP', name: 'Singapore' },
      { code: 'THA', name: 'Thailand' },
      { code: 'VNM', name: 'Vietnam' },
      { code: 'USA', name: 'United States' },
      { code: 'GBR', name: 'United Kingdom' },
      { code: 'CAN', name: 'Canada' }
    ];

    testCountries.forEach(country => {
      it(`should validate critical fields for ${country.name}`, async () => {
        const leg = TestDataFactory.createSampleTripLeg({ destinationCountry: country.code });
        const schema = TestDataFactory.createSampleSchema({ 
          countryCode: country.code,
          countryName: country.name
        });
        
        // Create form missing passport number (critical for all countries)
        const form = TestDataFactory.createSampleFilledForm();
        form.sections[0].fields = form.sections[0].fields.filter(f => f.id !== 'passportNumber');

        const result = await submissionTester.testSubmission(leg, form, schema);

        expect(result.success).toBe(false);
        expect(result.errors.some(e => 
          e.fieldId === 'passportNumber' && e.errorType === 'required_missing'
        )).toBe(true);
      });
    });
  });

  describe('performance', () => {
    it('should complete tests within reasonable time', async () => {
      const startTime = Date.now();
      await submissionTester.testSubmission(sampleLeg, sampleForm, sampleSchema);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple concurrent tests', async () => {
      const testPromises = Array.from({ length: 10 }, () => 
        submissionTester.testSubmission(sampleLeg, sampleForm, sampleSchema)
      );

      const results = await Promise.all(testPromises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.submissionId).toBeDefined();
      });

      // All submission IDs should be unique
      const submissionIds = results.map(r => r.submissionId);
      const uniqueIds = new Set(submissionIds);
      expect(uniqueIds.size).toBe(10);
    });
  });
});