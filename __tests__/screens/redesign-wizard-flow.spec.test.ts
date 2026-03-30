import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: App navigation should be a 4-step wizard flow, not trip CRUD.
 *
 * The app is a form assistant, not a travel manager. The user's mental model
 * is "I'm going to these countries, fill my forms" — not "manage my trips."
 *
 * Flow: Countries → Travelers → Smart Form → Portal Links
 *
 * Confirm: Users complete forms faster with wizard flow
 * Invalidate: Users need trip history/management features
 */

test.skip('Tab 1 is Forms (not Trips)', () => {
  const mainTab = readFileSync(
    resolve(ROOT, 'src/app/navigation/MainTabNavigator.tsx'),
    'utf-8',
  );
  // First tab should be "Forms" not "Trips"
  expect(mainTab).toMatch(/name=["']Forms["']/);
  expect(mainTab).not.toMatch(/name=["']Trips["']/);
});

test.skip('wizard flow has 4 steps: countries, travelers, form, portals', () => {
  const formsStack = readFileSync(
    resolve(ROOT, 'src/app/navigation/FormsStack.tsx'),
    'utf-8',
  );
  expect(formsStack).toMatch(/name=["']SelectCountries["']/);
  expect(formsStack).toMatch(/name=["']SelectTravelers["']/);
  expect(formsStack).toMatch(/name=["']SmartForm["']/);
  expect(formsStack).toMatch(/name=["']PortalLinks["']/);
});
