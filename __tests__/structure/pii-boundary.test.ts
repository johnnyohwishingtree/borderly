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
    // PII stripping may live in useLegForm.ts directly or in its extracted helpers
    const mainContent = readFileSync(
      resolve(ROOT, 'src/hooks/useLegForm.ts'),
      'utf-8',
    );
    const helpersContent = readFileSync(
      resolve(ROOT, 'src/hooks/useLegFormHelpers.ts'),
      'utf-8',
    );
    const combined = mainContent + '\n' + helpersContent;

    // stripPIIFromFormData must be used somewhere in the useLegForm module
    const hasStrip = combined.includes('stripPIIFromFormData');
    const importsStrip = combined.includes("from '../utils/piiSanitizer'") ||
                          combined.includes("from '@/utils/piiSanitizer'");

    expect(hasStrip).toBe(true);
    expect(importsStrip).toBe(true);

    // Verify no raw getFormData() is passed directly to updateTripLeg
    // The pattern "formDataToSave = getFormData()" without stripping is the violation
    const lines = combined.split('\n');
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
