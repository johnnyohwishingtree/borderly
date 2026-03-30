import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: updateTravelerFormData must strip PII before persisting to WatermelonDB.
 * Found by code-audit: tripTravelerSlice.ts persists raw form field values
 * (potentially passportNumber, dateOfBirth) directly to the database.
 *
 * Confirm: updateTravelerFormData calls stripPIIFromFormData before databaseService.updateTripLeg
 * Invalidate: The function only receives non-PII field IDs
 */
test('updateTravelerFormData strips PII before database persist', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/stores/tripTravelerSlice.ts'),
    'utf-8',
  );

  // Find the updateTravelerFormData function and check it strips PII
  const fnMatch = content.match(
    /updateTravelerFormData[\s\S]*?(?=\n    \w+:|$)/,
  );
  expect(fnMatch).toBeTruthy();
  expect(fnMatch![0]).toMatch(/stripPIIFromFormData/);
});
