/**
 * Tests for errorHandling.ts
 *
 * Covers:
 *  - createAppError: builds AppError from error codes
 *  - createAppErrorFromError: classifies generic Errors
 *  - isStorageError: keyword detection
 *  - logError: logging behaviour
 *  - showErrorAlert: Alert button structure
 *  - handleError: end-to-end error handling pipeline
 *  - withErrorHandling: async wrapper
 *  - isAppError: type guard
 */

import { Alert } from 'react-native';
import {
  createAppError,
  createAppErrorFromError,
  isStorageError,
  logError,
  showErrorAlert,
  handleError,
  withErrorHandling,
  isAppError,
  ERROR_CODES,
  AppError,
} from '../../../src/services/error/errorHandling';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createAppError
// ---------------------------------------------------------------------------

describe('createAppError', () => {
  it('creates an AppError with the correct code and messages', () => {
    const error = createAppError(ERROR_CODES.NETWORK_UNAVAILABLE);

    expect(error.code).toBe('NETWORK_UNAVAILABLE');
    expect(error.message).toBe('Network connection is unavailable');
    expect(error.userMessage).toBe(
      'Please check your internet connection and try again.',
    );
    expect(error.recoverable).toBe(true);
  });

  it('includes details when provided', () => {
    const error = createAppError(ERROR_CODES.SERVER_ERROR, 'status 503');

    expect(error.details).toBe('status 503');
  });

  it('omits details when not provided', () => {
    const error = createAppError(ERROR_CODES.UNKNOWN_ERROR);

    expect(error.details).toBeUndefined();
  });

  it('overrides userMessage when provided', () => {
    const error = createAppError(
      ERROR_CODES.VALIDATION_FAILED,
      undefined,
      'Passport number is required.',
    );

    expect(error.userMessage).toBe('Passport number is required.');
  });

  it('marks non-recoverable errors correctly', () => {
    const error = createAppError(ERROR_CODES.STORAGE_UNAVAILABLE);

    expect(error.recoverable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createAppErrorFromError
// ---------------------------------------------------------------------------

describe('createAppErrorFromError', () => {
  it('classifies network errors', () => {
    const error = createAppErrorFromError(new Error('Network failure'));

    expect(error.code).toBe(ERROR_CODES.NETWORK_UNAVAILABLE);
  });

  it('classifies timeout errors', () => {
    const error = createAppErrorFromError(new Error('Request timeout'));

    expect(error.code).toBe(ERROR_CODES.REQUEST_TIMEOUT);
  });

  it('classifies permission errors as camera permission', () => {
    const error = createAppErrorFromError(new Error('Permission denied'));

    expect(error.code).toBe(ERROR_CODES.CAMERA_PERMISSION_DENIED);
  });

  it('classifies storage/keychain errors', () => {
    const error = createAppErrorFromError(
      new Error('Keychain access failed'),
    );

    expect(error.code).toBe(ERROR_CODES.STORAGE_UNAVAILABLE);
  });

  it('falls back to UNKNOWN_ERROR for unrecognized errors', () => {
    const error = createAppErrorFromError(new Error('Something weird'));

    expect(error.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
  });

  it('uses custom fallback code when provided', () => {
    const error = createAppErrorFromError(
      new Error('Something weird'),
      ERROR_CODES.PARSING_ERROR,
    );

    expect(error.code).toBe(ERROR_CODES.PARSING_ERROR);
  });

  it('preserves original error message in details', () => {
    const error = createAppErrorFromError(new Error('Original message'));

    expect(error.details).toBe('Original message');
  });
});

// ---------------------------------------------------------------------------
// isStorageError
// ---------------------------------------------------------------------------

describe('isStorageError', () => {
  const storageMessages = [
    'Keychain access failed',
    'setInternetCredentials error',
    'getInternetCredentials timeout',
    'RNKeychainManager missing',
    'Storage unavailable',
    'Biometric auth failed',
    'Disk access denied',
  ];

  it.each(storageMessages)('returns true for "%s"', (msg) => {
    expect(isStorageError(new Error(msg))).toBe(true);
  });

  const nonStorageMessages = [
    'Network error',
    'Invalid JSON',
    'Not found',
    'Camera broke',
  ];

  it.each(nonStorageMessages)('returns false for "%s"', (msg) => {
    expect(isStorageError(new Error(msg))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// logError
// ---------------------------------------------------------------------------

describe('logError', () => {
  it('logs an AppError with context', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const appError = createAppError(ERROR_CODES.NETWORK_UNAVAILABLE);
    logError(appError, { screen: 'TripDetail', timestamp: 1000 });

    expect(spy).toHaveBeenCalledWith(
      'Borderly Error:',
      expect.objectContaining({ screen: 'TripDetail' }),
    );

    spy.mockRestore();
    warnSpy.mockRestore();
  });

  it('logs a plain Error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    logError(new Error('boom'));

    expect(spy).toHaveBeenCalledWith(
      'Borderly Error:',
      expect.objectContaining({
        error: expect.objectContaining({ message: 'boom' }),
      }),
    );

    spy.mockRestore();
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// showErrorAlert
// ---------------------------------------------------------------------------

describe('showErrorAlert', () => {
  it('shows alert with retry button for recoverable errors', () => {
    const onRetry = jest.fn();
    const error = createAppError(ERROR_CODES.NETWORK_UNAVAILABLE);

    showErrorAlert(error, onRetry);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      error.userMessage,
      expect.arrayContaining([
        expect.objectContaining({ text: 'Try Again' }),
      ]),
    );
  });

  it('shows OK button for non-recoverable errors', () => {
    const error = createAppError(ERROR_CODES.STORAGE_UNAVAILABLE);

    showErrorAlert(error);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      error.userMessage,
      expect.arrayContaining([
        expect.objectContaining({ text: 'OK' }),
      ]),
    );
  });

  it('includes cancel button when onCancel is provided', () => {
    const onCancel = jest.fn();
    const error = createAppError(ERROR_CODES.NETWORK_UNAVAILABLE);

    showErrorAlert(error, undefined, onCancel);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      error.userMessage,
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// handleError
// ---------------------------------------------------------------------------

describe('handleError', () => {
  it('converts Error to AppError and returns it', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = handleError(new Error('Network issue'), undefined, {
      showAlert: false,
    });

    expect(result.code).toBe(ERROR_CODES.NETWORK_UNAVAILABLE);

    jest.restoreAllMocks();
  });

  it('passes AppError through unchanged', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const appError = createAppError(ERROR_CODES.MRZ_SCAN_FAILED);
    const result = handleError(appError, undefined, { showAlert: false });

    expect(result).toBe(appError);

    jest.restoreAllMocks();
  });

  it('shows alert by default', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    handleError(new Error('timeout occurred'));

    expect(Alert.alert).toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('respects showAlert: false', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    handleError(new Error('quiet error'), undefined, { showAlert: false });

    expect(Alert.alert).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('uses fallbackErrorCode for unrecognized errors', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = handleError(new Error('weird'), undefined, {
      showAlert: false,
      fallbackErrorCode: ERROR_CODES.PARSING_ERROR,
    });

    expect(result.code).toBe(ERROR_CODES.PARSING_ERROR);

    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// withErrorHandling
// ---------------------------------------------------------------------------

describe('withErrorHandling', () => {
  it('returns result on success', async () => {
    const fn = jest.fn().mockResolvedValue('data');
    const wrapped = withErrorHandling(fn);

    const result = await wrapped('arg');

    expect(result).toBe('data');
    expect(fn).toHaveBeenCalledWith('arg');
  });

  it('throws an AppError on failure', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const fn = jest.fn().mockRejectedValue(new Error('Network down'));
    const wrapped = withErrorHandling(fn);

    try {
      await wrapped();
      fail('should have thrown');
    } catch (error) {
      expect(isAppError(error)).toBe(true);
      expect((error as AppError).code).toBe(ERROR_CODES.NETWORK_UNAVAILABLE);
    }

    jest.restoreAllMocks();
  });

  it('uses provided fallback error code', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const fn = jest.fn().mockRejectedValue(new Error('something'));
    const wrapped = withErrorHandling(
      fn,
      undefined,
      ERROR_CODES.FORM_SUBMISSION_FAILED,
    );

    try {
      await wrapped();
      fail('should have thrown');
    } catch (error) {
      expect((error as AppError).code).toBe(ERROR_CODES.FORM_SUBMISSION_FAILED);
    }

    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// isAppError
// ---------------------------------------------------------------------------

describe('isAppError', () => {
  it('returns true for a valid AppError', () => {
    const error = createAppError(ERROR_CODES.UNKNOWN_ERROR);

    expect(isAppError(error)).toBe(true);
  });

  it('returns false for a plain Error', () => {
    expect(isAppError(new Error('nope'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAppError(null)).toBeFalsy();
  });

  it('returns false for an object missing required fields', () => {
    expect(isAppError({ code: 'X', message: 'Y' })).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isAppError('error')).toBe(false);
  });
});
