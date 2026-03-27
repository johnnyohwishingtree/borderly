/**
 * Tests for keychainValidator service.
 *
 * The validator checks Keychain health, biometric availability, accessibility
 * compliance, encryption key strength, and profile storage security.
 */

import * as Keychain from 'react-native-keychain';
import { keychainValidator } from '../../../src/services/security/keychainValidator';
import { keychainService } from '../../../src/services/storage/keychain/keychainService';

// Mock keychainService — import directly, not from barrel
jest.mock('../../../src/services/storage/keychain/keychainService', () => ({
  keychainService: {
    isAvailable: jest.fn(),
    getEncryptionKey: jest.fn(),
    getProfile: jest.fn(),
  },
}));

// react-native-keychain is globally mocked in jest.setup.js.
// We override specific methods per test.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Configure all mocks for a fully healthy keychain state. */
function setupHealthyKeychain() {
  jest.mocked(Keychain.getSupportedBiometryType).mockResolvedValue(Keychain.BIOMETRY_TYPE.FACE_ID);
  jest.mocked(Keychain.getSecurityLevel).mockResolvedValue(
    Keychain.SECURITY_LEVEL.SECURE_HARDWARE as never,
  );
  jest.mocked(Keychain.getInternetCredentials).mockResolvedValue({
    username: 'test',
    password: 'test',
    service: 'borderly',
    storage: 'keychain' as never,
  } as never);
  jest.mocked(Keychain.setInternetCredentials).mockResolvedValue(true as never);
  jest.mocked(Keychain.resetInternetCredentials).mockResolvedValue(true as never);
  jest.mocked(keychainService.isAvailable).mockResolvedValue(true);
  jest.mocked(keychainService.getEncryptionKey).mockResolvedValue(
    'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', // Valid 256-bit key (64 hex chars)
  );
  jest.mocked(keychainService.getProfile).mockResolvedValue(null);
}

// ---------------------------------------------------------------------------
// validateKeychainSecurity — full validation
// ---------------------------------------------------------------------------

describe('keychainValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHealthyKeychain();
  });

  describe('validateKeychainSecurity', () => {
    it('returns isValid true with no errors for a healthy keychain', async () => {
      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.securityLevel).toBe('excellent');
    });

    it('includes biometricStatus in the result', async () => {
      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.biometricStatus.available).toBe(true);
      expect(result.biometricStatus.type).toBe(Keychain.BIOMETRY_TYPE.FACE_ID);
      expect(result.biometricStatus.accessControlValid).toBe(true);
    });

    it('includes accessibilityCompliance in the result', async () => {
      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.accessibilityCompliance.correctLevel).toBe(true);
      expect(result.accessibilityCompliance.backupExcluded).toBe(true);
      expect(result.accessibilityCompliance.deviceOnly).toBe(true);
      expect(result.accessibilityCompliance.biometricRequired).toBe(true);
    });

    // -----------------------------------------------------------------------
    // Biometric validation
    // -----------------------------------------------------------------------

    it('adds error when biometric is not available', async () => {
      jest.mocked(Keychain.getSupportedBiometryType).mockResolvedValue(null);

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.biometricStatus.available).toBe(false);
      const bioError = result.errors.find(e => e.code === 'BIOMETRIC_UNAVAILABLE');
      expect(bioError).not.toBeUndefined();
      expect(bioError!.severity).toBe('high');
    });

    it('adds warning when biometric available but not enrolled', async () => {
      jest.mocked(Keychain.getSecurityLevel).mockRejectedValue(new Error('not enrolled'));
      // Fallback check: getSupportedBiometryType is already 'FaceID' → enrolled=true
      // To simulate not-enrolled, we need getSupportedBiometryType to return null on fallback
      jest.mocked(Keychain.getSupportedBiometryType)
        .mockResolvedValueOnce(Keychain.BIOMETRY_TYPE.FACE_ID) // First call: available check
        .mockResolvedValueOnce(null); // Second call: enrollment fallback

      jest.mocked(Keychain.getSecurityLevel).mockRejectedValue(new Error('fail'));

      const result = await keychainValidator.validateKeychainSecurity();

      const enrollWarning = result.warnings.find(w => w.code === 'BIOMETRIC_NOT_ENROLLED');
      expect(enrollWarning).not.toBeUndefined();
    });

    it('adds error when biometric validation throws', async () => {
      jest.mocked(Keychain.getSupportedBiometryType).mockRejectedValue(
        new Error('Hardware failure'),
      );

      const result = await keychainValidator.validateKeychainSecurity();

      const validationError = result.errors.find(e => e.code === 'BIOMETRIC_VALIDATION_FAILED');
      expect(validationError).not.toBeUndefined();
      expect(validationError!.severity).toBe('medium');
      expect(result.biometricStatus.available).toBe(false);
    });

    // -----------------------------------------------------------------------
    // Keychain availability
    // -----------------------------------------------------------------------

    it('adds critical error when keychain is unavailable', async () => {
      jest.mocked(keychainService.isAvailable).mockResolvedValue(false);

      const result = await keychainValidator.validateKeychainSecurity();

      const err = result.errors.find(e => e.code === 'KEYCHAIN_UNAVAILABLE');
      expect(err).not.toBeUndefined();
      expect(err!.severity).toBe('critical');
      expect(err!.affectsAppStore).toBe(true);
    });

    it('adds error when keychain availability check throws', async () => {
      jest.mocked(keychainService.isAvailable).mockRejectedValue(new Error('timeout'));

      const result = await keychainValidator.validateKeychainSecurity();

      const err = result.errors.find(e => e.code === 'KEYCHAIN_AVAILABILITY_CHECK_FAILED');
      expect(err).not.toBeUndefined();
      expect(err!.severity).toBe('high');
    });

    // -----------------------------------------------------------------------
    // Encryption key validation
    // -----------------------------------------------------------------------

    it('adds warning when encryption key is missing', async () => {
      jest.mocked(keychainService.getEncryptionKey).mockResolvedValue(null);

      const result = await keychainValidator.validateKeychainSecurity();

      const warn = result.warnings.find(w => w.code === 'ENCRYPTION_KEY_MISSING');
      expect(warn).not.toBeUndefined();
    });

    it('adds error for short encryption key', async () => {
      jest.mocked(keychainService.getEncryptionKey).mockResolvedValue('abc123');

      const result = await keychainValidator.validateKeychainSecurity();

      const err = result.errors.find(e => e.code === 'WEAK_ENCRYPTION_KEY');
      expect(err).not.toBeUndefined();
      expect(err!.message).toContain('6 characters');
    });

    it('adds error for low-entropy encryption key (all same char)', async () => {
      jest.mocked(keychainService.getEncryptionKey).mockResolvedValue('0'.repeat(64));

      const result = await keychainValidator.validateKeychainSecurity();

      const err = result.errors.find(e => e.code === 'LOW_ENTROPY_KEY');
      expect(err).not.toBeUndefined();
      expect(err!.severity).toBe('critical');
    });

    it('adds error for low-entropy encryption key (sequential pattern)', async () => {
      const key = '01234567' + 'x'.repeat(56);
      jest.mocked(keychainService.getEncryptionKey).mockResolvedValue(key);

      const result = await keychainValidator.validateKeychainSecurity();

      const err = result.errors.find(e => e.code === 'LOW_ENTROPY_KEY');
      expect(err).not.toBeUndefined();
    });

    it('adds error for key starting with "test"', async () => {
      const key = 'test' + 'a'.repeat(60);
      jest.mocked(keychainService.getEncryptionKey).mockResolvedValue(key);

      const result = await keychainValidator.validateKeychainSecurity();

      const err = result.errors.find(e => e.code === 'LOW_ENTROPY_KEY');
      expect(err).not.toBeUndefined();
    });

    it('adds error when encryption key retrieval throws', async () => {
      jest.mocked(keychainService.getEncryptionKey).mockRejectedValue(new Error('denied'));

      const result = await keychainValidator.validateKeychainSecurity();

      const err = result.errors.find(e => e.code === 'ENCRYPTION_KEY_VALIDATION_ERROR');
      expect(err).not.toBeUndefined();
    });

    // -----------------------------------------------------------------------
    // Profile storage validation
    // -----------------------------------------------------------------------

    it('adds warning when no profile is stored', async () => {
      jest.mocked(keychainService.getProfile).mockResolvedValue(null);

      const result = await keychainValidator.validateKeychainSecurity();

      const warn = result.warnings.find(w => w.code === 'NO_PROFILE_STORED');
      expect(warn).not.toBeUndefined();
    });

    it('adds error when profile contains test data', async () => {
      jest.mocked(keychainService.getProfile).mockResolvedValue({
        passportNumber: '123456789',
        surname: 'DOE',
        givenNames: 'John',
      } as never);

      const result = await keychainValidator.validateKeychainSecurity();

      const err = result.errors.find(e => e.code === 'TEST_DATA_IN_PRODUCTION');
      expect(err).not.toBeUndefined();
      expect(err!.severity).toBe('medium');
    });

    it('does not flag real profile data as test data', async () => {
      jest.mocked(keychainService.getProfile).mockResolvedValue({
        passportNumber: 'AB7654321',
        surname: 'TANAKA',
        givenNames: 'Yuki',
        dateOfBirth: '1985-03-15',
      } as never);

      const result = await keychainValidator.validateKeychainSecurity();

      const err = result.errors.find(e => e.code === 'TEST_DATA_IN_PRODUCTION');
      expect(err).toBeUndefined();
    });

    it('adds error when profile retrieval throws', async () => {
      jest.mocked(keychainService.getProfile).mockRejectedValue(new Error('corrupt'));

      const result = await keychainValidator.validateKeychainSecurity();

      const err = result.errors.find(e => e.code === 'PROFILE_VALIDATION_ERROR');
      expect(err).not.toBeUndefined();
    });

    // -----------------------------------------------------------------------
    // Accessibility settings
    // -----------------------------------------------------------------------

    it('adds error when keychain store fails during accessibility test', async () => {
      jest.mocked(Keychain.setInternetCredentials).mockRejectedValue(
        new Error('access denied'),
      );

      const result = await keychainValidator.validateKeychainSecurity();

      const err = result.errors.find(e => e.code === 'ACCESSIBILITY_CONFIGURATION_ERROR');
      expect(err).not.toBeUndefined();
      expect(err!.severity).toBe('critical');
      expect(result.accessibilityCompliance.correctLevel).toBe(false);
    });

    it('adds error when retrieved credentials are falsy during accessibility test', async () => {
      jest.mocked(Keychain.getInternetCredentials).mockResolvedValue(false as never);

      const result = await keychainValidator.validateKeychainSecurity();

      const err = result.errors.find(e => e.code === 'ACCESSIBILITY_TEST_FAILED');
      expect(err).not.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // calculateSecurityLevel (tested via validateKeychainSecurity output)
  // -------------------------------------------------------------------------

  describe('security level calculation', () => {
    it('returns "poor" when critical errors exist', async () => {
      jest.mocked(keychainService.isAvailable).mockResolvedValue(false); // critical error

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.securityLevel).toBe('poor');
    });

    it('returns "fair" when high-severity errors exist', async () => {
      jest.mocked(keychainService.getEncryptionKey).mockResolvedValue('short'); // high error

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.securityLevel).toBe('fair');
    });

    it('returns "excellent" when no errors and few warnings', async () => {
      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.securityLevel).toBe('excellent');
    });

    it('returns "good" when medium errors exist', async () => {
      // Profile with test data → medium error
      jest.mocked(keychainService.getProfile).mockResolvedValue({
        passportNumber: '123456789',
        surname: 'DOE',
      } as never);

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.securityLevel).toBe('good');
    });
  });

  // -------------------------------------------------------------------------
  // validateForAppStoreSubmission
  // -------------------------------------------------------------------------

  describe('validateForAppStoreSubmission', () => {
    it('returns ready=true when no app-store-affecting errors', async () => {
      const result = await keychainValidator.validateForAppStoreSubmission();

      expect(result.ready).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('returns ready=false with blockers when keychain unavailable', async () => {
      jest.mocked(keychainService.isAvailable).mockResolvedValue(false);

      const result = await keychainValidator.validateForAppStoreSubmission();

      expect(result.ready).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.blockers[0].affectsAppStore).toBe(true);
    });

    it('includes warnings from validation', async () => {
      const result = await keychainValidator.validateForAppStoreSubmission();

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // performQuickSecurityCheck
  // -------------------------------------------------------------------------

  describe('performQuickSecurityCheck', () => {
    it('returns true when all checks pass', async () => {
      const result = await keychainValidator.performQuickSecurityCheck();
      expect(result).toBe(true);
    });

    it('returns false when keychain is unavailable', async () => {
      jest.mocked(keychainService.isAvailable).mockResolvedValue(false);

      const result = await keychainValidator.performQuickSecurityCheck();
      expect(result).toBe(false);
    });

    it('returns false when encryption key is missing', async () => {
      jest.mocked(keychainService.getEncryptionKey).mockResolvedValue(null);

      const result = await keychainValidator.performQuickSecurityCheck();
      expect(result).toBe(false);
    });

    it('returns false when encryption key is too short', async () => {
      jest.mocked(keychainService.getEncryptionKey).mockResolvedValue('abc');

      const result = await keychainValidator.performQuickSecurityCheck();
      expect(result).toBe(false);
    });

    it('returns false when biometry is not supported', async () => {
      jest.mocked(Keychain.getSupportedBiometryType).mockResolvedValue(null);

      const result = await keychainValidator.performQuickSecurityCheck();
      expect(result).toBe(false);
    });

    it('returns false when any check throws', async () => {
      jest.mocked(keychainService.isAvailable).mockRejectedValue(new Error('fail'));

      const result = await keychainValidator.performQuickSecurityCheck();
      expect(result).toBe(false);
    });
  });
});
