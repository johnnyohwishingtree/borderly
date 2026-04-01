/**
 * Constraint: No demo/mock data in production source code.
 *
 * Scope: src/ — all source files (excluding test utilities)
 *
 * Rules:
 *   - DENY: "Demo Scan", "Try Demo", DEMO_BCBP, DEMO_MRZ, DEMO_PROFILES,
 *     demo personas (adult/spouse/child), demo timer refs
 *   - DENY: 'demo' as a camera status value
 *   - Scanner components must show Camera / Import from Photo / Cancel
 *     instead of demo scan buttons
 *
 * Why: Demo data masks real bugs and creates confusing UX. Testing should
 * use real photos (import from photo library) not hardcoded fake data.
 *
 * Exceptions:
 *   - src/utils/testData.ts — test utility, not user-facing
 *   - __tests__/ — test files can have mock data
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');


test('no demo scan buttons or demo data in UI components', () => {
  const uiFiles = [
    'src/components/boarding/BoardingPassScanner.tsx',
    'src/components/passport/MRZScanner.tsx',
    'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx',
  ].map(f => resolve(ROOT, f));

  const violations: string[] = [];

  for (const file of uiFiles) {
    const content = readFileSync(file, 'utf-8');
    const name = file.replace(ROOT + '/', '');

    if (content.match(/[Tt]ry [Dd]emo|[Dd]emo: [Aa]dult|[Dd]emo: [Ss]pouse|[Dd]emo: [Cc]hild|[Dd]emo [Ss]can/)) {
      violations.push(`${name}: contains demo scan UI`);
    }
  }

  expect(violations).toEqual([]);
});

test('no DEMO constants in hooks', () => {
  const hookFiles = [
    'src/hooks/useBoardingPassScanner.ts',
    'src/hooks/useMRZScanner.ts',
    'src/hooks/usePassportScan.ts',
  ].map(f => resolve(ROOT, f));

  const violations: string[] = [];

  for (const file of hookFiles) {
    const content = readFileSync(file, 'utf-8');
    const name = file.replace(ROOT + '/', '');

    if (content.match(/DEMO_BCBP|DEMO_MRZ|DEMO_PROFILE|startDemo|demoTimer/)) {
      violations.push(`${name}: contains demo data or demo scan logic`);
    }
  }

  expect(violations).toEqual([]);
});

test('camera status types do not include demo', () => {
  const typeFiles = [
    'src/components/boarding/boardingPassScannerTypes.ts',
    'src/components/passport/mrzScannerTypes.ts',
  ].map(f => resolve(ROOT, f));

  for (const file of typeFiles) {
    const content = readFileSync(file, 'utf-8');
    expect(content).not.toMatch(/'demo'/);
  }
});

test('all scanners offer Camera, Import from Photo, and Cancel', () => {
  const scannerFiles = [
    'src/components/boarding/BoardingPassScanner.tsx',
    'src/components/passport/MRZScanner.tsx',
  ].map(f => resolve(ROOT, f));

  for (const file of scannerFiles) {
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/Camera/i);
    expect(content).toMatch(/Import.*[Pp]hoto|[Pp]hoto/i);
    expect(content).toMatch(/Cancel/i);
  }
});
