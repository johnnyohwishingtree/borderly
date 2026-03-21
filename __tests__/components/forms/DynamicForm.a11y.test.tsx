/**
 * Accessibility tests for the DynamicForm component.
 * Verifies field labels, required indicators, and error announcements
 * as exposed to screen readers via React Native a11y props.
 */

import { render, screen } from '@testing-library/react-native';
import { DynamicForm } from '../../../src/components/forms';
import type { FilledForm, FilledFormField, FilledFormSection } from '../../../src/services/forms/formEngine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeForm(overrides?: Partial<FilledForm>): FilledForm {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    portalName: 'Visit Japan Web',
    portalUrl: 'https://vjw-lp.digital.go.jp/en/',
    sections: [
      {
        id: 'personal',
        title: 'Personal Information',
        fields: [
          {
            id: 'surname',
            label: 'Surname',
            type: 'text',
            required: true,
            autoFillSource: 'profile.surname',
            countrySpecific: false,
            currentValue: 'Smith',
            source: 'auto',
            needsUserInput: false,
          } as FilledFormField,
          {
            id: 'purposeOfVisit',
            label: 'Purpose of Visit',
            type: 'select',
            required: true,
            countrySpecific: true,
            options: [
              { value: 'tourism', label: 'Tourism' },
              { value: 'business', label: 'Business' },
            ],
            currentValue: '',
            source: 'empty',
            needsUserInput: true,
          } as FilledFormField,
        ],
      } as FilledFormSection,
    ],
    stats: {
      totalFields: 2,
      autoFilled: 1,
      userFilled: 0,
      remaining: 1,
      completionPercentage: 50,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Form-level label — country name heading
// ---------------------------------------------------------------------------

describe('DynamicForm country heading accessibility', () => {
  it('renders the country declaration heading visible to screen readers', () => {
    render(
      <DynamicForm form={makeForm()} onFormDataChange={jest.fn()} showFormStats={false} />
    );
    expect(screen.getByText('Japan Declaration')).toBeTruthy();
  });

  it('renders the portal name subtitle', () => {
    render(
      <DynamicForm form={makeForm()} onFormDataChange={jest.fn()} showFormStats={false} />
    );
    expect(screen.getByText('Visit Japan Web')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Field labels — via input accessibilityLabel (screen-reader text)
// ---------------------------------------------------------------------------

describe('DynamicForm field labels via input accessibilityLabel', () => {
  it('text input accessibilityLabel contains the field label "Surname"', () => {
    render(
      <DynamicForm form={makeForm()} onFormDataChange={jest.fn()} showFormStats={false} />
    );
    const input = screen.getByTestId('input-surname');
    expect(input.props.accessibilityLabel).toContain('Surname');
  });

  it('select field label text is visible in the rendered tree', () => {
    render(
      <DynamicForm form={makeForm()} onFormDataChange={jest.fn()} showFormStats={false} />
    );
    // The Select component renders its label text; use regex to match label across mixed text nodes
    const allPurposeOfVisitTexts = screen.getAllByText(/Purpose of Visit/);
    expect(allPurposeOfVisitTexts.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Required field indicator
// ---------------------------------------------------------------------------

describe('DynamicForm required field indicator', () => {
  it('shows a required asterisk (*) for required fields', () => {
    render(
      <DynamicForm form={makeForm()} onFormDataChange={jest.fn()} showFormStats={false} />
    );
    const asterisks = screen.getAllByText('*');
    expect(asterisks.length).toBeGreaterThanOrEqual(1);
  });

  it('text input accessibilityLabel includes "required" for required fields', () => {
    render(
      <DynamicForm form={makeForm()} onFormDataChange={jest.fn()} showFormStats={false} />
    );
    const input = screen.getByTestId('input-surname');
    expect(input.props.accessibilityLabel).toContain('required');
  });
});

// ---------------------------------------------------------------------------
// Validation summary — error announcement live region
// ---------------------------------------------------------------------------

describe('DynamicForm validation summary live region', () => {
  it('validation summary container has accessibilityLiveRegion="polite"', () => {
    // Form with a remaining required field triggers the validation summary
    const form = makeForm();
    render(
      <DynamicForm form={form} onFormDataChange={jest.fn()} showFormStats={false} />
    );

    // Query by testID and verify the live region prop directly (RNTL idiomatic approach).
    const summary = screen.getByTestId('validation-summary');
    expect(summary.props.accessibilityLiveRegion).toBe('polite');
  });

  it('validation summary announces missing required fields', () => {
    const form = makeForm();
    render(
      <DynamicForm form={form} onFormDataChange={jest.fn()} showFormStats={false} />
    );
    // "1 required fields need attention" — matches fragment: "required fields need attention"
    expect(screen.getByText(/required fields need attention/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Form testID — for automation targeting
// ---------------------------------------------------------------------------

describe('DynamicForm testID', () => {
  it('root container has testID="dynamic-form"', () => {
    render(
      <DynamicForm form={makeForm()} onFormDataChange={jest.fn()} showFormStats={false} />
    );
    expect(screen.getByTestId('dynamic-form')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Auto-fill badges — accessible labels explaining the source
// ---------------------------------------------------------------------------

describe('DynamicForm auto-fill badge accessibility', () => {
  it('auto-filled fields show accessible badge with descriptive label', () => {
    render(
      <DynamicForm form={makeForm()} onFormDataChange={jest.fn()} showFormStats={false} />
    );
    // AutoFilledBadge renders with accessibilityLabel explaining source
    expect(screen.getByLabelText('Auto-filled from your passport profile')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Empty-state — no fields scenario
// ---------------------------------------------------------------------------

describe('DynamicForm empty state', () => {
  it('displays an accessible message when there are no sections', () => {
    const emptyForm = makeForm({
      sections: [],
      stats: { totalFields: 0, autoFilled: 0, userFilled: 0, remaining: 0, completionPercentage: 0 },
    });
    render(
      <DynamicForm form={emptyForm} onFormDataChange={jest.fn()} />
    );
    expect(screen.getByText('No form fields available for Japan')).toBeTruthy();
  });
});
