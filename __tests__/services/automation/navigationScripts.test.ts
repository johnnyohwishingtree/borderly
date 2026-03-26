import {
  generateNavigationScript,
  generateHistoryScript,
  generatePageLoadScript,
} from '../../../src/services/automation/navigation/navigationScripts';

// ---------------------------------------------------------------------------
// generateNavigationScript
// ---------------------------------------------------------------------------
describe('generateNavigationScript', () => {
  it('generates script containing the target URL', () => {
    const script = generateNavigationScript('https://portal.gov/step2', 10000);
    expect(script).toContain('https://portal.gov/step2');
    expect(script).toContain('window.location.href');
  });

  it('includes timeout value', () => {
    const script = generateNavigationScript('https://example.com', 5000);
    expect(script).toContain('5000');
  });

  it('tracks previous and current URLs', () => {
    const script = generateNavigationScript('https://example.com', 3000);
    expect(script).toContain('previousUrl');
    expect(script).toContain('currentUrl');
  });

  it('includes duration tracking', () => {
    const script = generateNavigationScript('https://example.com', 3000);
    expect(script).toContain('duration');
    expect(script).toContain('Date.now()');
  });
});

// ---------------------------------------------------------------------------
// generateHistoryScript
// ---------------------------------------------------------------------------
describe('generateHistoryScript', () => {
  it('generates back navigation script', () => {
    const script = generateHistoryScript('back');
    expect(script).toContain('window.history.back()');
    expect(script).toContain('previousUrl');
    expect(script).toContain('currentUrl');
  });

  it('generates forward navigation script', () => {
    const script = generateHistoryScript('forward');
    expect(script).toContain('window.history.forward()');
  });

  it('returns promise-based result', () => {
    const script = generateHistoryScript('back');
    expect(script).toContain('Promise');
    expect(script).toContain('resolve');
  });
});

// ---------------------------------------------------------------------------
// generatePageLoadScript
// ---------------------------------------------------------------------------
describe('generatePageLoadScript', () => {
  it('generates script with timeout value', () => {
    const script = generatePageLoadScript(15000);
    expect(script).toContain('15000');
  });

  it('checks document readyState', () => {
    const script = generatePageLoadScript(5000);
    expect(script).toContain('document.readyState');
    expect(script).toContain("'complete'");
  });

  it('includes load time tracking', () => {
    const script = generatePageLoadScript(5000);
    expect(script).toContain('loadTime');
  });

  it('handles timeout with error message', () => {
    const script = generatePageLoadScript(5000);
    expect(script).toContain('Page load timeout');
  });
});
