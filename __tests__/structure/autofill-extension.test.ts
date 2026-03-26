import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const IOS_DIR = path.join(ROOT, 'ios');
const EXT_DIR = path.join(IOS_DIR, 'BorderlyAutoFill');

describe('AutoFill Extension Structure', () => {
  describe('extension files exist', () => {
    it('has CredentialProviderViewController.swift', () => {
      expect(fs.existsSync(path.join(EXT_DIR, 'CredentialProviderViewController.swift'))).toBe(true);
    });

    it('has Info.plist', () => {
      expect(fs.existsSync(path.join(EXT_DIR, 'Info.plist'))).toBe(true);
    });

    it('has entitlements file', () => {
      expect(fs.existsSync(path.join(EXT_DIR, 'BorderlyAutoFill.entitlements'))).toBe(true);
    });
  });

  describe('extension entitlements', () => {
    let entitlements: string;

    beforeAll(() => {
      entitlements = fs.readFileSync(
        path.join(EXT_DIR, 'BorderlyAutoFill.entitlements'),
        'utf-8',
      );
    });

    it('includes shared Keychain access group', () => {
      expect(entitlements).toContain('com.borderly.shared-keychain');
    });

    it('includes App Group', () => {
      expect(entitlements).toContain('group.com.borderly.shared');
    });
  });

  describe('main app entitlements', () => {
    let debugEntitlements: string;
    let releaseEntitlements: string;

    beforeAll(() => {
      debugEntitlements = fs.readFileSync(
        path.join(IOS_DIR, 'Borderly', 'Borderly.entitlements'),
        'utf-8',
      );
      releaseEntitlements = fs.readFileSync(
        path.join(IOS_DIR, 'Borderly', 'Release.entitlements'),
        'utf-8',
      );
    });

    it('debug entitlements include shared Keychain access group', () => {
      expect(debugEntitlements).toContain('com.borderly.shared-keychain');
    });

    it('debug entitlements include App Group', () => {
      expect(debugEntitlements).toContain('group.com.borderly.shared');
    });

    it('release entitlements include shared Keychain access group', () => {
      expect(releaseEntitlements).toContain('com.borderly.shared-keychain');
    });

    it('release entitlements include App Group', () => {
      expect(releaseEntitlements).toContain('group.com.borderly.shared');
    });
  });

  describe('extension Info.plist', () => {
    let plist: string;

    beforeAll(() => {
      plist = fs.readFileSync(path.join(EXT_DIR, 'Info.plist'), 'utf-8');
    });

    it('declares credential-provider-ui extension point', () => {
      expect(plist).toContain(
        'com.apple.authentication-services-credential-provider-ui',
      );
    });

    it('references CredentialProviderViewController as principal class', () => {
      expect(plist).toContain('CredentialProviderViewController');
    });
  });

  describe('Xcode project includes extension target', () => {
    let pbxproj: string;

    beforeAll(() => {
      pbxproj = fs.readFileSync(
        path.join(IOS_DIR, 'Borderly.xcodeproj', 'project.pbxproj'),
        'utf-8',
      );
    });

    it('contains BorderlyAutoFill target', () => {
      expect(pbxproj).toContain('BorderlyAutoFill');
    });

    it('references the extension product type', () => {
      expect(pbxproj).toContain('com.apple.product-type.app-extension');
    });

    it('references AuthenticationServices framework', () => {
      expect(pbxproj).toContain('AuthenticationServices');
    });

    it('sets correct bundle identifier', () => {
      expect(pbxproj).toContain('com.borderly.app.AutoFill');
    });
  });

  describe('shared access config constants match entitlements', () => {
    it('TypeScript constants match iOS entitlements values', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const config = require('../../src/services/storage/keychain/sharedAccessConfig');

      const extEntitlements = fs.readFileSync(
        path.join(EXT_DIR, 'BorderlyAutoFill.entitlements'),
        'utf-8',
      );

      expect(extEntitlements).toContain(config.SHARED_KEYCHAIN_ACCESS_GROUP);
      expect(extEntitlements).toContain(config.APP_GROUP_IDENTIFIER);
    });
  });
});
