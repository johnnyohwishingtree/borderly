/**
 * Accessibility tests for form components.
 * Verifies screen-reader props, live regions, and labels.
 */

import { render, screen } from '@testing-library/react-native';
import FormField from '../../../src/components/forms/FormField';
import AutoFilledBadge from '../../../src/components/forms/AutoFilledBadge';
import FormSection from '../../../src/components/forms/FormSection';
import type { FilledFormField, FilledFormSection } from '../../../src/services/forms/formEngine';

function makeField(overrides: Partial<FilledFormField> = {}): FilledFormField {
  return {
    id: 'testField',
    label: 'Test Field',
    type: 'text',
    required: false,
    countrySpecific: false,
    currentValue: '',
    source: 'empty',
    needsUserInput: true,
    ...overrides,
  };
}

function makeSection(
  fields: FilledFormField[],
  overrides: Partial<FilledFormSection> = {}
): FilledFormSection {
  return {
    id: 'test-section',
    title: 'Test Section',
    fields,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AutoFilledBadge accessibility
// ---------------------------------------------------------------------------

describe('AutoFilledBadge accessibility', () => {
  it('has accessibilityLabel explaining auto-fill for auto source', () => {
    const { getByLabelText } = render(
      <AutoFilledBadge source="auto" />
    );
    expect(getByLabelText('Auto-filled from your passport profile')).toBeTruthy();
  });

  it('has accessibilityLabel explaining user entry for user source', () => {
    const { getByLabelText } = render(
      <AutoFilledBadge source="user" />
    );
    expect(getByLabelText('Filled from your previous entries')).toBeTruthy();
  });

  it('returns null for empty source (not accessible, not rendered)', () => {
    const { queryByLabelText } = render(
      <AutoFilledBadge source="empty" />
    );
    expect(queryByLabelText('Auto-filled from your passport profile')).toBeNull();
    expect(queryByLabelText('Filled from your previous entries')).toBeNull();
  });

  it('returns null for default source', () => {
    const { queryByLabelText } = render(
      <AutoFilledBadge source="default" />
    );
    expect(queryByLabelText('Auto-filled from your passport profile')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FormField error live region
// ---------------------------------------------------------------------------

describe('FormField error live region', () => {
  it('error message has accessibilityLiveRegion polite', () => {
    const field = makeField({ id: 'surname', label: 'Surname', type: 'text' });
    render(
      <FormField
        field={field}
        onValueChange={jest.fn()}
        error="Surname is required"
      />
    );

    // Multiple elements may contain this text (FormField outer error + Input inner error).
    // Find the one with polite live region (the FormField-level error Text).
    const allErrors = screen.getAllByText('Surname is required');
    const politeError = allErrors.find(
      el => el.props.accessibilityLiveRegion === 'polite'
    );
    expect(politeError).toBeTruthy();
  });

  it('error message has accessibilityRole text', () => {
    const field = makeField({ id: 'surname', label: 'Surname', type: 'text' });
    render(
      <FormField
        field={field}
        onValueChange={jest.fn()}
        error="Surname is required"
      />
    );

    const allErrors = screen.getAllByText('Surname is required');
    const errorWithRole = allErrors.find(
      el => el.props.accessibilityLiveRegion === 'polite'
    );
    expect(errorWithRole?.props.accessibilityRole).toBe('text');
  });

  it('no error element rendered when no error prop', () => {
    const field = makeField({ id: 'surname', label: 'Surname', type: 'text' });
    render(
      <FormField
        field={field}
        onValueChange={jest.fn()}
      />
    );
    expect(screen.queryByText('Surname is required')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Input error live region (AC: errors announced via polite live region)
// ---------------------------------------------------------------------------

describe('Input error live region', () => {
  it('Input error text has accessibilityLiveRegion polite', () => {
    const field = makeField({
      id: 'testInput',
      label: 'Test Input',
      type: 'text',
    });
    render(
      <FormField
        field={field}
        onValueChange={jest.fn()}
        error="Field is required"
      />
    );

    // Check that at least one error element has polite live region
    const allErrors = screen.getAllByText('Field is required');
    const politeErrors = allErrors.filter(
      el => el.props.accessibilityLiveRegion === 'polite'
    );
    expect(politeErrors.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// FormField passes label + required to Input
// ---------------------------------------------------------------------------

describe('FormField label and required forwarding to Input', () => {
  it('text Input gets accessibilityLabel containing the field label', () => {
    const field = makeField({
      id: 'passportNumber',
      label: 'Passport Number',
      type: 'text',
      required: true,
    });

    render(
      <FormField
        field={field}
        onValueChange={jest.fn()}
      />
    );

    // The TextInput should have an accessibilityLabel that includes the field name
    const input = screen.getByTestId('input-passportNumber');
    expect(input.props.accessibilityLabel).toContain('Passport Number');
  });

  it('text Input accessibilityLabel includes "required" for required fields', () => {
    const field = makeField({
      id: 'passportNumber',
      label: 'Passport Number',
      type: 'text',
      required: true,
    });

    render(
      <FormField
        field={field}
        onValueChange={jest.fn()}
      />
    );

    const input = screen.getByTestId('input-passportNumber');
    expect(input.props.accessibilityLabel).toContain('required');
  });

  it('select input renders label text for screen readers when label prop is provided', () => {
    const field = makeField({
      id: 'purposeOfVisit',
      label: 'Purpose of Visit',
      type: 'select',
      required: true,
      options: [
        { value: 'tourism', label: 'Tourism' },
      ],
    });

    render(
      <FormField
        field={field}
        onValueChange={jest.fn()}
      />
    );

    // Select renders an accessible label Text element when label prop is passed.
    // Verify the label text appears (includes field name and required marker).
    const labelTexts = screen.getAllByText('Purpose of Visit');
    expect(labelTexts.length).toBeGreaterThanOrEqual(1);

    // Required asterisk should appear inside the Select's label
    const asterisks = screen.getAllByText('*');
    expect(asterisks.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// FormField required field accessibility
// ---------------------------------------------------------------------------

describe('FormField required field accessibility', () => {
  it('shows required asterisk for required fields', () => {
    const field = makeField({
      id: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
    });

    render(
      <FormField
        field={field}
        onValueChange={jest.fn()}
      />
    );

    // The * character appears in the label — may appear multiple times (FormField + Input)
    const asterisks = screen.getAllByText('*');
    expect(asterisks.length).toBeGreaterThanOrEqual(1);
  });

  it('boolean (toggle) field gets accessibilityLabel with required suffix', () => {
    const field = makeField({
      id: 'hasItems',
      label: 'Goods to Declare',
      type: 'boolean',
      required: true,
    });

    render(
      <FormField
        field={field}
        value={false}
        onValueChange={jest.fn()}
      />
    );

    // Both the FormField wrapper View and the Toggle Pressable share testID "field-hasItems".
    // The Toggle Pressable has accessibilityRole="switch".
    const allElements = screen.getAllByTestId('field-hasItems');
    const togglePressable = allElements.find(
      el => el.props.accessibilityRole === 'switch'
    );
    expect(togglePressable).toBeTruthy();
    // Toggle internally computes: "${accessibilityLabel}, ${currentStateLabel}"
    // → "Goods to Declare, required, Off"
    expect(togglePressable?.props.accessibilityLabel).toContain('Goods to Declare');
    expect(togglePressable?.props.accessibilityLabel).toContain('required');
  });

  it('boolean field without required gets plain label', () => {
    const field = makeField({
      id: 'optionalToggle',
      label: 'Optional Setting',
      type: 'boolean',
      required: false,
    });

    render(
      <FormField
        field={field}
        value={false}
        onValueChange={jest.fn()}
      />
    );

    const allElements = screen.getAllByTestId('field-optionalToggle');
    const togglePressable = allElements.find(
      el => el.props.accessibilityRole === 'switch'
    );
    expect(togglePressable).toBeTruthy();
    expect(togglePressable?.props.accessibilityLabel).toContain('Optional Setting');
    expect(togglePressable?.props.accessibilityLabel).not.toContain('required');
  });
});

// ---------------------------------------------------------------------------
// FormSection accessibility
// ---------------------------------------------------------------------------

describe('FormSection collapsible accessibility', () => {
  it('collapsible header has accessibilityRole button', () => {
    const fields = [makeField({ id: 'f1', label: 'Field 1' })];
    const section = makeSection(fields, { id: 'sec1', title: 'Personal Info' });

    render(
      <FormSection
        section={section}
        values={{}}
        onValueChange={jest.fn()}
        collapsible={true}
        defaultExpanded={true}
      />
    );

    const header = screen.getByTestId('section-header-sec1');
    expect(header.props.accessibilityRole).toBe('button');
  });

  it('collapsible header accessibilityState reflects expanded state', () => {
    const fields = [makeField({ id: 'f1', label: 'Field 1' })];
    const section = makeSection(fields, { id: 'sec1', title: 'Personal Info' });

    render(
      <FormSection
        section={section}
        values={{}}
        onValueChange={jest.fn()}
        collapsible={true}
        defaultExpanded={true}
      />
    );

    const header = screen.getByTestId('section-header-sec1');
    expect(header.props.accessibilityState?.expanded).toBe(true);
  });

  it('collapsible header accessibilityLabel includes section title', () => {
    const fields = [makeField({ id: 'f1', label: 'Field 1' })];
    const section = makeSection(fields, { id: 'sec1', title: 'Personal Info' });

    render(
      <FormSection
        section={section}
        values={{}}
        onValueChange={jest.fn()}
        collapsible={true}
        defaultExpanded={true}
      />
    );

    const header = screen.getByTestId('section-header-sec1');
    expect(header.props.accessibilityLabel).toContain('Personal Info');
  });

  it('collapsible header accessibilityState.expanded is false when collapsed', () => {
    const fields = [makeField({ id: 'f1', label: 'Field 1' })];
    const section = makeSection(fields, { id: 'sec1', title: 'Personal Info' });

    render(
      <FormSection
        section={section}
        values={{}}
        onValueChange={jest.fn()}
        collapsible={true}
        defaultExpanded={false}
      />
    );

    const header = screen.getByTestId('section-header-sec1');
    expect(header.props.accessibilityState?.expanded).toBe(false);
  });

  it('non-collapsible section header has no testID (not a button)', () => {
    const fields = [makeField({ id: 'f1', label: 'Field 1' })];
    const section = makeSection(fields, { id: 'sec1', title: 'Personal Info' });

    render(
      <FormSection
        section={section}
        values={{}}
        onValueChange={jest.fn()}
        collapsible={false}
      />
    );

    // Non-collapsible sections don't have the button testID
    expect(screen.queryByTestId('section-header-sec1')).toBeNull();
  });
});
