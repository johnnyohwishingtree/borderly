import { ErrorHandling } from '../../../src/services/automation/errorHandling';

// ---------------------------------------------------------------------------
// createRetryConfig
// ---------------------------------------------------------------------------
describe('createRetryConfig', () => {
  it('returns config with specified values', () => {
    const config = ErrorHandling.createRetryConfig(5, 2000, 20000, 3);
    expect(config.maxAttempts).toBe(5);
    expect(config.baseDelay).toBe(2000);
    expect(config.maxDelay).toBe(20000);
    expect(config.backoffFactor).toBe(3);
  });

  it('uses default values when none provided', () => {
    const config = ErrorHandling.createRetryConfig();
    expect(config.maxAttempts).toBe(3);
    expect(config.baseDelay).toBe(1000);
    expect(config.maxDelay).toBe(10000);
    expect(config.backoffFactor).toBe(2);
  });

  it('shouldRetry returns false for non-retryable errors', () => {
    const config = ErrorHandling.createRetryConfig();
    expect(config.shouldRetry(new Error('Element not found'), 1)).toBe(false);
    expect(config.shouldRetry(new Error('Timeout occurred'), 1)).toBe(false);
    expect(config.shouldRetry(new Error('Security validation failed'), 1)).toBe(false);
  });

  it('shouldRetry returns true for retryable errors within attempt limit', () => {
    const config = ErrorHandling.createRetryConfig(3);
    expect(config.shouldRetry(new Error('Network error'), 1)).toBe(true);
    expect(config.shouldRetry(new Error('Network error'), 2)).toBe(true);
  });

  it('shouldRetry returns false when at max attempts', () => {
    const config = ErrorHandling.createRetryConfig(3);
    expect(config.shouldRetry(new Error('Network error'), 3)).toBe(false);
  });

  it('getDelay uses exponential backoff capped at maxDelay', () => {
    const config = ErrorHandling.createRetryConfig(3, 1000, 5000, 2);
    const delay1 = config.getDelay(1);
    const delay2 = config.getDelay(2);
    const delay3 = config.getDelay(3);

    // base * 2^(attempt-1) + jitter (0-1000)
    expect(delay1).toBeGreaterThanOrEqual(1000);
    expect(delay1).toBeLessThan(2001);
    expect(delay2).toBeGreaterThanOrEqual(2000);
    expect(delay2).toBeLessThan(3001);
    // attempt 3: min(1000 * 4, 5000) = 4000 + jitter
    expect(delay3).toBeGreaterThanOrEqual(4000);
    expect(delay3).toBeLessThan(5001);
  });
});

// ---------------------------------------------------------------------------
// withRetry
// ---------------------------------------------------------------------------
describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const retryable = ErrorHandling.withRetry(fn, ErrorHandling.createRetryConfig(3, 10, 100, 2));
    const result = await retryable();
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on transient errors and succeeds', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue('recovered');
    const retryable = ErrorHandling.withRetry(fn, ErrorHandling.createRetryConfig(3, 10, 100, 2));
    const result = await retryable();
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws immediately for non-retryable errors', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Element not found'));
    const retryable = ErrorHandling.withRetry(fn, ErrorHandling.createRetryConfig(3, 10, 100, 2));
    await expect(retryable()).rejects.toThrow('Element not found');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('transient'));
    const retryable = ErrorHandling.withRetry(fn, ErrorHandling.createRetryConfig(2, 10, 100, 2));
    await expect(retryable()).rejects.toThrow('transient');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// categorizeError
// ---------------------------------------------------------------------------
describe('categorizeError', () => {
  it('categorizes network errors', () => {
    const result = ErrorHandling.categorizeError(new Error('network failure'));
    expect(result.category).toBe('network');
    expect(result.retryable).toBe(true);
    expect(result.severity).toBe('medium');
  });

  it('categorizes fetch errors as network', () => {
    const result = ErrorHandling.categorizeError(new Error('fetch failed'));
    expect(result.category).toBe('network');
  });

  it('categorizes element not found errors', () => {
    const result = ErrorHandling.categorizeError(new Error('element not found'));
    expect(result.category).toBe('element');
    expect(result.retryable).toBe(false);
    expect(result.severity).toBe('high');
  });

  it('categorizes selector errors as element', () => {
    const result = ErrorHandling.categorizeError(new Error('selector mismatch'));
    expect(result.category).toBe('element');
  });

  it('categorizes validation errors', () => {
    const result = ErrorHandling.categorizeError(new Error('validation failed'));
    expect(result.category).toBe('validation');
    expect(result.retryable).toBe(false);
  });

  it('categorizes timeout errors', () => {
    const result = ErrorHandling.categorizeError(new Error('timeout exceeded'));
    expect(result.category).toBe('timeout');
    expect(result.retryable).toBe(true);
  });

  it('categorizes security errors', () => {
    const result = ErrorHandling.categorizeError(new Error('security check failed'));
    expect(result.category).toBe('security');
    expect(result.retryable).toBe(false);
    expect(result.severity).toBe('high');
  });

  it('categorizes unknown errors with fallback', () => {
    const result = ErrorHandling.categorizeError(new Error('something went wrong'));
    expect(result.category).toBe('unknown');
    expect(result.retryable).toBe(true);
    expect(result.severity).toBe('medium');
  });
});
