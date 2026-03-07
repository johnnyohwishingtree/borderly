/**
 * Tests for Schema Validation in Testing Framework
 * 
 * Tests schema validation capabilities for government forms
 * and defensive testing of schema compliance.
 */

import { ComplianceValidator } from '@/services/testing/complianceValidator';
import { SubmissionTester } from '@/services/testing/submissionTester';
import { TestDataFactory, ValidationHelpers } from '@/utils/testHelpers';
import { CountryFormSchema } from '@/types/schema';
import { FilledForm } from '@/services/forms/formEngine';

describe('Schema Validation Testing', () => {
  let complianceValidator: ComplianceValidator;
  let submissionTester: SubmissionTester;

  beforeEach(() => {
    complianceValidator = new ComplianceValidator();
    submissionTester = new SubmissionTester();
  });

  afterEach(() => {
    complianceValidator.clearHistory();
    submissionTester.clearTestResults();
  });

  describe('Schema Structure Validation', () => {
    it('should validate basic schema structure', () => {
      const schema = TestDataFactory.createSampleSchema();

      expect(schema.countryCode).toBeTruthy();
      expect(ValidationHelpers.validateCountryCode(schema.countryCode)).toBe(true);
      expect(schema.sections).toBeDefined();
      expect(Array.isArray(schema.sections)).toBe(true);
      expect(schema.sections.length).toBeGreaterThan(0);
      expect(ValidationHelpers.validateURL(schema.portalUrl)).toBe(true);
    });

    it('should validate field definitions', () => {
      const schema = TestDataFactory.createSampleSchema();

      schema.sections.forEach(section => {
        expect(section.id).toBeTruthy();
        expect(section.title).toBeTruthy();
        expect(Array.isArray(section.fields)).toBe(true);

        section.fields.forEach(field => {
          expect(field.id).toBeTruthy();
          expect(field.label).toBeTruthy();
          expect(field.type).toBeTruthy();
          expect(typeof field.required).toBe('boolean');
        });
      });
    });

    it('should validate required fields for each country', () => {
      const countries = [
        { code: 'JPN', requiredFields: ['surname', 'givenName', 'passportNumber', 'arrivalDate'] },
        { code: 'MYS', requiredFields: ['fullName', 'passportNumber', 'arrivalDate'] },
        { code: 'SGP', requiredFields: ['surname', 'givenName', 'passportNumber', 'arrivalDate'] },
        { code: 'THA', requiredFields: ['surname', 'givenName', 'passportNumber', 'arrivalDate'] },
        { code: 'VNM', requiredFields: ['fullName', 'passportNumber', 'arrivalDate'] },
        { code: 'USA', requiredFields: ['surname', 'givenName', 'passportNumber', 'arrivalDate'] },
        { code: 'GBR', requiredFields: ['surname', 'givenName', 'passportNumber', 'arrivalDate'] },
        { code: 'CAN', requiredFields: ['surname', 'givenName', 'passportNumber', 'arrivalDate'] }
      ];

      countries.forEach(country => {
        const schema = TestDataFactory.createSampleSchema({
          countryCode: country.code
        });

        // Add required fields for testing
        schema.sections = [{
          id: 'personal',
          title: 'Personal Information',
          fields: country.requiredFields.map(fieldId => ({
            id: fieldId,
            label: fieldId.charAt(0).toUpperCase() + fieldId.slice(1),
            type: 'text',
            required: true
          }))
        }];

        // Validate schema has all required fields
        const fieldIds = schema.sections.flatMap(s => s.fields.map(f => f.id));
        country.requiredFields.forEach(requiredField => {
          expect(fieldIds).toContain(requiredField);
        });
      });
    });

    it('should validate auto-fill sources', () => {
      const schema = TestDataFactory.createSampleSchema();

      // Add fields with auto-fill sources
      schema.sections[0].fields.forEach(field => {
        if (field.id === 'surname') {
          field.autoFillSource = 'passport.surname';
        } else if (field.id === 'passportNumber') {
          field.autoFillSource = 'passport.documentNumber';
        }
      });

      schema.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.autoFillSource) {
            expect(field.autoFillSource).toMatch(/^[a-zA-Z]+(\.[a-zA-Z]+)*$/);
            expect(field.autoFillSource.startsWith('passport.') || 
                   field.autoFillSource.startsWith('profile.') ||
                   field.autoFillSource.startsWith('trip.')).toBe(true);
          }
        });
      });
    });
  });

  describe('Schema-Form Compatibility Testing', () => {
    it('should validate form matches schema requirements', async () => {
      const schema = TestDataFactory.createSampleSchema();
      const form = TestDataFactory.createSampleFilledForm();
      const leg = TestDataFactory.createSampleTripLeg();

      const result = await submissionTester.testSubmission(leg, form, schema);

      expect(result.testMetadata.fieldMappingCorrect).toBe(true);
      expect(result.testMetadata.requiredFieldsPresent).toBe(true);
    });

    it('should detect missing required fields from schema', async () => {
      const schema = TestDataFactory.createSampleSchema();
      const form = TestDataFactory.createSampleFilledForm();
      const leg = TestDataFactory.createSampleTripLeg();

      // Add required field to schema that's not in form
      schema.sections[0].fields.push({
        id: 'emergencyContact',
        label: 'Emergency Contact',
        type: 'text',
        required: true
      });

      const result = await submissionTester.testSubmission(leg, form, schema);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => 
        e.fieldId === 'emergencyContact' && e.errorType === 'mapping_error'
      )).toBe(true);
    });

    it('should validate field type compatibility', async () => {
      const schema = TestDataFactory.createSampleSchema();
      const form = TestDataFactory.createSampleFilledForm();
      const leg = TestDataFactory.createSampleTripLeg();

      // Add date field to form with string value
      form.sections[1].fields[0].type = 'date';
      form.sections[1].fields[0].currentValue = 'invalid-date';

      const result = await submissionTester.testSubmission(leg, form, schema);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.errorType === 'invalid_format')).toBe(true);
    });

    it('should handle optional fields correctly', async () => {
      const schema = TestDataFactory.createSampleSchema();
      const form = TestDataFactory.createSampleFilledForm();
      const leg = TestDataFactory.createSampleTripLeg();

      // Add optional field to schema
      schema.sections[0].fields.push({
        id: 'middleName',
        label: 'Middle Name',
        type: 'text',
        required: false
      });

      const result = await submissionTester.testSubmission(leg, form, schema);

      expect(result.success).toBe(true); // Should still pass without optional field
      expect(result.warnings.some(w => w.includes('middleName'))).toBe(true);
    });
  });

  describe('Country-Specific Schema Validation', () => {
    it('should validate Japan-specific requirements', async () => {
      const jpnSchema: CountryFormSchema = {
        countryCode: 'JPN',
        countryName: 'Japan',
        portalName: 'Visit Japan Web',
        portalUrl: 'https://vjw-lp.digital.go.jp/en/',
        version: '1.0.0',
        lastUpdated: '2026-01-01',
        sections: [
          {
            id: 'personal',
            title: 'Personal Information',
            fields: [
              { id: 'surname', label: 'Surname', type: 'text', required: true },
              { id: 'givenName', label: 'Given Name', type: 'text', required: true },
              { id: 'passportNumber', label: 'Passport Number', type: 'text', required: true },
            ]
          },
          {
            id: 'travel',
            title: 'Travel Information',
            fields: [
              { id: 'arrivalDate', label: 'Arrival Date', type: 'date', required: true },
              { id: 'departureDate', label: 'Departure Date', type: 'date', required: false },
              { id: 'purposeOfVisit', label: 'Purpose of Visit', type: 'select', required: true },
            ]
          },
          {
            id: 'accommodation',
            title: 'Accommodation',
            fields: [
              { id: 'accommodationName', label: 'Hotel Name', type: 'text', required: true },
              { id: 'accommodationAddress', label: 'Hotel Address', type: 'text', required: true },
            ]
          }
        ]
      };

      const form = TestDataFactory.createSampleFilledForm({ countryCode: 'JPN' });
      const leg = TestDataFactory.createSampleTripLeg({ destinationCountry: 'JPN' });

      const result = await submissionTester.testSubmission(leg, form, jpnSchema);

      // Should detect missing accommodation fields
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.fieldId.includes('accommodation'))).toBe(true);
    });

    it('should validate Malaysia-specific requirements', async () => {
      const mysSchema: CountryFormSchema = {
        countryCode: 'MYS',
        countryName: 'Malaysia',
        portalName: 'Malaysia Digital Arrival Card',
        portalUrl: 'https://imigresen-online.imi.gov.my/mdac/main',
        version: '1.0.0',
        lastUpdated: '2026-01-01',
        sections: [
          {
            id: 'personal',
            title: 'Personal Information',
            fields: [
              { id: 'fullName', label: 'Full Name', type: 'text', required: true },
              { id: 'passportNumber', label: 'Passport Number', type: 'text', required: true },
              { id: 'nationality', label: 'Nationality', type: 'text', required: true },
            ]
          },
          {
            id: 'travel',
            title: 'Travel Information',
            fields: [
              { id: 'arrivalDate', label: 'Arrival Date', type: 'date', required: true },
              { id: 'flightNumber', label: 'Flight Number', type: 'text', required: true },
            ]
          }
        ]
      };

      const form = TestDataFactory.createSampleFilledForm({ countryCode: 'MYS' });
      const leg = TestDataFactory.createSampleTripLeg({ destinationCountry: 'MYS' });

      const result = await submissionTester.testSubmission(leg, form, mysSchema);

      // Should detect missing Malaysia-specific fields
      expect(result.success).toBe(false);
      expect(result.errors.some(e => 
        ['fullName', 'nationality', 'flightNumber'].includes(e.fieldId)
      )).toBe(true);
    });

    it('should validate Singapore-specific requirements', async () => {
      const sgpSchema: CountryFormSchema = {
        countryCode: 'SGP',
        countryName: 'Singapore',
        portalName: 'SG Arrival Card',
        portalUrl: 'https://eservices.ica.gov.sg/sgarrivalcard/',
        version: '1.0.0',
        lastUpdated: '2026-01-01',
        sections: [
          {
            id: 'personal',
            title: 'Personal Information',
            fields: [
              { id: 'surname', label: 'Surname', type: 'text', required: true },
              { id: 'givenName', label: 'Given Name', type: 'text', required: true },
              { id: 'passportNumber', label: 'Passport Number', type: 'text', required: true },
            ]
          },
          {
            id: 'travel',
            title: 'Travel Information',
            fields: [
              { id: 'arrivalDate', label: 'Arrival Date', type: 'date', required: true },
              { id: 'lengthOfStay', label: 'Length of Stay (days)', type: 'number', required: true },
            ]
          }
        ]
      };

      const form = TestDataFactory.createSampleFilledForm({ countryCode: 'SGP' });
      const leg = TestDataFactory.createSampleTripLeg({ destinationCountry: 'SGP' });

      const result = await submissionTester.testSubmission(leg, form, sgpSchema);

      expect(result.errors.some(e => e.fieldId === 'lengthOfStay')).toBe(true);
    });
  });

  describe('Schema Evolution and Versioning', () => {
    it('should handle schema version compatibility', () => {
      const v1Schema = TestDataFactory.createSampleSchema({ version: '1.0.0' });
      const v2Schema = TestDataFactory.createSampleSchema({ version: '2.0.0' });

      expect(v1Schema.version).toBe('1.0.0');
      expect(v2Schema.version).toBe('2.0.0');

      // Both should have valid basic structure
      [v1Schema, v2Schema].forEach(schema => {
        expect(schema.countryCode).toBeTruthy();
        expect(schema.sections).toBeDefined();
        expect(schema.sections.length).toBeGreaterThan(0);
      });
    });

    it('should validate schema update timestamps', () => {
      const schema = TestDataFactory.createSampleSchema();

      expect(schema.lastUpdated).toBeTruthy();
      expect(ValidationHelpers.validateDateFormat(schema.lastUpdated.split('T')[0])).toBe(true);
    });

    it('should detect schema changes that break compatibility', async () => {
      const originalSchema = TestDataFactory.createSampleSchema();
      const form = TestDataFactory.createSampleFilledForm();
      const leg = TestDataFactory.createSampleTripLeg();

      // Test with original schema
      const originalResult = await submissionTester.testSubmission(leg, form, originalSchema);
      expect(originalResult.success).toBe(true);

      // Modify schema to remove required field
      const modifiedSchema = {
        ...originalSchema,
        sections: originalSchema.sections.map(section => ({
          ...section,
          fields: section.fields.filter(field => field.id !== 'surname')
        }))
      };

      // Form should now have extra field not in schema
      const modifiedResult = await submissionTester.testSubmission(leg, form, modifiedSchema);
      expect(modifiedResult.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Data Format Validation', () => {
    it('should validate date formats', async () => {
      const schema = TestDataFactory.createSampleSchema();
      const form = TestDataFactory.createSampleFilledForm();
      const leg = TestDataFactory.createSampleTripLeg();

      // Test valid date format
      form.sections[1].fields[0].currentValue = '2026-06-15';
      form.sections[1].fields[0].type = 'date';

      let result = await submissionTester.testSubmission(leg, form, schema);
      expect(result.testMetadata.dataFormatValid).toBe(true);

      // Test invalid date format
      form.sections[1].fields[0].currentValue = '06/15/2026';

      result = await submissionTester.testSubmission(leg, form, schema);
      expect(result.testMetadata.dataFormatValid).toBe(false);
    });

    it('should validate email formats', async () => {
      const schema = TestDataFactory.createSampleSchema();
      const form = TestDataFactory.createSampleFilledForm();
      const leg = TestDataFactory.createSampleTripLeg();

      // Add email field
      form.sections[0].fields.push({
        id: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        currentValue: 'valid@example.com',
        source: 'user',
        needsUserInput: true,
        countrySpecific: false
      });

      let result = await submissionTester.testSubmission(leg, form, schema);
      expect(result.testMetadata.dataFormatValid).toBe(true);

      // Test invalid email
      form.sections[0].fields[form.sections[0].fields.length - 1].currentValue = 'invalid-email';

      result = await submissionTester.testSubmission(leg, form, schema);
      expect(result.testMetadata.dataFormatValid).toBe(false);
    });

    it('should validate passport number formats', () => {
      const validPassportNumbers = [
        'A1234567',
        'AB123456',
        'AB1234567',
        'A12345678'
      ];

      const invalidPassportNumbers = [
        '12345',       // Too short
        'ABCDEFGHIJKLM', // Too long (14 chars)
        'A123',        // Too short
        ''             // Empty
      ];

      validPassportNumbers.forEach(passport => {
        expect(/^[A-Z0-9]{6,12}$/.test(passport)).toBe(true);
      });

      invalidPassportNumbers.forEach(passport => {
        expect(/^[A-Z0-9]{6,12}$/.test(passport)).toBe(false);
      });
    });
  });

  describe('Schema Security Validation', () => {
    it('should validate schemas do not expose sensitive endpoints', () => {
      const schema = TestDataFactory.createSampleSchema();

      // Portal URL should be HTTPS
      expect(schema.portalUrl.startsWith('https://')).toBe(true);

      // Should not contain internal or admin paths
      expect(schema.portalUrl).not.toMatch(/\/(admin|internal|api|test)/i);
    });

    it('should validate field definitions do not request excessive data', async () => {
      const schema = TestDataFactory.createSampleSchema();
      const form = TestDataFactory.createSampleFilledForm();
      const leg = TestDataFactory.createSampleTripLeg();

      // Add excessive personal data field
      schema.sections[0].fields.push({
        id: 'bankAccount',
        label: 'Bank Account Number',
        type: 'text',
        required: false
      });

      const result = await complianceValidator.validateCompliance(
        form,
        leg,
        schema,
        'validation'
      );

      // Should warn about data minimization
      expect(result.isCompliant).toBe(true); // Bank account is optional
      expect(result.checks.some(c => 
        c.category === 'privacy' && c.checkName.includes('Minimization')
      )).toBe(true);
    });

    it('should validate auto-fill sources are safe', () => {
      const schema = TestDataFactory.createSampleSchema();

      // Add fields with various auto-fill sources
      schema.sections[0].fields.forEach((field, index) => {
        switch (index) {
          case 0:
            field.autoFillSource = 'passport.surname'; // Safe
            break;
          case 1:
            field.autoFillSource = 'profile.firstName'; // Safe
            break;
          case 2:
            field.autoFillSource = 'passport.documentNumber'; // Safe
            break;
        }
      });

      schema.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.autoFillSource) {
            // Should not reference sensitive or external sources
            expect(field.autoFillSource).not.toMatch(/password|secret|token|key/i);
            expect(field.autoFillSource).not.toMatch(/http|external|remote/i);
            
            // Should only reference approved data sources
            expect(field.autoFillSource.startsWith('passport.') ||
                   field.autoFillSource.startsWith('profile.') ||
                   field.autoFillSource.startsWith('trip.') ||
                   field.autoFillSource.startsWith('device.')).toBe(true);
          }
        });
      });
    });
  });

  describe('Schema Performance Validation', () => {
    it('should validate schema size is reasonable', () => {
      const schema = TestDataFactory.createSampleSchema();
      const schemaJson = JSON.stringify(schema);

      // Schema should not be too large
      expect(schemaJson.length).toBeLessThan(50000); // 50KB limit
    });

    it('should validate field count is reasonable', () => {
      const schema = TestDataFactory.createSampleSchema();
      const totalFields = schema.sections.reduce(
        (total, section) => total + section.fields.length, 
        0
      );

      // Should not have excessive fields
      expect(totalFields).toBeLessThan(100);
      
      // Should have minimum required fields
      expect(totalFields).toBeGreaterThanOrEqual(3);
    });

    it('should validate nested complexity', () => {
      const schema = TestDataFactory.createSampleSchema();

      // Should not have too many nested sections
      expect(schema.sections.length).toBeLessThan(20);

      // Each section should not have too many fields
      schema.sections.forEach(section => {
        expect(section.fields.length).toBeLessThan(30);
      });
    });
  });
});