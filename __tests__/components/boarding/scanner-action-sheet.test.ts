// Test: BoardingPassScanner must show an action sheet first, not jump to camera.
//
// The scanner should present three options:
//   1. Camera scan (opens real camera)
//   2. Import from photo (opens photo picker)
//   3. Cancel
//
// No demo scan functionality — demo data should be replaced by test photos.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('BoardingPassScanner does not contain demo scan functionality', () => {
  const scanner = readFileSync(
    resolve(ROOT, 'src/components/boarding/BoardingPassScanner.tsx'),
    'utf-8',
  );
  const hook = readFileSync(
    resolve(ROOT, 'src/hooks/useBoardingPassScanner.ts'),
    'utf-8',
  );

  // No demo references
  expect(scanner).not.toMatch(/[Dd]emo/);
  expect(hook).not.toMatch(/DEMO_BCBP/);
  expect(hook).not.toMatch(/startDemo/);
});

test('BoardingPassScanner shows action sheet with Camera, Import, Cancel', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/boarding/BoardingPassScanner.tsx'),
    'utf-8',
  );

  // Must have the three action options
  expect(content).toMatch(/Camera/i);
  expect(content).toMatch(/Import.*[Pp]hoto|[Pp]hoto.*[Ll]ibrary/i);
  expect(content).toMatch(/Cancel/i);
});
