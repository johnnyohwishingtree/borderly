import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: switchToTraveler must strip PII before persisting to WatermelonDB.
 * Found by code-audit: useLegForm.ts saves raw form data (with passportNumber,
 * dateOfBirth, etc.) when switching travelers, bypassing stripPIIFromFormData.
 *
 * Confirm: switchToTraveler calls stripPIIFromFormData before updateTripLeg
 * Invalidate: Form data in switchToTraveler never contains PII fields
 */
test.skip('switchToTraveler strips PII before persisting form data', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/useLegForm.ts'),
    'utf-8',
  );

  // Find the switchToTraveler function and check it calls stripPIIFromFormData
  const switchFnMatch = content.match(
    /switchToTraveler[\s\S]*?(?=\n  const \w|$)/,
  );
  expect(switchFnMatch).toBeTruthy();
  expect(switchFnMatch![0]).toMatch(/stripPIIFromFormData/);
});
