import { ElementUtils } from '../../../src/services/automation/elementUtils';

// ---------------------------------------------------------------------------
// generateReadinessCheck
// ---------------------------------------------------------------------------
describe('generateReadinessCheck', () => {
  it('returns JavaScript string containing the selector', () => {
    const script = ElementUtils.generateReadinessCheck('#my-input');
    expect(script).toContain('#my-input');
    expect(script).toContain('document.querySelector');
  });

  it('returns IIFE that checks visibility, enabled, and interactable', () => {
    const script = ElementUtils.generateReadinessCheck('.btn');
    expect(script).toContain('isVisible');
    expect(script).toContain('isEnabled');
    expect(script).toContain('isInteractable');
  });

  it('handles selectors with special characters via JSON.stringify', () => {
    const script = ElementUtils.generateReadinessCheck('input[name="foo"]');
    expect(script).toContain('input[name=\\"foo\\"]');
  });

  it('includes not-found fallback', () => {
    const script = ElementUtils.generateReadinessCheck('#nonexistent');
    expect(script).toContain('Element not found');
  });
});

// ---------------------------------------------------------------------------
// generateHumanLikeInteraction
// ---------------------------------------------------------------------------
describe('generateHumanLikeInteraction', () => {
  it('generates click interaction with mouse events', () => {
    const script = ElementUtils.generateHumanLikeInteraction('click', '#btn');
    expect(script).toContain('mousedown');
    expect(script).toContain('mouseup');
    expect(script).toContain('click');
    expect(script).toContain('scrollIntoView');
  });

  it('generates focus interaction with focus events', () => {
    const script = ElementUtils.generateHumanLikeInteraction('focus', '#input');
    expect(script).toContain('focusin');
    expect(script).toContain('.focus()');
  });

  it('generates hover interaction with mouse enter/over', () => {
    const script = ElementUtils.generateHumanLikeInteraction('hover', '.menu');
    expect(script).toContain('mouseenter');
    expect(script).toContain('mouseover');
  });

  it('throws for missing element in generated script', () => {
    const script = ElementUtils.generateHumanLikeInteraction('click', '#btn');
    expect(script).toContain("throw new Error('Element not found')");
  });
});

// ---------------------------------------------------------------------------
// generateFieldDetection
// ---------------------------------------------------------------------------
describe('generateFieldDetection', () => {
  it('includes name matching strategy when name provided', () => {
    const script = ElementUtils.generateFieldDetection({ name: 'passport' });
    expect(script).toContain('passport');
    expect(script).toContain('name_match');
  });

  it('includes placeholder matching strategy when placeholder provided', () => {
    const script = ElementUtils.generateFieldDetection({ placeholder: 'Enter name' });
    expect(script).toContain('Enter name');
    expect(script).toContain('placeholder_match');
  });

  it('includes label matching strategy when labelText provided', () => {
    const script = ElementUtils.generateFieldDetection({ labelText: 'First Name' });
    expect(script).toContain('first name');
    expect(script).toContain('label_for');
  });

  it('includes nearby text strategy when nearbyText provided', () => {
    const script = ElementUtils.generateFieldDetection({ nearbyText: 'Passport Number' });
    expect(script).toContain('passport number');
    expect(script).toContain('nearby_text');
  });

  it('returns IIFE with results sorted by confidence', () => {
    const script = ElementUtils.generateFieldDetection({ name: 'foo' });
    expect(script).toContain('sort');
    expect(script).toContain('confidence');
  });

  it('generates valid script with no criteria', () => {
    const script = ElementUtils.generateFieldDetection({});
    expect(script).toContain('results');
    expect(typeof script).toBe('string');
  });
});
