/**
 * Constraint: PII Boundary
 *
 * Decision: All PII stays on-device. No server stores passport data. The app works
 *   fully offline except for portal submission (user-initiated on government website).
 *   Cross-device sync of PII is explicitly out of scope.
 * Rejected: Cloud storage of PII — creates breach liability under GDPR/CCPA, compliance
 *   overhead, and user trust concerns. Cross-device sync — requires server-side PII,
 *   contradicts local-first principle.
 *
 * Scope: src/services/, src/hooks/, src/utils/, src/schemas/
 *
 * DENY:    passport number, DOB, passport expiry persisted to WatermelonDB
 * DENY:    surname, givenNames persisted to WatermelonDB
 * REQUIRE: stripPIIFromFormData() called before any form data save to DB
 * DENY:    PII in console.log — even in development
 * DENY:    PII sent to analytics, crash reporters, or external APIs
 * REQUIRE: clipboard auto-clear after 60 seconds when passport data is copied
 * REQUIRE: app lock after 5 minutes of inactivity
 * REQUIRE: each family member has isolated Keychain entries + encryption keys
 * REQUIRE: family member deletion securely removes all associated data
 *
 * Exceptions:
 * - PII is loaded into memory for form generation (auto-fill) — expected
 * - PII appears in the UI for display — expected
 * - Shared Keychain access group for AutoFill extension — same device, same user
 *
 * Anti-patterns:
 * - `updateTripLeg(leg.id, { formData: getFormData() })` — raw form data contains PII
 * - `console.log(profile)` — logs passport data
 * - Crash reporter capturing form field values
 * - Shared database between family members
 *
 * Why: GDPR requires data minimization (.context/external/regulatory/gdpr-data-minimization.md)
 *      PII needs hardware-backed encryption (.context/external/regulatory/pii-has-special-handling-requirements.md)
 *      Clipboard is readable by other apps (.context/external/regulatory/clipboard-is-readable-by-other-apps.md)
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
