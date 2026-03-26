import { SelectorBuilder } from '../../../src/services/automation/selectorBuilder';

// ---------------------------------------------------------------------------
// buildSelector
// ---------------------------------------------------------------------------
describe('buildSelector', () => {
  it('builds ID selector', () => {
    const result = SelectorBuilder.buildSelector({ id: 'my-input' });
    expect(result).toBe('#my-input');
  });

  it('builds class selector from space-separated classes', () => {
    const result = SelectorBuilder.buildSelector({ className: 'btn primary' });
    expect(result).toBe('.btn.primary');
  });

  it('builds tag selector with attributes', () => {
    const result = SelectorBuilder.buildSelector({
      tagName: 'input',
      attributes: { type: 'text', name: 'email' },
    });
    expect(result).toContain('input');
    expect(result).toContain('[type="text"]');
    expect(result).toContain('[name="email"]');
  });

  it('combines multiple selectors with comma', () => {
    const result = SelectorBuilder.buildSelector({ id: 'foo', className: 'bar' });
    expect(result).toBe('#foo, .bar');
  });

  it('prepends parent context to all selectors', () => {
    const result = SelectorBuilder.buildSelector({ id: 'foo', className: 'bar', parent: '.form' });
    expect(result).toBe('.form #foo, .form .bar');
  });

  it('appends nth-child when index provided', () => {
    const result = SelectorBuilder.buildSelector({ tagName: 'li', index: 3 });
    expect(result).toBe('li:nth-child(3)');
  });

  it('builds text content selector', () => {
    const result = SelectorBuilder.buildSelector({ text: 'Submit' });
    expect(result).toContain(':contains("Submit")');
  });

  it('handles empty className gracefully', () => {
    const result = SelectorBuilder.buildSelector({ className: '   ' });
    expect(result).toBe('');
  });
});

// ---------------------------------------------------------------------------
// buildFormFieldSelector
// ---------------------------------------------------------------------------
describe('buildFormFieldSelector', () => {
  it('generates input/select/textarea selectors by name', () => {
    const result = SelectorBuilder.buildFormFieldSelector({ name: 'passport_number' });
    expect(result).toContain('input[name="passport_number"]');
    expect(result).toContain('select[name="passport_number"]');
    expect(result).toContain('textarea[name="passport_number"]');
  });

  it('generates ID selector', () => {
    const result = SelectorBuilder.buildFormFieldSelector({ id: 'email-field' });
    expect(result).toContain('#email-field');
  });

  it('generates label-associated selectors', () => {
    const result = SelectorBuilder.buildFormFieldSelector({ label: 'Email Address' });
    expect(result).toContain('label:contains("Email Address") input');
    expect(result).toContain('label:contains("Email Address") select');
  });

  it('generates type + placeholder selector', () => {
    const result = SelectorBuilder.buildFormFieldSelector({
      type: 'text',
      placeholder: 'Enter email',
    });
    expect(result).toContain('input[type="text"][placeholder*="Enter email"]');
  });

  it('returns empty string when no criteria provided', () => {
    expect(SelectorBuilder.buildFormFieldSelector({})).toBe('');
  });
});

// ---------------------------------------------------------------------------
// escape
// ---------------------------------------------------------------------------
describe('escape', () => {
  it('escapes special CSS characters', () => {
    const result = SelectorBuilder.escape('my#id.class');
    expect(result).toContain('\\#');
    expect(result).toContain('\\.');
  });

  it('leaves alphanumeric characters unchanged', () => {
    expect(SelectorBuilder.escape('simpleId')).toBe('simpleId');
  });
});
