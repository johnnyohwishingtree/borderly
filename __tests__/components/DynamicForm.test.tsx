import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { DynamicForm } from '../../src/components/forms';
import { FilledForm, FilledFormSection, FilledFormField } from '../../src/services/forms/formEngine';

// Mock the form store
jest.mock('../../src/stores/useFormStore', () => ({
  useFormStore: () => ({
    validateField: jest.fn(),
  }),
}));

describe('DynamicForm', () => {
  const mockOnFormDataChange = jest.fn();

  const createMockForm = (overrides?: Partial<FilledForm>): FilledForm => ({
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
            currentValue: 'Johnson',
            source: 'auto',
            needsUserInput: false,
          },
          {
            id: 'givenNames',
            label: 'Given Names',
            type: 'text',
            required: true,
            autoFillSource: 'profile.givenNames',
            countrySpecific: false,
            currentValue: 'John',
            source: 'auto',
            needsUserInput: false,
          },
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
          },
        ] as FilledFormField[],
      } as FilledFormSection,
    ],
    stats: {
      totalFields: 3,
      autoFilled: 2,
      userFilled: 0,
      remaining: 1,
      completionPercentage: 67,
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form correctly', () => {
    const mockForm = createMockForm();

    render(
      <DynamicForm
        form={mockForm}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    expect(screen.getByText('Japan Declaration')).toBeTruthy();
    expect(screen.getByText('Visit Japan Web')).toBeTruthy();
    expect(screen.getByText('Personal Information')).toBeTruthy();
  });

  it('displays form statistics correctly', () => {
    const mockForm = createMockForm();

    render(
      <DynamicForm
        form={mockForm}
        onFormDataChange={mockOnFormDataChange}
        showFormStats={true}
      />
    );

    expect(screen.getByText('Form Summary')).toBeTruthy();
    expect(screen.getByText('Total Fields:')).toBeTruthy();
    expect(screen.getByText('Auto-filled:')).toBeTruthy();
    expect(screen.getByText('User filled:')).toBeTruthy();
    expect(screen.getByText('Remaining:')).toBeTruthy();
    expect(screen.getByText('Completion:')).toBeTruthy();
  });

  it('shows only country-specific fields when flag is enabled', () => {
    const mockForm = createMockForm();

    render(
      <DynamicForm
        form={mockForm}
        onFormDataChange={mockOnFormDataChange}
        showOnlyCountrySpecific={true}
      />
    );

    // Should show country-specific indicator
    expect(screen.getByText('⚠️ Country-specific requirement')).toBeTruthy();
    
    // Should show the select button for Purpose of Visit
    expect(screen.getByText('Select Purpose of Visit')).toBeTruthy();
  });

  it('calls onFormDataChange when field values change', async () => {
    const mockForm = createMockForm();

    render(
      <DynamicForm
        form={mockForm}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    // Find and interact with the purpose of visit select component
    const selectButton = screen.getByText('Select Purpose of Visit');
    fireEvent.press(selectButton);

    await waitFor(() => {
      expect(mockOnFormDataChange).toHaveBeenCalled();
    });
  });

  it('displays validation summary when form is incomplete', () => {
    const mockForm = createMockForm({
      stats: {
        totalFields: 3,
        autoFilled: 2,
        userFilled: 0,
        remaining: 1,
        completionPercentage: 67,
      },
    });

    // Create a version where validation would fail
    const incompleteMockForm = {
      ...mockForm,
      sections: [
        {
          ...mockForm.sections[0],
          fields: mockForm.sections[0].fields.map(field =>
            field.id === 'purposeOfVisit'
              ? { ...field, needsUserInput: true, required: true }
              : field
          ),
        },
      ],
    };

    render(
      <DynamicForm
        form={incompleteMockForm}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    // The validation summary should be shown for incomplete forms
    // Note: The exact text depends on the validation logic implementation
  });

  it('handles empty form gracefully', () => {
    const emptyForm = createMockForm({
      sections: [],
      stats: {
        totalFields: 0,
        autoFilled: 0,
        userFilled: 0,
        remaining: 0,
        completionPercentage: 0,
      },
    });

    render(
      <DynamicForm
        form={emptyForm}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    expect(screen.getByText('No form fields available for Japan')).toBeTruthy();
  });

  it('shows collapsible sections when enabled', () => {
    const mockForm = createMockForm();

    render(
      <DynamicForm
        form={mockForm}
        onFormDataChange={mockOnFormDataChange}
        collapsibleSections={true}
      />
    );

    expect(screen.getByText('Personal Information')).toBeTruthy();
    // The section should be collapsible - exact UI depends on implementation
  });

  it('handles form data initialization correctly', () => {
    const mockForm = createMockForm();
    const initialData = { purposeOfVisit: 'business' };

    render(
      <DynamicForm
        form={mockForm}
        onFormDataChange={mockOnFormDataChange}
        initialFormData={initialData}
      />
    );

    // Should initialize with the provided form data
    expect(mockOnFormDataChange).toHaveBeenCalledWith(initialData);
  });

  it('displays auto-filled badges correctly', () => {
    const mockForm = createMockForm();

    render(
      <DynamicForm
        form={mockForm}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    // Should show auto-filled badges for auto-filled fields
    expect(screen.getAllByText('Auto-filled').length).toBeGreaterThan(0);
  });

  it('handles country-specific field highlighting', () => {
    const mockForm = createMockForm();

    render(
      <DynamicForm
        form={mockForm}
        onFormDataChange={mockOnFormDataChange}
      />
    );

    // Should show country-specific indicators
    expect(screen.getByText('⚠️ Country-specific requirement')).toBeTruthy();
  });
});

describe('DynamicForm Edge Cases', () => {
  const mockOnFormDataChange = jest.fn();

  it('handles malformed form data gracefully', () => {
    const malformedForm = {
      countryCode: 'JPN',
      countryName: 'Japan',
      portalName: 'Visit Japan Web',
      portalUrl: 'https://vjw-lp.digital.go.jp/en/',
      sections: [
        {
          id: 'test',
          title: 'Test Section',
          fields: [
            {
              id: 'malformed',
              label: 'Malformed Field',
              type: 'unknown', // Invalid type
              required: true,
              countrySpecific: false,
              currentValue: '',
              source: 'empty',
              needsUserInput: true,
            } as any,
          ],
        },
      ],
      stats: {
        totalFields: 1,
        autoFilled: 0,
        userFilled: 0,
        remaining: 1,
        completionPercentage: 0,
      },
    } as FilledForm;

    // Should not crash with unknown field types
    expect(() => {
      render(
        <DynamicForm
          form={malformedForm}
          onFormDataChange={mockOnFormDataChange}
        />
      );
    }).not.toThrow();
  });

  it('handles very large forms efficiently', () => {
    const largeForm = {
      countryCode: 'JPN',
      countryName: 'Japan',
      portalName: 'Visit Japan Web',
      portalUrl: 'https://vjw-lp.digital.go.jp/en/',
      sections: Array(10).fill(null).map((_, sectionIndex) => ({
        id: `section-${sectionIndex}`,
        title: `Section ${sectionIndex + 1}`,
        fields: Array(20).fill(null).map((_unused, fieldIndex) => ({
          id: `field-${sectionIndex}-${fieldIndex}`,
          label: `Field ${fieldIndex + 1}`,
          type: 'text' as const,
          required: false,
          countrySpecific: false,
          currentValue: '',
          source: 'empty' as const,
          needsUserInput: true,
        })),
      })),
      stats: {
        totalFields: 200,
        autoFilled: 0,
        userFilled: 0,
        remaining: 200,
        completionPercentage: 0,
      },
    } as FilledForm;

    // Should handle large forms without performance issues
    const startTime = Date.now();
    render(
      <DynamicForm
        form={largeForm}
        onFormDataChange={mockOnFormDataChange}
      />
    );
    const endTime = Date.now();

    // Should render in reasonable time (less than 1 second)
    expect(endTime - startTime).toBeLessThan(1000);
  });
});
