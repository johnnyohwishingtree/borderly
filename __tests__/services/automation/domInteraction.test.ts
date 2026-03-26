import { DOMInteraction } from '../../../src/services/automation/interaction/domInteraction';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
function makeExecuteScript(result: Record<string, unknown> = { found: true, visible: true, enabled: true }) {
  return jest.fn().mockResolvedValue(result);
}

// ---------------------------------------------------------------------------
// constructor
// ---------------------------------------------------------------------------
describe('DOMInteraction constructor', () => {
  it('creates instance with default config', () => {
    const dom = new DOMInteraction();
    expect(dom).toBeInstanceOf(DOMInteraction);
  });

  it('merges partial config with defaults', () => {
    const dom = new DOMInteraction({ defaultTimeout: 5000 });
    expect(dom).toBeInstanceOf(DOMInteraction);
  });
});

// ---------------------------------------------------------------------------
// detectElement
// ---------------------------------------------------------------------------
describe('detectElement', () => {
  it('returns detection result from executeScript', async () => {
    const expected = { found: true, visible: true, enabled: true };
    const executeScript = makeExecuteScript(expected);
    const dom = new DOMInteraction();

    const result = await dom.detectElement('#input', executeScript);
    expect(result.found).toBe(true);
    expect(result.visible).toBe(true);
    expect(executeScript).toHaveBeenCalledTimes(1);
  });

  it('returns not-found result when executeScript throws', async () => {
    const executeScript = jest.fn().mockRejectedValue(new Error('WebView error'));
    const dom = new DOMInteraction();

    const result = await dom.detectElement('#input', executeScript);
    expect(result.found).toBe(false);
  });

  it('passes timeout option to detection script', async () => {
    const executeScript = makeExecuteScript();
    const dom = new DOMInteraction();

    await dom.detectElement('#input', executeScript, { timeout: 5000 });
    const script = executeScript.mock.calls[0][0];
    expect(script).toContain('5000');
  });
});

// ---------------------------------------------------------------------------
// clickElement
// ---------------------------------------------------------------------------
describe('clickElement', () => {
  it('returns success when element is found, visible, and click succeeds', async () => {
    const executeScript = jest.fn()
      // detectElement call
      .mockResolvedValueOnce({ found: true, visible: true, enabled: true })
      // getCurrentUrl (initial)
      .mockResolvedValueOnce('https://portal.gov/form')
      // generateClickScript
      .mockResolvedValueOnce({ success: true, elementChanged: false })
      // waitForStability
      .mockResolvedValueOnce(true)
      // getCurrentUrl (final)
      .mockResolvedValueOnce('https://portal.gov/form');

    const dom = new DOMInteraction();
    const result = await dom.clickElement('#submit-btn', executeScript);
    expect(result.success).toBe(true);
  });

  it('returns error when element is not found', async () => {
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ found: false, visible: false, enabled: false });

    const dom = new DOMInteraction();
    const result = await dom.clickElement('#missing', executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Element not found');
  });

  it('returns error when element is not visible', async () => {
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ found: true, visible: false, enabled: true });

    const dom = new DOMInteraction();
    const result = await dom.clickElement('#hidden', executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Element not visible');
  });

  it('returns error when element is not enabled and forceClick is false', async () => {
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ found: true, visible: true, enabled: false });

    const dom = new DOMInteraction();
    const result = await dom.clickElement('#disabled', executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Element not enabled');
  });

  it('handles executeScript errors gracefully', async () => {
    const executeScript = jest.fn()
      // detectElement succeeds
      .mockResolvedValueOnce({ found: true, visible: true, enabled: true })
      // getCurrentUrl succeeds
      .mockResolvedValueOnce('https://portal.gov/form')
      // click script throws
      .mockRejectedValueOnce(new Error('crash'));

    const dom = new DOMInteraction();
    const result = await dom.clickElement('#btn', executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Click interaction failed');
  });
});

// ---------------------------------------------------------------------------
// typeIntoElement
// ---------------------------------------------------------------------------
describe('typeIntoElement', () => {
  it('returns success with final value and character count', async () => {
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ found: true, visible: true, enabled: true })
      .mockResolvedValueOnce({ success: true, finalValue: 'John', charactersTyped: 4 });

    const dom = new DOMInteraction();
    const result = await dom.typeIntoElement('#name', 'John', executeScript);
    expect(result.success).toBe(true);
    expect(result.finalValue).toBe('John');
    expect(result.charactersTyped).toBe(4);
  });

  it('returns error when element not found', async () => {
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ found: false, visible: false, enabled: false });

    const dom = new DOMInteraction();
    const result = await dom.typeIntoElement('#missing', 'text', executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Element not found');
  });

  it('handles executeScript errors gracefully', async () => {
    const executeScript = jest.fn()
      // detectElement succeeds
      .mockResolvedValueOnce({ found: true, visible: true, enabled: true })
      // type script throws
      .mockRejectedValueOnce(new Error('crash'));

    const dom = new DOMInteraction();
    const result = await dom.typeIntoElement('#input', 'text', executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Type interaction failed');
  });
});

// ---------------------------------------------------------------------------
// selectOption
// ---------------------------------------------------------------------------
describe('selectOption', () => {
  it('returns success with selected value', async () => {
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ success: true, selectedValue: 'US', selectedText: 'United States' });

    const dom = new DOMInteraction();
    const result = await dom.selectOption('#country', 'US', executeScript);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ selectedValue: 'US', selectedText: 'United States' });
  });

  it('returns available options on failure', async () => {
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ success: false, error: 'No matching option', availableOptions: [{ text: 'JP', value: 'JP' }] });

    const dom = new DOMInteraction();
    const result = await dom.selectOption('#country', 'ZZ', executeScript);
    expect(result.success).toBe(false);
    expect(result.data).toEqual({ availableOptions: [{ text: 'JP', value: 'JP' }] });
  });

  it('handles script execution error', async () => {
    const executeScript = jest.fn().mockRejectedValue(new Error('boom'));

    const dom = new DOMInteraction();
    const result = await dom.selectOption('#country', 'US', executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Select interaction failed');
  });
});

// ---------------------------------------------------------------------------
// toggleCheckbox
// ---------------------------------------------------------------------------
describe('toggleCheckbox', () => {
  it('returns success with checked state', async () => {
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ success: true, checked: true, value: 'on' });

    const dom = new DOMInteraction();
    const result = await dom.toggleCheckbox('#agree', true, executeScript);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ checked: true, value: 'on' });
  });

  it('handles script execution error', async () => {
    const executeScript = jest.fn().mockRejectedValue(new Error('boom'));

    const dom = new DOMInteraction();
    const result = await dom.toggleCheckbox('#agree', true, executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Checkbox toggle failed');
  });
});

// ---------------------------------------------------------------------------
// waitForElement
// ---------------------------------------------------------------------------
describe('waitForElement', () => {
  it('returns success when condition is met', async () => {
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ success: true, conditionMet: 'appear' });

    const dom = new DOMInteraction();
    const result = await dom.waitForElement('#loading', 'appear', executeScript);
    expect(result.success).toBe(true);
  });

  it('handles script execution error', async () => {
    const executeScript = jest.fn().mockRejectedValue(new Error('timeout'));

    const dom = new DOMInteraction();
    const result = await dom.waitForElement('#el', 'appear', executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Wait for element failed');
  });
});

// ---------------------------------------------------------------------------
// extractElementData
// ---------------------------------------------------------------------------
describe('extractElementData', () => {
  it('returns extracted text data', async () => {
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ success: true, data: 'Hello', dataType: 'text', selector: '#el' });

    const dom = new DOMInteraction();
    const result = await dom.extractElementData('#el', 'text', executeScript);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ extractedData: 'Hello', dataType: 'text', selector: '#el' });
  });

  it('handles script execution error', async () => {
    const executeScript = jest.fn().mockRejectedValue(new Error('nope'));

    const dom = new DOMInteraction();
    const result = await dom.extractElementData('#el', 'text', executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Data extraction failed');
  });
});

// ---------------------------------------------------------------------------
// scrollTo
// ---------------------------------------------------------------------------
describe('scrollTo', () => {
  it('scrolls to element selector', async () => {
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ success: true, scrolledTo: 'element' });

    const dom = new DOMInteraction();
    const result = await dom.scrollTo('#section', executeScript);
    expect(result.success).toBe(true);
  });

  it('scrolls to coordinates', async () => {
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ success: true, scrolledTo: 'coordinates', x: 0, y: 500 });

    const dom = new DOMInteraction();
    const result = await dom.scrollTo({ x: 0, y: 500 }, executeScript);
    expect(result.success).toBe(true);
  });

  it('handles script execution error', async () => {
    const executeScript = jest.fn().mockRejectedValue(new Error('fail'));

    const dom = new DOMInteraction();
    const result = await dom.scrollTo('#el', executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Scroll operation failed');
  });
});
