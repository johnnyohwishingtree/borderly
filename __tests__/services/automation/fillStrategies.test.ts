import { createDefaultFillStrategies } from '../../../src/services/automation/filler/fillStrategies';
import type { PortalFieldMapping } from '../../../src/types/submission';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
function makeMockMapping(): PortalFieldMapping {
  return {
    fieldId: 'firstName',
    selector: '#first-name',
    inputType: 'text',
  };
}

// ---------------------------------------------------------------------------
// createDefaultFillStrategies
// ---------------------------------------------------------------------------
describe('createDefaultFillStrategies', () => {
  it('returns a Map with strategies for common input types', () => {
    const strategies = createDefaultFillStrategies();
    expect(strategies).toBeInstanceOf(Map);
    expect(strategies.has('text')).toBe(true);
    expect(strategies.has('select')).toBe(true);
    expect(strategies.has('radio')).toBe(true);
    expect(strategies.has('checkbox')).toBe(true);
    expect(strategies.has('date')).toBe(true);
    expect(strategies.has('file')).toBe(true);
  });

  it('has 6 strategies total', () => {
    const strategies = createDefaultFillStrategies();
    expect(strategies.size).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// text strategy
// ---------------------------------------------------------------------------
describe('text strategy', () => {
  it('generates script that sets value and dispatches input/change events', () => {
    const strategies = createDefaultFillStrategies();
    const textStrategy = strategies.get('text')!;
    expect(textStrategy.inputType).toBe('text');

    const script = textStrategy.fillMethod('el', '"John"', makeMockMapping());
    expect(script).toContain('el.value');
    expect(script).toContain('input');
    expect(script).toContain('change');
    expect(script).toContain('blur');
  });
});

// ---------------------------------------------------------------------------
// select strategy
// ---------------------------------------------------------------------------
describe('select strategy', () => {
  it('generates script that sets value with fallback to text matching', () => {
    const strategies = createDefaultFillStrategies();
    const selectStrategy = strategies.get('select')!;
    expect(selectStrategy.inputType).toBe('select');

    const script = selectStrategy.fillMethod('el', '"US"', makeMockMapping());
    expect(script).toContain('el.value');
    expect(script).toContain('options');
    expect(script).toContain('toLowerCase');
    expect(script).toContain('change');
  });
});

// ---------------------------------------------------------------------------
// radio strategy
// ---------------------------------------------------------------------------
describe('radio strategy', () => {
  it('generates script that finds radio group by name and checks matching', () => {
    const strategies = createDefaultFillStrategies();
    const radioStrategy = strategies.get('radio')!;
    expect(radioStrategy.inputType).toBe('radio');

    const script = radioStrategy.fillMethod('"#gender"', '"male"', makeMockMapping());
    expect(script).toContain('radio');
    expect(script).toContain('checked = true');
    expect(script).toContain('change');
  });
});

// ---------------------------------------------------------------------------
// checkbox strategy
// ---------------------------------------------------------------------------
describe('checkbox strategy', () => {
  it('generates script that sets checked state', () => {
    const strategies = createDefaultFillStrategies();
    const checkboxStrategy = strategies.get('checkbox')!;
    expect(checkboxStrategy.inputType).toBe('checkbox');

    const script = checkboxStrategy.fillMethod('el', 'true', makeMockMapping());
    expect(script).toContain('checked');
    expect(script).toContain('change');
  });
});

// ---------------------------------------------------------------------------
// date strategy
// ---------------------------------------------------------------------------
describe('date strategy', () => {
  it('generates script that sets date value with events', () => {
    const strategies = createDefaultFillStrategies();
    const dateStrategy = strategies.get('date')!;
    expect(dateStrategy.inputType).toBe('date');

    const script = dateStrategy.fillMethod('el', '"2024-01-15"', makeMockMapping());
    expect(script).toContain('el.value');
    expect(script).toContain('input');
    expect(script).toContain('change');
  });
});

// ---------------------------------------------------------------------------
// file strategy
// ---------------------------------------------------------------------------
describe('file strategy', () => {
  it('generates script that logs file upload', () => {
    const strategies = createDefaultFillStrategies();
    const fileStrategy = strategies.get('file')!;
    expect(fileStrategy.inputType).toBe('file');

    const script = fileStrategy.fillMethod('el', '"file.pdf"', makeMockMapping());
    expect(script).toContain('console.log');
  });
});
