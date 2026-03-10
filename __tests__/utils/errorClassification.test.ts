import {
  isStorageError,
  createAppErrorFromError,
  ERROR_CODES,
} from '@/utils/errorHandling';

describe('isStorageError', () => {
  it('should return true for keychain errors', () => {
    expect(isStorageError(new Error('Keychain access failed'))).toBe(true);
    expect(isStorageError(new Error('setInternetCredentials failed'))).toBe(true);
    expect(isStorageError(new Error('getInternetCredentials timeout'))).toBe(true);
    expect(isStorageError(new Error('RNKeychainManager not found'))).toBe(true);
    expect(isStorageError(new Error('Storage unavailable on this device'))).toBe(true);
    expect(isStorageError(new Error('Biometric authentication failed'))).toBe(true);
  });

  it('should return false for non-storage errors', () => {
    expect(isStorageError(new Error('No current profile to update'))).toBe(false);
    expect(isStorageError(new Error('Network request failed'))).toBe(false);
    expect(isStorageError(new Error('Invalid JSON'))).toBe(false);
    expect(isStorageError(new Error('Permission denied'))).toBe(false);
    expect(isStorageError(new Error('Camera not available'))).toBe(false);
  });
});

describe('createAppErrorFromError', () => {
  it('should classify storage errors as STORAGE_UNAVAILABLE', () => {
    const error = new Error('Keychain access denied by user');
    const appError = createAppErrorFromError(error);
    expect(appError.code).toBe(ERROR_CODES.STORAGE_UNAVAILABLE);
  });

  it('should NOT classify "No current profile to update" as STORAGE_UNAVAILABLE', () => {
    const error = new Error('No current profile to update');
    const appError = createAppErrorFromError(error);
    expect(appError.code).not.toBe(ERROR_CODES.STORAGE_UNAVAILABLE);
    expect(appError.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
  });

  it('should classify network errors correctly', () => {
    const error = new Error('Network request failed');
    const appError = createAppErrorFromError(error);
    expect(appError.code).toBe(ERROR_CODES.NETWORK_UNAVAILABLE);
  });

  it('should classify timeout errors correctly', () => {
    const error = new Error('Request timeout after 30s');
    const appError = createAppErrorFromError(error);
    expect(appError.code).toBe(ERROR_CODES.REQUEST_TIMEOUT);
  });

  it('should use fallback code for unrecognized errors', () => {
    const error = new Error('Something completely unexpected');
    const appError = createAppErrorFromError(error, ERROR_CODES.PARSING_ERROR);
    expect(appError.code).toBe(ERROR_CODES.PARSING_ERROR);
  });

  it('should preserve the original error message in details', () => {
    const error = new Error('No current profile to update');
    const appError = createAppErrorFromError(error);
    expect(appError.details).toBe('No current profile to update');
  });
});
