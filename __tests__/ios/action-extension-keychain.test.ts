// Test: Action Extension Keychain query matches how the app stores profiles.
//
// react-native-keychain stores profiles with:
//   kSecAttrService = "borderly_profile_<profileId>"
//   kSecAttrAccount = "borderly_user"
//   kSecValueData   = JSON string of TravelerProfile
//
// The extension must query using these exact attributes.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test('Extension queries Keychain with correct account name "borderly_user"', () => {
  const swift = readFileSync(
    resolve(ROOT, 'ios/BorderlyAction/ActionViewController.swift'),
    'utf-8',
  );
  expect(swift).toMatch(/borderly_user/);
});

test('Extension looks for services starting with "borderly_profile_"', () => {
  const swift = readFileSync(
    resolve(ROOT, 'ios/BorderlyAction/ActionViewController.swift'),
    'utf-8',
  );
  expect(swift).toMatch(/borderly_profile_/);
});

test('App stores profiles with service "borderly_profile_<id>" and account "borderly_user"', () => {
  const multiProfile = readFileSync(
    resolve(ROOT, 'src/services/storage/keychain/keychainMultiProfile.ts'),
    'utf-8',
  );
  // Verify the service prefix
  expect(multiProfile).toMatch(/PROFILE_KEY_PREFIX.*=.*['"]borderly_profile_['"]/);
  // Verify the account/username
  expect(multiProfile).toMatch(/borderly_user/);
});

test('Extension parses password field as JSON string (not raw data)', () => {
  const swift = readFileSync(
    resolve(ROOT, 'ios/BorderlyAction/ActionViewController.swift'),
    'utf-8',
  );
  // Must convert Data → String → JSON (react-native-keychain stores as UTF-8 string)
  expect(swift).toMatch(/String\(data:.*encoding:.*utf8\)/);
  expect(swift).toMatch(/JSONSerialization/);
});
