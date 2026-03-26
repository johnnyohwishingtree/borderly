import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const EXT_DIR = path.join(ROOT, 'ios', 'BorderlyAutoFill');
const SWIFT_FILE = path.join(EXT_DIR, 'CredentialProviderViewController.swift');

describe('AutoFill Extension UI', () => {
  let swiftSource: string;

  beforeAll(() => {
    swiftSource = fs.readFileSync(SWIFT_FILE, 'utf-8');
  });

  describe('profile display', () => {
    it('shows profile name in header', () => {
      expect(swiftSource).toContain('profileNameLabel');
    });

    it('shows profile initials for identity confirmation', () => {
      expect(swiftSource).toContain('profileInitialsLabel');
    });

    it('shows subtitle with usage instructions', () => {
      expect(swiftSource).toContain('Tap a field to fill');
    });
  });

  describe('field list', () => {
    it('uses UITableView to display fields', () => {
      expect(swiftSource).toContain('UITableView');
      expect(swiftSource).toContain('UITableViewDataSource');
      expect(swiftSource).toContain('UITableViewDelegate');
    });

    it('registers a FieldCell', () => {
      expect(swiftSource).toContain('FieldCell');
    });

    it('displays field label and value', () => {
      expect(swiftSource).toContain('fieldLabel');
      expect(swiftSource).toContain('valueLabel');
    });

    it('maps profile keys to display labels', () => {
      const expectedLabels = [
        'Passport number',
        'Surname',
        'Given name',
        'Date of birth',
        'Nationality',
        'Email',
        'Phone number',
      ];
      for (const label of expectedLabels) {
        expect(swiftSource).toContain(label);
      }
    });
  });

  describe('Fill All button', () => {
    it('has a Fill All button', () => {
      expect(swiftSource).toContain('fillAllButton');
      expect(swiftSource).toContain('Fill all fields');
    });

    it('copies all field values to clipboard on Fill All', () => {
      expect(swiftSource).toContain('UIPasteboard.general.string');
    });
  });

  describe('security', () => {
    it('clears clipboard after 60 seconds', () => {
      // Security boundary rule: clear copied passport data after 60 seconds
      expect(swiftSource).toContain('asyncAfter(deadline: .now() + 60)');
    });

    it('loads profile from shared Keychain', () => {
      expect(swiftSource).toContain('loadProfileFromSharedKeychain');
      expect(swiftSource).toContain('kSecAttrAccessGroup');
      expect(swiftSource).toContain('com.borderly.shared-keychain');
    });
  });

  describe('empty state', () => {
    it('shows empty state when no profile exists', () => {
      expect(swiftSource).toContain('emptyStateLabel');
      expect(swiftSource).toContain('No profile found');
    });
  });

  describe('cancel action', () => {
    it('has a cancel button', () => {
      expect(swiftSource).toContain('cancelButton');
      expect(swiftSource).toContain('Cancel');
    });
  });

  describe('visual style', () => {
    it('uses Borderly blue color tokens', () => {
      // blue-500 = rgb(59, 130, 246)
      expect(swiftSource).toContain('59/255');
      expect(swiftSource).toContain('130/255');
      expect(swiftSource).toContain('246/255');
    });

    it('uses system colors for adaptability', () => {
      expect(swiftSource).toContain('.systemBackground');
      expect(swiftSource).toContain('.label');
      expect(swiftSource).toContain('.secondaryLabel');
    });
  });
});
