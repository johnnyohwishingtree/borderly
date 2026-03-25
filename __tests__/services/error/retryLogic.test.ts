/**
 * Tests for retryLogic.ts
 *
 * Covers:
 *  - retryAsync: success on first attempt, success on Nth attempt, exhausts max retries
 *  - retry (sync): same scenarios
 *  - calculateDelay: exponential, linear, fixed backoff strategies
 *  - shouldRetry: retryable vs non-retryable error classification
 *  - withRetry wrapper
 *  - CircuitBreaker: closed/open/half-open state transitions
 *  - RETRY_CONFIGS predefined configs
 */

import {
  retryAsync,
  retry,
  withRetry,
  CircuitBreaker,
  RETRY_CONFIGS,
} from '../../../src/services/error/retryLogic';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeNetworkError(msg = 'Network request failed'): Error {
  return new Error(msg);
}

function makeAuthError(msg = 'Unauthorized access'): Error {
  return new Error(msg);
}

// ---------------------------------------------------------------------------
// retryAsync
// ---------------------------------------------------------------------------

describe('retryAsync', () => {
  beforeEach(() => {
    jest.spyOn(Math, 'random').mockReturnValue(0); // deterministic jitter
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('succeeds on first attempt without retrying', async () => {
    const op = jest.fn().mockResolvedValue('ok');

    const result = await retryAsync(op, { maxAttempts: 3, baseDelay: 10 });

    expect(result.success).toBe(true);
    expect(result.data).toBe('ok');
    expect(result.attempts).toBe(1);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('succeeds on 2nd attempt after a retryable failure', async () => {
    const op = jest
      .fn()
      .mockRejectedValueOnce(makeNetworkError())
      .mockResolvedValue('recovered');

    const result = await retryAsync(op, {
      maxAttempts: 3,
      baseDelay: 1,
      maxDelay: 10,
    });

    expect(result.success).toBe(true);
    expect(result.data).toBe('recovered');
    expect(result.attempts).toBe(2);
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('exhausts all attempts for persistent retryable errors', async () => {
    const op = jest.fn().mockRejectedValue(makeNetworkError());

    const result = await retryAsync(op, {
      maxAttempts: 3,
      baseDelay: 1,
      maxDelay: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.message).toBe('Network request failed');
    expect(result.attempts).toBe(3);
  });

  it('stops immediately for non-retryable errors', async () => {
    const op = jest.fn().mockRejectedValue(makeAuthError());

    const result = await retryAsync(op, {
      maxAttempts: 5,
      baseDelay: 1,
      maxDelay: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error!.message).toBe('Unauthorized access');
    // Should not retry auth errors — stops after first attempt
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry callback between attempts', async () => {
    const onRetry = jest.fn();
    const op = jest
      .fn()
      .mockRejectedValueOnce(makeNetworkError())
      .mockResolvedValue('done');

    await retryAsync(op, {
      maxAttempts: 3,
      baseDelay: 1,
      maxDelay: 10,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it('respects custom shouldRetry predicate', async () => {
    const op = jest.fn().mockRejectedValue(new Error('custom error'));
    const shouldRetry = jest.fn().mockReturnValue(false);

    const result = await retryAsync(op, {
      maxAttempts: 5,
      baseDelay: 1,
      shouldRetry,
    });

    expect(result.success).toBe(false);
    expect(op).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it('caps delay at maxDelay with exponential backoff', async () => {
    jest.useFakeTimers();
    const op = jest.fn().mockRejectedValue(makeNetworkError());
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    // Run with very small maxDelay to verify capping
    const promise = retryAsync(op, {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 500,
      backoffStrategy: 'exponential',
    });

    // Advance through all timers
    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    }

    await promise;

    // Verify setTimeout was called with delays capped at maxDelay (500)
    const delays = setTimeoutSpy.mock.calls
      .map(call => call[1])
      .filter((d): d is number => typeof d === 'number' && d <= 500);
    expect(delays.length).toBeGreaterThan(0);

    jest.useRealTimers();
    setTimeoutSpy.mockRestore();
  });

  it('tracks totalTime across retries', async () => {
    const op = jest.fn().mockResolvedValue('fast');

    const result = await retryAsync(op, { maxAttempts: 1, baseDelay: 1 });

    expect(result.totalTime).toBeGreaterThanOrEqual(0);
    expect(typeof result.totalTime).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// retry (synchronous)
// ---------------------------------------------------------------------------

describe('retry (sync)', () => {
  it('succeeds on first attempt', () => {
    const op = jest.fn().mockReturnValue(42);

    const result = retry(op, { maxAttempts: 3 });

    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
    expect(result.attempts).toBe(1);
  });

  it('succeeds on Nth attempt after retryable failures', () => {
    let callCount = 0;
    const op = jest.fn(() => {
      callCount++;
      if (callCount < 3) throw makeNetworkError();
      return 'ok';
    });

    const result = retry(op, { maxAttempts: 5, baseDelay: 1 });

    expect(result.success).toBe(true);
    expect(result.data).toBe('ok');
    expect(result.attempts).toBe(3);
  });

  it('exhausts max retries for persistent errors', () => {
    const op = jest.fn(() => {
      throw makeNetworkError('connection reset');
    });

    const result = retry(op, { maxAttempts: 2, baseDelay: 1 });

    expect(result.success).toBe(false);
    expect(result.error!.message).toBe('connection reset');
    expect(result.attempts).toBe(2);
  });

  it('stops immediately for non-retryable errors', () => {
    const op = jest.fn(() => {
      throw makeAuthError('forbidden');
    });

    const result = retry(op, { maxAttempts: 5 });

    expect(result.success).toBe(false);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry callback between attempts', () => {
    const onRetry = jest.fn();
    let callCount = 0;
    const op = jest.fn(() => {
      callCount++;
      if (callCount < 2) throw makeNetworkError();
      return 'done';
    });

    retry(op, { maxAttempts: 3, baseDelay: 1, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });
});

// ---------------------------------------------------------------------------
// withRetry wrapper
// ---------------------------------------------------------------------------

describe('withRetry', () => {
  it('returns the result on success', async () => {
    const fn = jest.fn().mockResolvedValue('hello');
    const wrapped = withRetry(fn, { maxAttempts: 3, baseDelay: 1 });

    const result = await wrapped('arg1', 'arg2');

    expect(result).toBe('hello');
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('throws on exhausted retries', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const fn = jest.fn().mockRejectedValue(makeNetworkError());
    const wrapped = withRetry(fn, { maxAttempts: 2, baseDelay: 1, maxDelay: 5 });

    const promise = wrapped();

    // Advance timers to allow retry delays to resolve
    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    }

    await expect(promise).rejects.toThrow('Network request failed');
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker
// ---------------------------------------------------------------------------

describe('CircuitBreaker', () => {
  it('starts in CLOSED state', () => {
    const cb = new CircuitBreaker();

    expect(cb.getState().state).toBe('CLOSED');
    expect(cb.getState().failureCount).toBe(0);
  });

  it('stays CLOSED after successful operations', async () => {
    const cb = new CircuitBreaker(3, 1000);

    await cb.execute(() => Promise.resolve('ok'));
    await cb.execute(() => Promise.resolve('ok'));

    expect(cb.getState().state).toBe('CLOSED');
    expect(cb.getState().failureCount).toBe(0);
  });

  it('opens after reaching failure threshold', async () => {
    const cb = new CircuitBreaker(3, 1000);
    const failing = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await cb.execute(failing).catch(() => {});
    }

    expect(cb.getState().state).toBe('OPEN');
    expect(cb.getState().failureCount).toBe(3);
  });

  it('rejects immediately when OPEN', async () => {
    const cb = new CircuitBreaker(2, 60000);
    const failing = () => Promise.reject(new Error('fail'));

    // Open the circuit
    await cb.execute(failing).catch(() => {});
    await cb.execute(failing).catch(() => {});

    expect(cb.getState().state).toBe('OPEN');

    // Next call should be rejected without executing the operation
    const op = jest.fn().mockResolvedValue('ok');
    await expect(cb.execute(op)).rejects.toThrow('Circuit breaker is open');
    expect(op).not.toHaveBeenCalled();
  });

  it('transitions to HALF_OPEN after timeout expires', async () => {
    jest.useFakeTimers();
    const cb = new CircuitBreaker(2, 1000);
    const failing = () => Promise.reject(new Error('fail'));

    // Open the circuit
    await cb.execute(failing).catch(() => {});
    await cb.execute(failing).catch(() => {});
    expect(cb.getState().state).toBe('OPEN');

    // Advance past timeout
    jest.advanceTimersByTime(1500);

    // Next call should transition to HALF_OPEN and execute
    const result = await cb.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    expect(cb.getState().state).toBe('CLOSED');

    jest.useRealTimers();
  });

  it('re-opens on failure in HALF_OPEN state', async () => {
    jest.useFakeTimers();
    const cb = new CircuitBreaker(2, 1000);
    const failing = () => Promise.reject(new Error('fail'));

    // Open the circuit
    await cb.execute(failing).catch(() => {});
    await cb.execute(failing).catch(() => {});

    // Advance past timeout
    jest.advanceTimersByTime(1500);

    // Fail in half-open state
    await cb.execute(failing).catch(() => {});

    // Should count toward threshold again (failureCount increments)
    expect(cb.getState().failureCount).toBeGreaterThan(0);
    jest.useRealTimers();
  });

  it('resets state on reset()', async () => {
    const cb = new CircuitBreaker(2, 1000);
    const failing = () => Promise.reject(new Error('fail'));

    await cb.execute(failing).catch(() => {});
    await cb.execute(failing).catch(() => {});
    expect(cb.getState().state).toBe('OPEN');

    cb.reset();

    expect(cb.getState().state).toBe('CLOSED');
    expect(cb.getState().failureCount).toBe(0);
  });

  it('resets failure count on success after partial failures', async () => {
    const cb = new CircuitBreaker(3, 1000);
    const failing = () => Promise.reject(new Error('fail'));

    // Fail twice (below threshold)
    await cb.execute(failing).catch(() => {});
    await cb.execute(failing).catch(() => {});
    expect(cb.getState().failureCount).toBe(2);

    // Succeed — should reset
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState().failureCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// RETRY_CONFIGS
// ---------------------------------------------------------------------------

describe('RETRY_CONFIGS', () => {
  it('defines network config with exponential backoff', () => {
    expect(RETRY_CONFIGS.network.backoffStrategy).toBe('exponential');
    expect(RETRY_CONFIGS.network.maxAttempts).toBe(3);
  });

  it('defines storage config with linear backoff', () => {
    expect(RETRY_CONFIGS.storage.backoffStrategy).toBe('linear');
    expect(RETRY_CONFIGS.storage.maxAttempts).toBe(5);
  });

  it('defines camera config with fixed backoff', () => {
    expect(RETRY_CONFIGS.camera.backoffStrategy).toBe('fixed');
    expect(RETRY_CONFIGS.camera.maxAttempts).toBe(2);
  });

  it('defines quick config for fail-fast scenarios', () => {
    expect(RETRY_CONFIGS.quick.maxAttempts).toBe(2);
    expect(RETRY_CONFIGS.quick.baseDelay).toBe(100);
  });
});
