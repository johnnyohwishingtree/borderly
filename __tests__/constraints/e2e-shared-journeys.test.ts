import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: E2E tests must use shared journey definitions.
 *
 * Both Playwright (e2e/tests/) and mobile (e2e/mobile/) E2E tests must
 * import journey steps from e2e/shared/journeys.ts instead of writing
 * platform-specific navigation steps directly. This prevents drift
 * between web and mobile E2E — change the journey once, both update.
 *
 * Scope: e2e/tests/*.spec.ts, e2e/mobile/*.test.ts
 * Rules:
 *   - DENY: tapById/fillById/assertVisible called directly on driver actions
 *     that duplicate a journey step (onboarding, country selection, form fill)
 *   - REQUIRE: E2E test files that exercise the wizard flow import from shared/journeys
 * Exceptions:
 *   - Platform-specific setup (app launch, dialog dismiss) can be inline
 *   - Tests for non-journey screens (settings, profile) don't need journeys
 * Anti-patterns:
 *   - Copy-pasting journey steps between Playwright and mobile tests
 *   - Writing tapById('select-countries-next-button') directly instead of using selectCountries()
 */

test('Playwright E2E tests import from shared journeys', () => {
  const testFiles = readdirSync(resolve(ROOT, 'e2e/tests'))
    .filter(f => f.endsWith('.spec.ts'))
    .map(f => `e2e/tests/${f}`);
  const wizardTests = testFiles.filter(f => {
    const content = readFileSync(resolve(ROOT, f), 'utf-8');
    // Tests that interact with wizard screens (countries, form, portal)
    return content.includes('select-countries') ||
           content.includes('smart-form') ||
           content.includes('portal-links') ||
           content.includes('launch-portal');
  });

  for (const file of wizardTests) {
    const content = readFileSync(resolve(ROOT, file), 'utf-8');
    expect(content).toMatch(
      /from ['"]\.\.\/shared\/(journeys|index|playwrightDriver)['"]/,
    );
  }
});

test('mobile E2E tests import from shared journeys', () => {
  const testFiles = readdirSync(resolve(ROOT, 'e2e/mobile'))
    .filter(f => f.endsWith('.test.ts'))
    .map(f => `e2e/mobile/${f}`);
  const wizardTests = testFiles.filter(f => {
    const content = readFileSync(resolve(ROOT, f), 'utf-8');
    return content.includes('select-countries') ||
           content.includes('smart-form') ||
           content.includes('portal-links') ||
           content.includes('launch-portal') ||
           content.includes('fullWizardJourney');
  });

  for (const file of wizardTests) {
    const content = readFileSync(resolve(ROOT, file), 'utf-8');
    expect(content).toMatch(
      /from ['"]\.\.\/shared\/(journeys|index|mobileDriver)['"]/,
    );
  }
});

test('shared journeys file exists and exports journey functions', () => {
  const journeys = readFileSync(resolve(ROOT, 'e2e/shared/journeys.ts'), 'utf-8');
  // Core journey steps must be exported
  expect(journeys).toMatch(/export async function onboardWithDemoPassport/);
  expect(journeys).toMatch(/export async function selectCountries/);
  expect(journeys).toMatch(/export async function fillSmartForm/);
  expect(journeys).toMatch(/export async function launchPortal/);
});

test('E2EDriver interface exists with required methods', () => {
  const driver = readFileSync(resolve(ROOT, 'e2e/shared/e2eDriver.ts'), 'utf-8');
  expect(driver).toMatch(/tapById.*testID.*string/);
  expect(driver).toMatch(/fillById.*testID.*string/);
  expect(driver).toMatch(/assertVisible.*text.*string/);
  expect(driver).toMatch(/screenshot.*name.*string/);
});
