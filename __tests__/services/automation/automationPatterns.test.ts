import { AutomationPatterns } from '../../../src/services/automation/automationPatterns';

// ---------------------------------------------------------------------------
// waitForConditions
// ---------------------------------------------------------------------------
describe('waitForConditions', () => {
  it('resolves when all conditions are met (mode: all)', async () => {
    const conditions = [
      jest.fn().mockResolvedValue(true),
      jest.fn().mockResolvedValue(true),
    ];

    const result = await AutomationPatterns.waitForConditions(conditions, 'all', 5000, 10);
    expect(result.success).toBe(true);
    expect(result.metConditions).toEqual([true, true]);
  });

  it('resolves when any condition is met (mode: any)', async () => {
    const conditions = [
      jest.fn().mockResolvedValue(false),
      jest.fn().mockResolvedValue(true),
    ];

    const result = await AutomationPatterns.waitForConditions(conditions, 'any', 5000, 10);
    expect(result.success).toBe(true);
    expect(result.metConditions).toEqual([false, true]);
  });

  it('times out when conditions are never met', async () => {
    const conditions = [jest.fn().mockResolvedValue(false)];

    const result = await AutomationPatterns.waitForConditions(conditions, 'all', 100, 10);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Timeout');
  });

  it('treats condition check exceptions as false', async () => {
    const conditions = [
      jest.fn().mockRejectedValue(new Error('oops')),
      jest.fn().mockResolvedValue(true),
    ];

    const result = await AutomationPatterns.waitForConditions(conditions, 'any', 5000, 10);
    expect(result.success).toBe(true);
    expect(result.metConditions[0]).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createCircuitBreaker
// ---------------------------------------------------------------------------
describe('createCircuitBreaker', () => {
  it('passes through successful operations', async () => {
    const op = jest.fn().mockResolvedValue('ok');
    const breaker = AutomationPatterns.createCircuitBreaker(op, {
      failureThreshold: 3,
      resetTimeout: 100,
      monitoringWindow: 1000,
    });
    const result = await breaker();
    expect(result).toBe('ok');
  });

  it('opens circuit after reaching failure threshold', async () => {
    const op = jest.fn().mockRejectedValue(new Error('fail'));
    const breaker = AutomationPatterns.createCircuitBreaker(op, {
      failureThreshold: 2,
      resetTimeout: 60000,
      monitoringWindow: 300000,
    });

    // Two failures to open the circuit
    await expect(breaker()).rejects.toThrow('fail');
    await expect(breaker()).rejects.toThrow('fail');
    // Now circuit is open
    await expect(breaker()).rejects.toThrow('Circuit breaker is open');
  });

  it('allows half-open retry after reset timeout', async () => {
    jest.useFakeTimers();
    const op = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('recovered');

    const breaker = AutomationPatterns.createCircuitBreaker(op, {
      failureThreshold: 2,
      resetTimeout: 100,
      monitoringWindow: 300000,
    });

    await expect(breaker()).rejects.toThrow('fail');
    await expect(breaker()).rejects.toThrow('fail');

    // Advance time past resetTimeout
    jest.advanceTimersByTime(150);

    const result = await breaker();
    expect(result).toBe('recovered');
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// createRateLimiter
// ---------------------------------------------------------------------------
describe('createRateLimiter', () => {
  it('executes operations within rate limit', async () => {
    const limiter = AutomationPatterns.createRateLimiter(5, 1000);
    const op = jest.fn().mockResolvedValue('done');

    const result = await limiter(op);
    expect(result).toBe('done');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('executes multiple operations within window', async () => {
    const limiter = AutomationPatterns.createRateLimiter(3, 1000);
    const results: string[] = [];

    for (let i = 0; i < 3; i++) {
      results.push(await limiter(() => Promise.resolve(`op${i}`)));
    }

    expect(results).toEqual(['op0', 'op1', 'op2']);
  });
});
