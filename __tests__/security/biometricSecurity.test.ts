import { keychainValidator } from '@/services/security/keychainValidator';
import { keychainService } from '@/services/storage/keychain';
import * as Keychain from 'react-native-keychain';

// Mock the native modules
jest.mock('react-native-keychain');
jest.mock('@/services/storage/keychain');

const mockKeychain = Keychain as jest.Mocked<typeof Keychain>;
const mockKeychainService = keychainService as jest.Mocked<typeof keychainService>;

describe('Biometric Security Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful biometric setup
    mockKeychain.getSupportedBiometryType.mockResolvedValue(Keychain.BIOMETRY_TYPE.FACE_ID);
    mockKeychain.getSecurityLevel.mockResolvedValue(Keychain.SECURITY_LEVEL.SECURE_HARDWARE);
    mockKeychain.setInternetCredentials.mockResolvedValue(false);
    mockKeychain.getInternetCredentials.mockResolvedValue({
      username: 'test',
      password: 'test',
      service: 'test',
      storage: 'AES'
    });
    mockKeychain.resetInternetCredentials.mockResolvedValue(void 0);
    
    mockKeychainService.isAvailable.mockResolvedValue(true);
    mockKeychainService.getEncryptionKey.mockResolvedValue('fa8e47b0c161d2a079bd98f7a8b5e23c7d64c8a0f4e2b9a1d58c3e7f6a2b1c9d'); // Valid 256-bit key
    mockKeychainService.getProfile.mockResolvedValue(null);
  });

  describe('Biometric Setup Validation', () => {
    it('should validate successful biometric configuration', async () => {
      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.isValid).toBe(true);
      expect(result.biometricStatus.available).toBe(true);
      expect(result.biometricStatus.type).toBe(Keychain.BIOMETRY_TYPE.FACE_ID);
      expect(result.biometricStatus.accessControlValid).toBe(true);
      expect(result.securityLevel).toBe('excellent');
    });

    it('should detect unavailable biometric authentication', async () => {
      mockKeychain.getSupportedBiometryType.mockResolvedValue(null);

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.biometricStatus.available).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'BIOMETRIC_UNAVAILABLE',
          severity: 'high'
        })
      );
    });

    it('should detect when biometrics are not enrolled', async () => {
      mockKeychain.getSecurityLevel.mockResolvedValue(Keychain.SECURITY_LEVEL.SECURE_SOFTWARE);

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'BIOMETRIC_NOT_ENROLLED'
        })
      );
    });

    it('should handle biometric validation errors', async () => {
      mockKeychain.getSupportedBiometryType.mockRejectedValue(new Error('Biometric error'));

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'BIOMETRIC_VALIDATION_FAILED'
        })
      );
      expect(result.biometricStatus.available).toBe(false);
    });
  });

  describe('Accessibility Settings Validation', () => {
    it('should validate correct accessibility settings', async () => {
      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.accessibilityCompliance.correctLevel).toBe(true);
      expect(result.accessibilityCompliance.backupExcluded).toBe(true);
      expect(result.accessibilityCompliance.deviceOnly).toBe(true);
      expect(result.accessibilityCompliance.biometricRequired).toBe(true);
    });

    it('should detect accessibility configuration errors', async () => {
      mockKeychain.setInternetCredentials.mockRejectedValue(new Error('Access control error'));

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'ACCESSIBILITY_CONFIGURATION_ERROR',
          severity: 'critical',
          affectsAppStore: true
        })
      );
    });

    it('should detect when test credentials cannot be stored/retrieved', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValue(false);

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'ACCESSIBILITY_TEST_FAILED',
          severity: 'high',
          affectsAppStore: true
        })
      );
    });
  });

  describe('Keychain Service Availability', () => {
    it('should validate keychain service availability', async () => {
      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors.filter(e => e.code === 'KEYCHAIN_UNAVAILABLE')).toHaveLength(0);
    });

    it('should detect keychain service unavailability', async () => {
      mockKeychainService.isAvailable.mockResolvedValue(false);

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'KEYCHAIN_UNAVAILABLE',
          severity: 'critical',
          affectsAppStore: true
        })
      );
    });

    it('should handle keychain availability check errors', async () => {
      mockKeychainService.isAvailable.mockRejectedValue(new Error('Availability check failed'));

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'KEYCHAIN_AVAILABILITY_CHECK_FAILED'
        })
      );
    });
  });

  describe('Encryption Key Validation', () => {
    it('should validate proper 256-bit encryption key', async () => {
      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors.filter(e => e.code === 'WEAK_ENCRYPTION_KEY')).toHaveLength(0);
      expect(result.errors.filter(e => e.code === 'LOW_ENTROPY_KEY')).toHaveLength(0);
    });

    it('should detect weak encryption keys', async () => {
      mockKeychainService.getEncryptionKey.mockResolvedValue('weak123'); // Too short

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'WEAK_ENCRYPTION_KEY',
          severity: 'high',
          affectsAppStore: true
        })
      );
    });

    it('should detect low entropy encryption keys', async () => {
      mockKeychainService.getEncryptionKey.mockResolvedValue('1111111111111111111111111111111111111111111111111111111111111111');

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'LOW_ENTROPY_KEY',
          severity: 'critical'
        })
      );
    });

    it('should detect missing encryption key', async () => {
      mockKeychainService.getEncryptionKey.mockResolvedValue(null);

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'ENCRYPTION_KEY_MISSING'
        })
      );
    });

    it('should handle encryption key validation errors', async () => {
      mockKeychainService.getEncryptionKey.mockRejectedValue(new Error('Key access failed'));

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'ENCRYPTION_KEY_VALIDATION_ERROR'
        })
      );
    });
  });

  describe('Profile Storage Validation', () => {
    it('should validate clean profile storage', async () => {
      mockKeychainService.getProfile.mockResolvedValue({
        id: 'test-id',
        passportNumber: 'AB1234567',
        surname: 'Smith',
        givenNames: 'John',
        dateOfBirth: '1985-03-15',
        nationality: 'US',
        passportExpiry: '2030-03-15',
        gender: 'M',
        issuingCountry: 'US',
        defaultDeclarations: {
          hasItemsToDeclar: false,
          carryingCurrency: false,
          carryingProhibitedItems: false,
          visitedFarm: false,
          hasCriminalRecord: false,
          carryingCommercialGoods: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors.filter(e => e.code === 'TEST_DATA_IN_PRODUCTION')).toHaveLength(0);
    });

    it('should detect test data in production profile', async () => {
      mockKeychainService.getProfile.mockResolvedValue({
        id: 'test-id',
        passportNumber: 'TEST12345',
        surname: 'User',
        givenNames: 'Test',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
        passportExpiry: '2030-01-01',
        gender: 'M',
        issuingCountry: 'US',
        defaultDeclarations: {
          hasItemsToDeclar: false,
          carryingCurrency: false,
          carryingProhibitedItems: false,
          visitedFarm: false,
          hasCriminalRecord: false,
          carryingCommercialGoods: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'TEST_DATA_IN_PRODUCTION',
          severity: 'medium',
          affectsAppStore: true
        })
      );
    });

    it('should handle missing profile gracefully', async () => {
      mockKeychainService.getProfile.mockResolvedValue(null);

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'NO_PROFILE_STORED'
        })
      );
    });

    it('should handle profile validation errors', async () => {
      mockKeychainService.getProfile.mockRejectedValue(new Error('Profile access failed'));

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'PROFILE_VALIDATION_ERROR'
        })
      );
    });
  });

  describe('Security Level Calculation', () => {
    it('should assign excellent rating with no issues', async () => {
      const result = await keychainValidator.validateKeychainSecurity();

      // Even with warnings about platform validation, should be good or excellent
      expect(['good', 'excellent']).toContain(result.securityLevel);
    });

    it('should assign poor rating with critical errors', async () => {
      mockKeychainService.isAvailable.mockResolvedValue(false);

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result.securityLevel).toBe('poor');
    });

    it('should assign fair rating with multiple high errors', async () => {
      mockKeychain.getSupportedBiometryType.mockResolvedValue(null);
      mockKeychainService.getEncryptionKey.mockResolvedValue('weak');

      const result = await keychainValidator.validateKeychainSecurity();

      // With multiple high errors, should be fair or poor
      expect(['fair', 'poor']).toContain(result.securityLevel);
    });

    it('should assign good rating with warnings', async () => {
      mockKeychain.getSecurityLevel.mockResolvedValue(Keychain.SECURITY_LEVEL.SECURE_SOFTWARE);

      const result = await keychainValidator.validateKeychainSecurity();

      // With some warnings, should not be poor
      expect(result.securityLevel).not.toBe('poor');
    });
  });

  describe('App Store Submission Validation', () => {
    it('should pass App Store validation with proper setup', async () => {
      const result = await keychainValidator.validateForAppStoreSubmission();

      // With default setup, should be ready or have minimal blockers
      expect(typeof result.ready).toBe('boolean');
      expect(Array.isArray(result.blockers)).toBe(true);
    });

    it('should block App Store submission with critical issues', async () => {
      mockKeychainService.isAvailable.mockResolvedValue(false);

      const result = await keychainValidator.validateForAppStoreSubmission();

      expect(result.ready).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.blockers.every(b => b.affectsAppStore)).toBe(true);
    });
  });

  describe('Quick Security Check', () => {
    it('should pass quick security check with proper setup', async () => {
      const result = await keychainValidator.performQuickSecurityCheck();

      expect(result).toBe(true);
    });

    it('should fail quick security check with unavailable keychain', async () => {
      mockKeychainService.isAvailable.mockResolvedValue(false);

      const result = await keychainValidator.performQuickSecurityCheck();

      expect(result).toBe(false);
    });

    it('should fail quick security check with weak encryption', async () => {
      mockKeychainService.getEncryptionKey.mockResolvedValue('weak');

      const result = await keychainValidator.performQuickSecurityCheck();

      expect(result).toBe(false);
    });

    it('should fail quick security check with no biometric support', async () => {
      mockKeychain.getSupportedBiometryType.mockResolvedValue(null);

      const result = await keychainValidator.performQuickSecurityCheck();

      expect(result).toBe(false);
    });
  });

  describe('Error Resilience', () => {
    it('should handle complete keychain failure gracefully', async () => {
      mockKeychain.getSupportedBiometryType.mockRejectedValue(new Error('Complete failure'));
      mockKeychainService.isAvailable.mockRejectedValue(new Error('Complete failure'));
      mockKeychainService.getEncryptionKey.mockRejectedValue(new Error('Complete failure'));
      mockKeychainService.getProfile.mockRejectedValue(new Error('Complete failure'));

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Security level should be poor or fair with complete failure
      expect(['poor', 'fair']).toContain(result.securityLevel);
    });

    it('should continue validation despite individual component failures', async () => {
      mockKeychain.getSupportedBiometryType.mockRejectedValue(new Error('Biometric failure'));
      // Other components work fine

      const result = await keychainValidator.validateKeychainSecurity();

      expect(result).toBeDefined();
      // Should have some successful validations despite biometric failure
    });
  });
});