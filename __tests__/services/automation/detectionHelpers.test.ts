import {
  meetsCondition,
  calculateNextDelay,
  generateCacheKey,
  escapeSelector,
  buildDetectionScript,
  buildFormReadinessScript,
  buildStabilityScript,
  captureFailureScreenshot,
} from '../../../src/services/automation/detection/detectionHelpers';

import type {
  DetectionCriteria,
  PollingStrategy,
} from '../../../src/services/automation/detection/detectionTypes';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
function makeCriteria(overrides?: Partial<DetectionCriteria>): DetectionCriteria {
  return {
    selector: '#test',
    condition: 'present',
    ...overrides,
  };
}

function makeCheckResult(overrides?: Record<string, unknown>) {
  return {
    success: true,
    element: {
      isVisible: true,
      isEnabled: true,
      isClickable: true,
    },
    stability: { isStable: true, changeCount: 0 },
    ...overrides,
  };
}

function makeStrategy(overrides?: Partial<PollingStrategy>): PollingStrategy {
  return {
    type: 'fixed',
    initialDelay: 100,
    maxDelay: 5000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// meetsCondition
// ---------------------------------------------------------------------------
describe('meetsCondition', () => {
  it('returns true for "present" when element exists', () => {
    expect(meetsCondition(makeCheckResult(), makeCriteria({ condition: 'present' }))).toBe(true);
  });

  it('returns true for "absent" when element is missing', () => {
    const result = makeCheckResult({ success: false, element: null });
    expect(meetsCondition(result, makeCriteria({ condition: 'absent' }))).toBe(true);
  });

  it('returns false for "absent" when element exists', () => {
    expect(meetsCondition(makeCheckResult(), makeCriteria({ condition: 'absent' }))).toBe(false);
  });

  it('returns true for "visible" when element is visible', () => {
    expect(meetsCondition(makeCheckResult(), makeCriteria({ condition: 'visible' }))).toBe(true);
  });

  it('returns true for "hidden" when element is not visible', () => {
    const result = makeCheckResult({ element: { isVisible: false, isEnabled: true, isClickable: false } });
    expect(meetsCondition(result, makeCriteria({ condition: 'hidden' }))).toBe(true);
  });

  it('returns true for "enabled" when element is enabled', () => {
    expect(meetsCondition(makeCheckResult(), makeCriteria({ condition: 'enabled' }))).toBe(true);
  });

  it('returns true for "disabled" when element is not enabled', () => {
    const result = makeCheckResult({ element: { isVisible: true, isEnabled: false, isClickable: false } });
    expect(meetsCondition(result, makeCriteria({ condition: 'disabled' }))).toBe(true);
  });

  it('returns true for "clickable" when element is clickable', () => {
    expect(meetsCondition(makeCheckResult(), makeCriteria({ condition: 'clickable' }))).toBe(true);
  });

  it('returns true for "stable" when stability.isStable is true', () => {
    expect(meetsCondition(makeCheckResult(), makeCriteria({ condition: 'stable' }))).toBe(true);
  });

  it('returns false for unknown condition', () => {
    expect(meetsCondition(makeCheckResult(), makeCriteria({ condition: 'unknown' as 'present' }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calculateNextDelay
// ---------------------------------------------------------------------------
describe('calculateNextDelay', () => {
  it('returns initialDelay for fixed strategy', () => {
    const strategy = makeStrategy({ type: 'fixed', initialDelay: 200 });
    expect(calculateNextDelay(strategy, 200, 3)).toBe(200);
  });

  it('doubles delay for exponential strategy (default multiplier)', () => {
    const strategy = makeStrategy({ type: 'exponential', maxDelay: 10000 });
    expect(calculateNextDelay(strategy, 100, 2)).toBe(200);
  });

  it('caps exponential delay at maxDelay', () => {
    const strategy = makeStrategy({ type: 'exponential', maxDelay: 150 });
    expect(calculateNextDelay(strategy, 100, 2)).toBe(150);
  });

  it('uses custom multiplier for exponential strategy', () => {
    const strategy = makeStrategy({ type: 'exponential', multiplier: 3, maxDelay: 10000 });
    expect(calculateNextDelay(strategy, 100, 2)).toBe(300);
  });

  it('applies fibonacci ratio for fibonacci strategy', () => {
    const strategy = makeStrategy({ type: 'fibonacci', maxDelay: 10000 });
    const result = calculateNextDelay(strategy, 100, 2);
    expect(result).toBeCloseTo(161.8, 0);
  });

  it('caps fibonacci delay at maxDelay', () => {
    const strategy = makeStrategy({ type: 'fibonacci', maxDelay: 120 });
    expect(calculateNextDelay(strategy, 100, 2)).toBe(120);
  });

  it('uses adaptive backoff based on attempt number', () => {
    const strategy = makeStrategy({ type: 'adaptive', initialDelay: 100, backoffFactor: 1.5, maxDelay: 10000 });
    // attempt 2: 100 * 1.5^(2-1) = 150
    expect(calculateNextDelay(strategy, 100, 2)).toBe(150);
  });

  it('returns initialDelay for unknown strategy type', () => {
    const strategy = makeStrategy({ type: 'unknown' as 'fixed', initialDelay: 300 });
    expect(calculateNextDelay(strategy, 100, 1)).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// generateCacheKey
// ---------------------------------------------------------------------------
describe('generateCacheKey', () => {
  it('creates deterministic key from criteria', () => {
    const criteria = makeCriteria({ selector: '#btn', condition: 'visible' });
    const key = generateCacheKey(criteria);
    expect(key).toContain('#btn');
    expect(key).toContain('visible');
  });

  it('includes attributes in key', () => {
    const criteria = makeCriteria({ attributes: { role: 'button' } });
    const key = generateCacheKey(criteria);
    expect(key).toContain('role');
    expect(key).toContain('button');
  });

  it('produces same key for same criteria', () => {
    const c1 = makeCriteria({ selector: '#x', condition: 'present' });
    const c2 = makeCriteria({ selector: '#x', condition: 'present' });
    expect(generateCacheKey(c1)).toBe(generateCacheKey(c2));
  });

  it('produces different keys for different criteria', () => {
    const c1 = makeCriteria({ selector: '#a' });
    const c2 = makeCriteria({ selector: '#b' });
    expect(generateCacheKey(c1)).not.toBe(generateCacheKey(c2));
  });
});

// ---------------------------------------------------------------------------
// escapeSelector
// ---------------------------------------------------------------------------
describe('escapeSelector', () => {
  it('escapes single quotes', () => {
    expect(escapeSelector("it's")).toBe("it\\'s");
  });

  it('escapes double quotes', () => {
    expect(escapeSelector('say "hi"')).toBe('say \\"hi\\"');
  });

  it('leaves plain selectors unchanged', () => {
    expect(escapeSelector('#my-id')).toBe('#my-id');
  });
});

// ---------------------------------------------------------------------------
// buildDetectionScript
// ---------------------------------------------------------------------------
describe('buildDetectionScript', () => {
  it('generates script with escaped selector', () => {
    const script = buildDetectionScript(makeCriteria({ selector: '#test-btn' }));
    expect(script).toContain('#test-btn');
    expect(script).toContain('document.querySelector');
  });

  it('includes textContent check when criteria has textContent', () => {
    const script = buildDetectionScript(makeCriteria({ textContent: 'Submit' }));
    expect(script).toContain('Submit');
    expect(script).toContain('textContent');
  });

  it('includes valueContent check when criteria has valueContent', () => {
    const script = buildDetectionScript(makeCriteria({ valueContent: 'hello' }));
    expect(script).toContain('hello');
    expect(script).toContain('value');
  });

  it('includes custom validator when provided', () => {
    const script = buildDetectionScript(makeCriteria({ customValidator: 'return true;' }));
    expect(script).toContain('return true;');
    expect(script).toContain('Custom validation failed');
  });

  it('returns element info with computed style', () => {
    const script = buildDetectionScript(makeCriteria());
    expect(script).toContain('computedStyle');
    expect(script).toContain('getBoundingClientRect');
  });
});

// ---------------------------------------------------------------------------
// buildFormReadinessScript
// ---------------------------------------------------------------------------
describe('buildFormReadinessScript', () => {
  it('generates script checking form visibility and loading indicators', () => {
    const script = buildFormReadinessScript('#myForm', ['#field1', '#field2'], 'smooth');
    expect(script).toContain('#myForm');
    expect(script).toContain('#field1');
    expect(script).toContain('#field2');
    expect(script).toContain('.loading');
    expect(script).toContain('formReady');
  });

  it('handles empty required fields array', () => {
    const script = buildFormReadinessScript('#form', [], 'auto');
    expect(script).toContain('#form');
    expect(script).toContain('allFieldsReady');
  });
});

// ---------------------------------------------------------------------------
// buildStabilityScript
// ---------------------------------------------------------------------------
describe('buildStabilityScript', () => {
  it('generates script with selector, duration, and max wait', () => {
    const script = buildStabilityScript('#content', 2000, 10000);
    expect(script).toContain('#content');
    expect(script).toContain('2000');
    expect(script).toContain('10000');
    expect(script).toContain('stabilityDuration');
  });

  it('includes mutation tracking logic', () => {
    const script = buildStabilityScript('.target', 500, 5000);
    expect(script).toContain('changeCount');
    expect(script).toContain('previousContent');
  });
});

// ---------------------------------------------------------------------------
// captureFailureScreenshot
// ---------------------------------------------------------------------------
describe('captureFailureScreenshot', () => {
  it('returns screenshot data from executeScript', async () => {
    const executeScript = jest.fn().mockResolvedValue('data:image/png;base64,abc');
    const result = await captureFailureScreenshot(executeScript);
    expect(result).toBe('data:image/png;base64,abc');
  });

  it('returns empty string when executeScript throws', async () => {
    const executeScript = jest.fn().mockRejectedValue(new Error('no webview'));
    const result = await captureFailureScreenshot(executeScript);
    expect(result).toBe('');
  });

  it('returns empty string when executeScript returns falsy', async () => {
    const executeScript = jest.fn().mockResolvedValue('');
    const result = await captureFailureScreenshot(executeScript);
    expect(result).toBe('');
  });
});
