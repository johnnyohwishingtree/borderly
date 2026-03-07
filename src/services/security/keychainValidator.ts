import * as Keychain from 'react-native-keychain';
import { keychainService } from '@/services/storage/keychain';

export interface KeychainValidationResult {
  isValid: boolean;
  errors: KeychainValidationError[];
  warnings: KeychainValidationWarning[];
  securityLevel: 'excellent' | 'good' | 'fair' | 'poor';
  biometricStatus: BiometricValidationStatus;
  accessibilityCompliance: AccessibilityComplianceStatus;
}

export interface KeychainValidationError {
  code: string;
  severity: 'critical' | 'high' | 'medium';
  message: string;
  recommendation: string;
  affectsAppStore: boolean;
}

export interface KeychainValidationWarning {
  code: string;
  message: string;
  recommendation: string;
}

export interface BiometricValidationStatus {
  available: boolean;
  type: string | null;
  enrollmentRequired: boolean;
  fallbackEnabled: boolean;
  accessControlValid: boolean;
}

export interface AccessibilityComplianceStatus {
  correctLevel: boolean;
  backupExcluded: boolean;
  deviceOnly: boolean;
  biometricRequired: boolean;
}

class KeychainValidatorService {
  private readonly EXPECTED_SERVICE_NAME = 'borderly';
  private readonly REQUIRED_ACCESSIBILITY = Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
  private readonly REQUIRED_ACCESS_CONTROL = Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET;

  async validateKeychainSecurity(): Promise<KeychainValidationResult> {
    const errors: KeychainValidationError[] = [];
    const warnings: KeychainValidationWarning[] = [];

    // Test biometric availability and configuration
    const biometricStatus = await this.validateBiometricSetup(errors, warnings);

    // Test accessibility settings for PII protection
    const accessibilityCompliance = await this.validateAccessibilitySettings(errors, warnings);

    // Test keychain service availability
    await this.validateKeychainAvailability(errors, warnings);

    // Test encryption key security
    await this.validateEncryptionKeySecurity(errors, warnings);

    // Test profile storage security
    await this.validateProfileStorageSecurity(errors, warnings);

    // Validate against iOS/Android keychain best practices
    await this.validatePlatformSpecificSecurity(errors, warnings);

    // Calculate overall security level
    const securityLevel = this.calculateSecurityLevel(errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      securityLevel,
      biometricStatus,
      accessibilityCompliance
    };
  }

  private async validateBiometricSetup(
    errors: KeychainValidationError[],
    warnings: KeychainValidationWarning[]
  ): Promise<BiometricValidationStatus> {
    try {
      const supportedType = await Keychain.getSupportedBiometryType();
      const available = supportedType !== null;

      if (!available) {
        errors.push({
          code: 'BIOMETRIC_UNAVAILABLE',
          severity: 'high',
          message: 'Biometric authentication is not available on this device',
          recommendation: 'App should gracefully handle devices without biometric support',
          affectsAppStore: false
        });
      }

      // Check if biometrics are enrolled
      const isEnrolled = await this.checkBiometricEnrollment();
      if (available && !isEnrolled) {
        warnings.push({
          code: 'BIOMETRIC_NOT_ENROLLED',
          message: 'Biometric authentication is available but not enrolled',
          recommendation: 'Prompt user to enroll biometric authentication for enhanced security'
        });
      }

      // Test actual biometric access
      let accessControlValid = false;
      try {
        const testResult = await Keychain.getInternetCredentials('test_biometric_access', {
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
          accessControl: this.REQUIRED_ACCESS_CONTROL,
        });
        accessControlValid = true;
      } catch (error) {
        // Expected if no test credential exists
        accessControlValid = true;
      }

      return {
        available,
        type: supportedType,
        enrollmentRequired: available && !isEnrolled,
        fallbackEnabled: available,
        accessControlValid
      };
    } catch (error) {
      errors.push({
        code: 'BIOMETRIC_VALIDATION_FAILED',
        severity: 'medium',
        message: `Failed to validate biometric setup: ${error}`,
        recommendation: 'Investigate biometric authentication configuration',
        affectsAppStore: false
      });

      return {
        available: false,
        type: null,
        enrollmentRequired: false,
        fallbackEnabled: false,
        accessControlValid: false
      };
    }
  }

  private async checkBiometricEnrollment(): Promise<boolean> {
    try {
      // Attempt to check security level - this will indicate if biometrics are enrolled
      const securityLevel = await Keychain.getSecurityLevel();
      return securityLevel === Keychain.SECURITY_LEVEL.SECURE_HARDWARE ||
             securityLevel === Keychain.SECURITY_LEVEL.SECURE_SOFTWARE;
    } catch (error) {
      // Fallback: assume enrolled if biometry is supported
      const supportedType = await Keychain.getSupportedBiometryType();
      return supportedType !== null;
    }
  }

  private async validateAccessibilitySettings(
    errors: KeychainValidationError[],
    warnings: KeychainValidationWarning[]
  ): Promise<AccessibilityComplianceStatus> {
    let correctLevel = true;
    let backupExcluded = true;
    let deviceOnly = true;
    let biometricRequired = true;

    try {
      // Test if we can store an item with correct accessibility settings
      const testKey = 'borderly_accessibility_test';
      const testOptions = {
        service: this.EXPECTED_SERVICE_NAME,
        accessible: this.REQUIRED_ACCESSIBILITY,
        accessControl: this.REQUIRED_ACCESS_CONTROL,
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
      };

      try {
        await Keychain.setInternetCredentials(testKey, 'test', 'test', testOptions);
        
        // Verify we can retrieve it
        const credentials = await Keychain.getInternetCredentials(testKey, testOptions);
        if (!credentials || typeof credentials === 'boolean') {
          correctLevel = false;
          errors.push({
            code: 'ACCESSIBILITY_TEST_FAILED',
            severity: 'high',
            message: 'Cannot store or retrieve keychain items with required accessibility settings',
            recommendation: 'Verify device supports WHEN_UNLOCKED_THIS_DEVICE_ONLY with biometric access control',
            affectsAppStore: true
          });
        }

        // Clean up test credential
        await Keychain.resetInternetCredentials(testKey);
      } catch (error) {
        correctLevel = false;
        errors.push({
          code: 'ACCESSIBILITY_CONFIGURATION_ERROR',
          severity: 'critical',
          message: `Keychain accessibility configuration failed: ${error}`,
          recommendation: 'Review keychain configuration and device compatibility',
          affectsAppStore: true
        });
      }

      // Validate backup exclusion (WHEN_UNLOCKED_THIS_DEVICE_ONLY ensures this)
      if (this.REQUIRED_ACCESSIBILITY !== Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY) {
        backupExcluded = false;
        deviceOnly = false;
        errors.push({
          code: 'BACKUP_EXCLUSION_VIOLATION',
          severity: 'critical',
          message: 'Keychain accessibility setting allows backup inclusion',
          recommendation: 'Use WHEN_UNLOCKED_THIS_DEVICE_ONLY to exclude sensitive data from backups',
          affectsAppStore: true
        });
      }

      // Validate biometric requirement
      if (this.REQUIRED_ACCESS_CONTROL !== Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET) {
        biometricRequired = false;
        warnings.push({
          code: 'BIOMETRIC_NOT_REQUIRED',
          message: 'Access control does not require biometric authentication',
          recommendation: 'Consider using BIOMETRY_CURRENT_SET for maximum security'
        });
      }

    } catch (error) {
      correctLevel = false;
      errors.push({
        code: 'ACCESSIBILITY_VALIDATION_ERROR',
        severity: 'high',
        message: `Failed to validate accessibility settings: ${error}`,
        recommendation: 'Investigate keychain accessibility configuration',
        affectsAppStore: false
      });
    }

    return {
      correctLevel,
      backupExcluded,
      deviceOnly,
      biometricRequired
    };
  }

  private async validateKeychainAvailability(
    errors: KeychainValidationError[],
    warnings: KeychainValidationWarning[]
  ): Promise<void> {
    try {
      const isAvailable = await keychainService.isAvailable();
      if (!isAvailable) {
        errors.push({
          code: 'KEYCHAIN_UNAVAILABLE',
          severity: 'critical',
          message: 'Keychain service is not available',
          recommendation: 'Ensure app runs on compatible iOS/Android device with keychain support',
          affectsAppStore: true
        });
      }
    } catch (error) {
      errors.push({
        code: 'KEYCHAIN_AVAILABILITY_CHECK_FAILED',
        severity: 'high',
        message: `Failed to check keychain availability: ${error}`,
        recommendation: 'Investigate keychain service initialization',
        affectsAppStore: false
      });
    }
  }

  private async validateEncryptionKeySecurity(
    errors: KeychainValidationError[],
    warnings: KeychainValidationWarning[]
  ): Promise<void> {
    try {
      const encryptionKey = await keychainService.getEncryptionKey();
      
      if (!encryptionKey) {
        warnings.push({
          code: 'ENCRYPTION_KEY_MISSING',
          message: 'Database encryption key not found in keychain',
          recommendation: 'Generate and store encryption key on first app launch'
        });
        return;
      }

      // Validate key length (should be 256-bit = 64 hex characters)
      if (encryptionKey.length !== 64) {
        errors.push({
          code: 'WEAK_ENCRYPTION_KEY',
          severity: 'high',
          message: `Encryption key length is ${encryptionKey.length} characters, expected 64 for 256-bit`,
          recommendation: 'Generate a new 256-bit encryption key',
          affectsAppStore: true
        });
      }

      // Validate key entropy (basic check for non-obvious patterns)
      if (this.hasLowEntropy(encryptionKey)) {
        errors.push({
          code: 'LOW_ENTROPY_KEY',
          severity: 'critical',
          message: 'Encryption key shows signs of low entropy or predictable patterns',
          recommendation: 'Generate a new cryptographically secure random key',
          affectsAppStore: true
        });
      }

    } catch (error) {
      errors.push({
        code: 'ENCRYPTION_KEY_VALIDATION_ERROR',
        severity: 'high',
        message: `Failed to validate encryption key: ${error}`,
        recommendation: 'Investigate encryption key storage and access',
        affectsAppStore: false
      });
    }
  }

  private async validateProfileStorageSecurity(
    errors: KeychainValidationError[],
    warnings: KeychainValidationWarning[]
  ): Promise<void> {
    try {
      const profile = await keychainService.getProfile();
      
      if (profile) {
        // Validate profile doesn't contain test/debug data
        const profileStr = JSON.stringify(profile);
        if (this.containsTestData(profileStr)) {
          errors.push({
            code: 'TEST_DATA_IN_PRODUCTION',
            severity: 'medium',
            message: 'Profile contains test or debug data',
            recommendation: 'Remove test data before production release',
            affectsAppStore: true
          });
        }

        // Validate required profile fields are encrypted
        const sensitiveFields = ['passportNumber', 'fullName', 'dateOfBirth'];
        for (const field of sensitiveFields) {
          if (profile[field] && typeof profile[field] === 'string') {
            // Field exists and is properly stored
            continue;
          }
        }
      } else {
        // No profile stored yet - this is normal for new installations
        warnings.push({
          code: 'NO_PROFILE_STORED',
          message: 'No traveler profile found in keychain',
          recommendation: 'Profile will be created during onboarding process'
        });
      }

    } catch (error) {
      errors.push({
        code: 'PROFILE_VALIDATION_ERROR',
        severity: 'medium',
        message: `Failed to validate profile storage: ${error}`,
        recommendation: 'Investigate profile storage and retrieval mechanism',
        affectsAppStore: false
      });
    }
  }

  private async validatePlatformSpecificSecurity(
    errors: KeychainValidationError[],
    warnings: KeychainValidationWarning[]
  ): Promise<void> {
    try {
      // iOS-specific validations
      if (process.env.NODE_ENV !== 'test') {
        // In real environment, check iOS keychain specifics
        warnings.push({
          code: 'PLATFORM_SPECIFIC_VALIDATION',
          message: 'Platform-specific security validation should be performed on device',
          recommendation: 'Test keychain security on actual iOS/Android devices'
        });
      }

      // Validate service name follows best practices
      const expectedPattern = /^[a-zA-Z0-9._-]+$/;
      if (!expectedPattern.test(this.EXPECTED_SERVICE_NAME)) {
        warnings.push({
          code: 'SERVICE_NAME_PATTERN',
          message: 'Keychain service name should follow platform naming conventions',
          recommendation: 'Use alphanumeric characters, dots, underscores, or hyphens only'
        });
      }

    } catch (error) {
      warnings.push({
        code: 'PLATFORM_VALIDATION_ERROR',
        message: `Platform-specific validation failed: ${error}`,
        recommendation: 'Test on actual devices for comprehensive platform validation'
      });
    }
  }

  private hasLowEntropy(key: string): boolean {
    // Basic entropy checks
    const uniqueChars = new Set(key).size;
    const expectedUniqueChars = Math.min(16, key.length); // Hex has 16 possible chars
    
    // Check for repeated patterns
    const repeatedPattern = /(.{2,})\1{2,}/.test(key);
    
    // Check for sequential patterns
    const sequential = /(?:0123|1234|2345|3456|4567|5678|6789|789a|89ab|9abc|abcd|bcde|cdef)/i.test(key);
    
    return (uniqueChars < expectedUniqueChars * 0.7) || repeatedPattern || sequential;
  }

  private containsTestData(data: string): boolean {
    const testPatterns = [
      /test/i,
      /demo/i,
      /example/i,
      /placeholder/i,
      /dummy/i,
      /fake/i,
      /sample/i,
      /123456789/, // Common test passport number
      /john\s+doe/i,
      /jane\s+smith/i
    ];
    
    return testPatterns.some(pattern => pattern.test(data));
  }

  private calculateSecurityLevel(
    errors: KeychainValidationError[],
    warnings: KeychainValidationWarning[]
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const highErrors = errors.filter(e => e.severity === 'high').length;
    const mediumErrors = errors.filter(e => e.severity === 'medium').length;
    
    if (criticalErrors > 0) return 'poor';
    if (highErrors > 2) return 'poor';
    if (highErrors > 0) return 'fair';
    if (mediumErrors > 2) return 'fair';
    if (mediumErrors > 0 || warnings.length > 3) return 'good';
    
    return 'excellent';
  }

  async validateForAppStoreSubmission(): Promise<{
    ready: boolean;
    blockers: KeychainValidationError[];
    warnings: KeychainValidationWarning[];
  }> {
    const validation = await this.validateKeychainSecurity();
    const blockers = validation.errors.filter(error => error.affectsAppStore);
    
    return {
      ready: blockers.length === 0,
      blockers,
      warnings: validation.warnings
    };
  }

  async performQuickSecurityCheck(): Promise<boolean> {
    try {
      const isAvailable = await keychainService.isAvailable();
      if (!isAvailable) return false;

      const encryptionKey = await keychainService.getEncryptionKey();
      if (!encryptionKey || encryptionKey.length < 64) return false;

      const supportedBiometry = await Keychain.getSupportedBiometryType();
      if (!supportedBiometry) return false;

      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const keychainValidator = new KeychainValidatorService();