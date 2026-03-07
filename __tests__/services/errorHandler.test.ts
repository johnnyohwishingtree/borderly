import { ErrorHandler } from '../../src/services/error/errorHandler';
import { ERROR_CODES, createAppError } from '../../src/utils/errorHandling';

// Mock dependencies
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('../../src/utils/retryLogic', () => ({
  retryAsync: jest.fn(),
  RETRY_CONFIGS: {
    network: { maxAttempts: 3, baseDelay: 1000, maxDelay: 5000, backoffStrategy: 'exponential' },
    storage: { maxAttempts: 5, baseDelay: 500, maxDelay: 2000, backoffStrategy: 'linear' },
    camera: { maxAttempts: 2, baseDelay: 1000, maxDelay: 2000, backoffStrategy: 'fixed' },
    quick: { maxAttempts: 2, baseDelay: 100, maxDelay: 500, backoffStrategy: 'fixed' },
  },
}));

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    errorHandler.clearRecoveryCallbacks();
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('converts Error to AppError', async () => {
      const testError = new Error('Test error');
      
      const result = await errorHandler.handleError(testError, undefined, {
        showUserFeedback: false,
        enableRetry: false
      });

      expect(result.recovered).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
    });

    it('preserves AppError', async () => {
      const appError = createAppError(ERROR_CODES.NETWORK_UNAVAILABLE, 'Network test');
      
      const result = await errorHandler.handleError(appError, undefined, {
        showUserFeedback: false,
        enableRetry: false
      });

      expect(result.recovered).toBe(false);
      expect(result.error).toBe(appError);
    });

    it('attempts recovery for recoverable errors', async () => {
      const { retryAsync } = require('../../src/utils/retryLogic');
      retryAsync.mockResolvedValue({ success: true, attempts: 1, totalTime: 100 });

      const appError = createAppError(ERROR_CODES.NETWORK_UNAVAILABLE, 'Network test');
      const mockRecovery = jest.fn().mockResolvedValue(undefined);
      
      errorHandler.registerRecoveryCallback(ERROR_CODES.NETWORK_UNAVAILABLE, mockRecovery);
      
      const result = await errorHandler.handleError(appError, undefined, {
        showUserFeedback: false,
        enableRetry: true
      });

      expect(result.recovered).toBe(true);
      expect(retryAsync).toHaveBeenCalled();
    });

    it('executes fallback action when recovery fails', async () => {
      const { retryAsync } = require('../../src/utils/retryLogic');
      retryAsync.mockResolvedValue({ success: false, attempts: 3, error: new Error('Retry failed') });

      const appError = createAppError(ERROR_CODES.NETWORK_UNAVAILABLE, 'Network test');
      const mockRecovery = jest.fn().mockRejectedValue(new Error('Recovery failed'));
      const mockFallback = jest.fn().mockResolvedValue(undefined);
      
      errorHandler.registerRecoveryCallback(ERROR_CODES.NETWORK_UNAVAILABLE, mockRecovery);
      
      const result = await errorHandler.handleError(appError, undefined, {
        showUserFeedback: false,
        enableRetry: true,
        fallbackAction: mockFallback
      });

      expect(result.recovered).toBe(true);
      expect(mockFallback).toHaveBeenCalled();
    });
  });

  describe('specialized handlers', () => {
    it('handleNetworkError creates network error', async () => {
      const testError = new Error('Connection failed');
      
      const result = await errorHandler.handleNetworkError(testError, undefined, {
        showUserFeedback: false,
        enableRetry: false
      });

      expect(result.error?.code).toBe(ERROR_CODES.NETWORK_UNAVAILABLE);
    });

    it('handleStorageError creates storage error', async () => {
      const testError = new Error('Storage failed');
      
      const result = await errorHandler.handleStorageError(testError, undefined, {
        showUserFeedback: false,
        enableRetry: false
      });

      expect(result.error?.code).toBe(ERROR_CODES.STORAGE_UNAVAILABLE);
    });

    it('handleCameraError creates camera error', async () => {
      const testError = new Error('Camera unavailable');
      
      const result = await errorHandler.handleCameraError(testError, undefined, {
        showUserFeedback: false,
        enableRetry: false
      });

      expect(result.error?.code).toBe(ERROR_CODES.CAMERA_UNAVAILABLE);
    });

    it('handleCameraError creates permission error for permission issues', async () => {
      const testError = new Error('Permission denied');
      
      const result = await errorHandler.handleCameraError(testError, undefined, {
        showUserFeedback: false,
        enableRetry: false
      });

      expect(result.error?.code).toBe(ERROR_CODES.CAMERA_PERMISSION_DENIED);
    });
  });

  describe('withErrorHandling wrapper', () => {
    it('wraps function and handles errors', async () => {
      const testFunction = jest.fn().mockRejectedValue(new Error('Test error'));
      const wrappedFunction = errorHandler.withErrorHandling(
        testFunction,
        { screen: 'Test' },
        { showUserFeedback: false, enableRetry: false }
      );

      await expect(wrappedFunction('arg1', 'arg2')).rejects.toThrow();
      expect(testFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('returns result when function succeeds', async () => {
      const testFunction = jest.fn().mockResolvedValue('success');
      const wrappedFunction = errorHandler.withErrorHandling(
        testFunction,
        { screen: 'Test' },
        { showUserFeedback: false }
      );

      const result = await wrappedFunction('arg1', 'arg2');
      expect(result).toBe('success');
      expect(testFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });
});