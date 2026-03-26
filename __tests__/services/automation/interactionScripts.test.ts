import {
  generateClickScript,
  generateTypeScript,
  generateSelectScript,
  generateToggleScript,
  generateWaitScript,
  generateExtractScript,
  generateScrollScript,
  generateStabilityScript,
} from '../../../src/services/automation/interaction/interactionScripts';

import type { DOMInteractionConfig } from '../../../src/services/automation/interaction/interactionTypes';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
function makeConfig(overrides?: Partial<DOMInteractionConfig>): DOMInteractionConfig {
  return {
    defaultTimeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
    scrollBehavior: 'smooth',
    clickDelay: 100,
    typeDelay: 50,
    validateInteractions: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// generateClickScript
// ---------------------------------------------------------------------------
describe('generateClickScript', () => {
  it('generates script containing the selector', () => {
    const script = generateClickScript('#btn', {}, makeConfig());
    expect(script).toContain('#btn');
    expect(script).toContain('MouseEvent');
    expect(script).toContain('click');
  });

  it('includes scrollIntoView by default', () => {
    const script = generateClickScript('#btn', {}, makeConfig());
    expect(script).toContain('scrollIntoView');
  });

  it('omits scrollIntoView when disabled', () => {
    const script = generateClickScript('#btn', { scrollIntoView: false }, makeConfig());
    // The template condition should not include scrollIntoView
    expect(script).not.toContain('scrollIntoView');
  });

  it('uses config click delay', () => {
    const script = generateClickScript('#btn', {}, makeConfig({ clickDelay: 200 }));
    expect(script).toContain('200');
  });
});

// ---------------------------------------------------------------------------
// generateTypeScript
// ---------------------------------------------------------------------------
describe('generateTypeScript', () => {
  it('generates script with selector and text', () => {
    const script = generateTypeScript('#input', 'hello', {}, makeConfig());
    expect(script).toContain('#input');
    expect(script).toContain('hello');
    expect(script).toContain('keydown');
    expect(script).toContain('keyup');
  });

  it('escapes single quotes in text', () => {
    const script = generateTypeScript('#input', "it's", {}, makeConfig());
    expect(script).toContain("it\\'s");
  });

  it('uses config type delay', () => {
    const script = generateTypeScript('#input', 'x', {}, makeConfig({ typeDelay: 100 }));
    expect(script).toContain('100');
  });
});

// ---------------------------------------------------------------------------
// generateSelectScript
// ---------------------------------------------------------------------------
describe('generateSelectScript', () => {
  it('generates script with selector and option value', () => {
    const script = generateSelectScript('#country', 'US', true, 'smooth');
    expect(script).toContain('#country');
    expect(script).toContain('US');
    expect(script).toContain('change');
  });

  it('includes scrollIntoView when enabled', () => {
    const script = generateSelectScript('#sel', 'val', true, 'smooth');
    expect(script).toContain('scrollIntoView');
  });

  it('handles option not found case', () => {
    const script = generateSelectScript('#sel', 'ZZ', true, 'smooth');
    expect(script).toContain('No matching option found');
    expect(script).toContain('availableOptions');
  });
});

// ---------------------------------------------------------------------------
// generateToggleScript
// ---------------------------------------------------------------------------
describe('generateToggleScript', () => {
  it('generates script to check a checkbox', () => {
    const script = generateToggleScript('#agree', true, true, 'smooth');
    expect(script).toContain('#agree');
    expect(script).toContain('true');
    expect(script).toContain('change');
  });

  it('generates script to uncheck a checkbox', () => {
    const script = generateToggleScript('#agree', false, true, 'smooth');
    expect(script).toContain('false');
  });

  it('handles element not found', () => {
    const script = generateToggleScript('#missing', true, false, 'auto');
    expect(script).toContain('Checkbox/radio element not found');
  });
});

// ---------------------------------------------------------------------------
// generateWaitScript
// ---------------------------------------------------------------------------
describe('generateWaitScript', () => {
  it('generates script for appear condition', () => {
    const script = generateWaitScript('#loader', 'appear', 5000);
    expect(script).toContain('#loader');
    expect(script).toContain('appear');
    expect(script).toContain('5000');
  });

  it('generates script for disappear condition', () => {
    const script = generateWaitScript('#spinner', 'disappear', 10000);
    expect(script).toContain('disappear');
    expect(script).toContain('element === null');
  });

  it('includes timeout error handling', () => {
    const script = generateWaitScript('#el', 'visible', 3000);
    expect(script).toContain('Timeout waiting for condition');
  });
});

// ---------------------------------------------------------------------------
// generateExtractScript
// ---------------------------------------------------------------------------
describe('generateExtractScript', () => {
  it('generates script for text extraction', () => {
    const script = generateExtractScript('#el', 'text');
    expect(script).toContain('#el');
    expect(script).toContain('textContent');
  });

  it('generates script for value extraction', () => {
    const script = generateExtractScript('#input', 'value');
    expect(script).toContain('element.value');
  });

  it('generates script for html extraction', () => {
    const script = generateExtractScript('#el', 'html');
    expect(script).toContain('innerHTML');
  });

  it('generates script for attribute extraction', () => {
    const script = generateExtractScript('#el', 'attribute', 'data-id');
    expect(script).toContain('getAttribute');
    expect(script).toContain('data-id');
  });

  it('handles element not found', () => {
    const script = generateExtractScript('#missing', 'text');
    expect(script).toContain('Element not found for data extraction');
  });
});

// ---------------------------------------------------------------------------
// generateScrollScript
// ---------------------------------------------------------------------------
describe('generateScrollScript', () => {
  it('generates script for element scroll target', () => {
    const script = generateScrollScript('#section', 'smooth');
    expect(script).toContain('#section');
    expect(script).toContain('scrollIntoView');
    expect(script).toContain('smooth');
  });

  it('generates script for coordinate scroll target', () => {
    const script = generateScrollScript({ x: 0, y: 500 }, 'instant');
    expect(script).toContain('window.scrollTo');
    expect(script).toContain('500');
    expect(script).toContain('instant');
  });

  it('handles element not found for scroll', () => {
    const script = generateScrollScript('#missing', 'smooth');
    expect(script).toContain('Element not found for scrolling');
  });
});

// ---------------------------------------------------------------------------
// generateStabilityScript
// ---------------------------------------------------------------------------
describe('generateStabilityScript', () => {
  it('generates script with timeout value', () => {
    const script = generateStabilityScript(5000);
    expect(script).toContain('5000');
    expect(script).toContain('stableTime');
  });

  it('checks URL and title for stability', () => {
    const script = generateStabilityScript(3000);
    expect(script).toContain('location.href');
    expect(script).toContain('document.title');
  });
});
