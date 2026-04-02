// Spec: iOS Action Extension for Safari auto-fill.
//
// Borderly ships an Action Extension inside the app bundle that
// appears in Safari's share sheet. When tapped, it reads the user's
// profile from the shared Keychain access group and fills form fields
// on the current web page using the heuristic filler.
//
// Status: hypothesis
// Confirm: Extension appears in Safari share sheet and fills forms
// Invalidate: iOS doesn't allow form filling from Action Extensions

import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test.skip('Action Extension target directory exists with Swift/ObjC source', () => {
  // Must have a dedicated extension directory with native source files
  const extensionDir = resolve(ROOT, 'ios/BorderlyAction');
  expect(existsSync(extensionDir)).toBe(true);

  const files = readdirSync(extensionDir);
  const hasSource = files.some(f => f.endsWith('.swift') || f.endsWith('.m'));
  expect(hasSource).toBe(true);
});

test.skip('Action Extension has an Info.plist with NSExtension config', () => {
  const plist = resolve(ROOT, 'ios/BorderlyAction/Info.plist');
  expect(existsSync(plist)).toBe(true);

  const content = readFileSync(plist, 'utf-8');
  expect(content).toMatch(/NSExtension/);
  expect(content).toMatch(/com\.apple\.ui-services/);
});

test.skip('Action Extension is a separate target in Xcode project', () => {
  const pbxproj = readFileSync(
    resolve(ROOT, 'ios/Borderly.xcodeproj/project.pbxproj'),
    'utf-8',
  );
  expect(pbxproj).toMatch(/BorderlyAction/);
  expect(pbxproj).toMatch(/com\.apple\.product-type\.app-extension/);
});

test.skip('Action Extension JavaScript injects heuristic filler into web page', () => {
  // The extension must have a JS file that runs in the web page context
  const extensionDir = resolve(ROOT, 'ios/BorderlyAction');
  expect(existsSync(extensionDir)).toBe(true);

  const files = readdirSync(extensionDir);
  const hasJS = files.some(f => f.endsWith('.js'));
  expect(hasJS).toBe(true);
});
