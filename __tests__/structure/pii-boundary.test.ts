/**
 * Structural test: PII boundary enforcement.
 *
 * Verifies that code paths saving form data to WatermelonDB
 * use stripPIIFromFormData() to remove passport/personal data.
 *
 * See: .knowledge/concepts/security-boundary.md
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

describe('PII boundary', () => {
  it('useLegForm strips PII before saving to database', () => {
    const content = readFileSync(
      resolve(ROOT, 'src/hooks/useLegForm.ts'),
      'utf-8',
    );

    // Every call to updateTripLeg with formData must be preceded by stripPIIFromFormData
    const hasStrip = content.includes('stripPIIFromFormData');
    const importsStrip = content.includes("from '../utils/piiSanitizer'") ||
                          content.includes("from '@/utils/piiSanitizer'");

    expect(hasStrip).toBe(true);
    expect(importsStrip).toBe(true);

    // Verify no raw getFormData() is passed directly to updateTripLeg
    // The pattern "formDataToSave = getFormData()" without stripping is the violation
    const lines = content.split('\n');
    const violations: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('formDataToSave = getFormData()') && !line.includes('strip')) {
        violations.push(`Line ${i + 1}: raw getFormData() assigned to formDataToSave without stripping`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('stripPIIFromFormData removes all sensitive fields', () => {
    // Import and test the actual function
    const { stripPIIFromFormData } = require('../../src/utils/piiSanitizer');

    const formData = {
      passportNumber: 'AB123456',
      dateOfBirth: '1990-01-01',
      passportExpiry: '2030-01-01',
      surname: 'Smith',
      givenNames: 'John',
      occupation: 'student',
      purposeOfVisit: 'tourism',
      flightNumber: 'NH101',
    };

    const result = stripPIIFromFormData(formData);

    // PII fields must be stripped
    expect(result.passportNumber).toBeUndefined();
    expect(result.dateOfBirth).toBeUndefined();
    expect(result.passportExpiry).toBeUndefined();
    expect(result.surname).toBeUndefined();
    expect(result.givenNames).toBeUndefined();

    // Non-PII fields must be preserved
    expect(result.occupation).toBe('student');
    expect(result.purposeOfVisit).toBe('tourism');
    expect(result.flightNumber).toBe('NH101');
  });
});
