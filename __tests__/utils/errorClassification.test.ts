import {
  isStorageError,
  createAppErrorFromError,
  ERROR_CODES,
} from '@/utils/errorHandling';

describe('Error Classification', () => {
  describe('isStorageError', () => {
    it('should identify keychain errors', () => {
      expect(isStorageError(new Error('Keychain access failed'))).toBe(true);
      expect(isStorageError(new Error('RNKeychainManager is null'))).toBe(true);
      expect(isStorageError(new Error('Failed to setInternetCredentials'))).toBe(true);
      expect(isStorageError(new Error('Failed to getInternetCredentials'))).toBe(true);
      expect(isStorageError(new Error('Secure storage unavailable'))).toBe(true);
      expect(isStorageError(new Error('encryption key generation failed'))).toBe(true);
    });

    it('should not classify non-storage errors as storage errors', () => {
      expect(isStorageError(new Error('No current profile to update'))).toBe(false);
      expect(isStorageError(new Error('Cannot add more than 8 profiles'))).toBe(false);
      expect(isStorageError(new Error('Profile not found'))).toBe(false);
      expect(isStorageError(new Error('Network request failed'))).toBe(false);
      expect(isStorageError(new Error('Camera permission denied'))).toBe(false);
      expect(isStorageError(new Error('Validation failed'))).toBe(false);
    });
  });

  describe('createAppErrorFromError', () => {
    it('should classify storage errors with STORAGE_UNAVAILABLE code', () => {
      const result = createAppErrorFromError(new Error('Keychain write failed'));
      expect(result.code).toBe(ERROR_CODES.STORAGE_UNAVAILABLE);
    });

    it('should classify network errors correctly', () => {
      const result = createAppErrorFromError(new Error('Network connection lost'));
      expect(result.code).toBe(ERROR_CODES.NETWORK_UNAVAILABLE);
    });

    it('should classify unknown errors as UNKNOWN_ERROR', () => {
      const result = createAppErrorFromError(new Error('No current profile to update'));
      expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
    });

    it('should preserve the original error message in details', () => {
      const original = new Error('No current profile to update');
      const result = createAppErrorFromError(original);
      expect(result.details).toBe('No current profile to update');
    });

    it('should use fallback code when provided', () => {
      const result = createAppErrorFromError(
        new Error('Something weird'),
        ERROR_CODES.VALIDATION_FAILED
      );
      expect(result.code).toBe(ERROR_CODES.VALIDATION_FAILED);
    });
  });

  describe('Error masking prevention', () => {
    it('should not classify a profile logic error as a storage error', () => {
      // This is the exact bug that caused the STORAGE_UNAVAILABLE misdiagnosis
      const profileError = new Error('No current profile to update');

      expect(isStorageError(profileError)).toBe(false);

      const appError = createAppErrorFromError(profileError);
      expect(appError.code).not.toBe(ERROR_CODES.STORAGE_UNAVAILABLE);
      expect(appError.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
      expect(appError.details).toBe('No current profile to update');
    });
  });
});
