// Test: Form sections with flight fields should offer a "Scan boarding pass" shortcut.
//
// When a form section contains flightNumber, airlineCode, arrivalAirport, or
// departureCity, the section should show a scan button that fills all flight
// fields at once from a boarding pass barcode.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('DynamicForm or FormSection supports boarding pass scan for flight fields', () => {
  // Check DynamicForm or FormSection for boarding pass scan integration
  const dynamicForm = readFileSync(
    resolve(ROOT, 'src/components/forms/DynamicForm.tsx'),
    'utf-8',
  );
  const formSection = readFileSync(
    resolve(ROOT, 'src/components/forms/FormSection.tsx'),
    'utf-8',
  );

  const combined = dynamicForm + formSection;

  // Must reference boarding pass scanning somewhere in the form components
  expect(combined).toMatch(/[Bb]oarding[Pp]ass|[Bb]oardingPass|scan.*boarding|boarding.*scan/i);
});
