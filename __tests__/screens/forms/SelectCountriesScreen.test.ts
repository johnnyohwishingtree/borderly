// Tests for SelectCountriesScreen — boarding pass scan integration.
//
// The "Scan boarding pass" button opens a BoardingPassScanner modal.
// On scan success, the destination country is auto-selected AND the
// flight data (flight number, airline, airports, date) is stored and
// passed through the wizard (SelectTravelers → SmartForm → useSmartForm)
// so the form engine can pre-fill form fields.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

const selectCountriesContent = readFileSync(
  resolve(ROOT, 'src/screens/forms/SelectCountriesScreen/SelectCountriesScreen.tsx'),
  'utf-8',
);

test('Scan boarding pass button has a real onPress handler (not a TODO)', () => {
  const start = selectCountriesContent.indexOf('Boarding pass scan');
  const end = selectCountriesContent.indexOf('scanBoardingPassButton') + 100;
  const buttonArea = selectCountriesContent.slice(Math.max(0, start), end);

  expect(buttonArea).not.toMatch(/onPress=\{\(\)\s*=>\s*\{/);
  expect(buttonArea).not.toMatch(/TODO/i);
});

test('scan success handler stores boarding pass flight data (not just country)', () => {
  // handleScanSuccess must extract flight fields from ParsedBoardingPass
  expect(selectCountriesContent).toMatch(/result\.flightNumber/);
  expect(selectCountriesContent).toMatch(/result\.airlineCode/);
  expect(selectCountriesContent).toMatch(/result\.arrivalAirport/);
  expect(selectCountriesContent).toMatch(/result\.flightDate/);
});

test('boarding pass data is passed to SelectTravelers navigation', () => {
  // navigate('SelectTravelers', { ..., boardingPassData })
  expect(selectCountriesContent).toMatch(/navigate\('SelectTravelers'.*boardingPassData/s);
});

test('SelectTravelers passes boarding pass data through to SmartForm', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/forms/SelectTravelersScreen/SelectTravelersScreen.tsx'),
    'utf-8',
  );
  // Must destructure boardingPassData from route params
  expect(content).toMatch(/boardingPassData/);
  // Must pass it to SmartForm navigation
  expect(content).toMatch(/navigate\('SmartForm'.*boardingPassData/s);
});

test('useSmartForm uses boarding pass data to populate trip leg fields', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/useSmartForm.ts'),
    'utf-8',
  );
  // Must accept boardingPassData option
  expect(content).toMatch(/boardingPassData/);
  // Must use it to set leg fields
  expect(content).toMatch(/bpData\?\.flightNumber/);
  expect(content).toMatch(/bpData\?\.airlineCode/);
  expect(content).toMatch(/bpData\?\.arrivalAirport/);
});
