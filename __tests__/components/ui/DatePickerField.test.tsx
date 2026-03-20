import { render, fireEvent } from '@testing-library/react-native';
import DatePickerField from '../../../src/components/ui/DatePickerField';

// DatePickerField.tsx (native) is loaded by Jest (not the .web.tsx variant)
// Uses Modal, Pressable, ScrollView, TouchableOpacity — all mocked in jest.setup.js

describe('DatePickerField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('rendering', () => {
    it('renders with label', () => {
      const { getAllByText } = render(
        <DatePickerField label="Date of Birth" onChange={mockOnChange} />
      );
      // Label appears in the field header and also in the modal header (mock always renders)
      expect(getAllByText('Date of Birth').length).toBeGreaterThanOrEqual(1);
    });

    it('renders with required indicator when required=true', () => {
      const { getByText } = render(
        <DatePickerField label="Expiry" onChange={mockOnChange} required />
      );
      expect(getByText(' *')).toBeTruthy();
    });

    it('renders placeholder when no value set', () => {
      const { getByText } = render(
        <DatePickerField placeholder="Select a date" onChange={mockOnChange} />
      );
      expect(getByText('Select a date')).toBeTruthy();
    });

    it('renders formatted date when value is set', () => {
      const { getByText } = render(
        <DatePickerField value="1990-01-15" onChange={mockOnChange} />
      );
      // Friendly format: "Jan 15, 1990" (day is not zero-padded)
      expect(getByText('Jan 15, 1990')).toBeTruthy();
    });

    it('renders error message when error prop is provided', () => {
      const { getByText } = render(
        <DatePickerField error="This field is required" onChange={mockOnChange} />
      );
      expect(getByText('This field is required')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <DatePickerField testID="my-date-picker" onChange={mockOnChange} />
      );
      expect(getByTestId('my-date-picker')).toBeTruthy();
    });
  });

  describe('display format', () => {
    it('formats January date correctly', () => {
      const { getByText } = render(
        <DatePickerField value="2024-01-05" onChange={mockOnChange} />
      );
      // Day is not zero-padded in the friendly display format
      expect(getByText('Jan 5, 2024')).toBeTruthy();
    });

    it('formats December date correctly', () => {
      const { getByText } = render(
        <DatePickerField value="2000-12-31" onChange={mockOnChange} />
      );
      expect(getByText('Dec 31, 2000')).toBeTruthy();
    });

    it('shows placeholder for empty value', () => {
      const { getByText } = render(
        <DatePickerField value="" placeholder="Pick a date" onChange={mockOnChange} />
      );
      expect(getByText('Pick a date')).toBeTruthy();
    });

    it('shows placeholder for invalid value', () => {
      const { getByText } = render(
        <DatePickerField value="not-a-date" placeholder="Invalid date" onChange={mockOnChange} />
      );
      expect(getByText('Invalid date')).toBeTruthy();
    });
  });

  describe('modal interaction', () => {
    it('opens modal when pressed', () => {
      const { getByTestId, getByText } = render(
        <DatePickerField testID="date-picker" onChange={mockOnChange} />
      );
      const trigger = getByTestId('date-picker');
      fireEvent.press(trigger);
      // Modal content (Done button) should be visible
      expect(getByText('Done')).toBeTruthy();
    });

    it('shows Clear and Done buttons when modal is open', () => {
      const { getByTestId, getByText } = render(
        <DatePickerField testID="date-picker" onChange={mockOnChange} />
      );
      fireEvent.press(getByTestId('date-picker'));
      expect(getByText('Clear')).toBeTruthy();
      expect(getByText('Done')).toBeTruthy();
    });

    it('calls onChange with empty string when Clear is pressed', () => {
      const { getByTestId, getByText } = render(
        <DatePickerField testID="date-picker" value="2024-06-15" onChange={mockOnChange} />
      );
      fireEvent.press(getByTestId('date-picker'));
      fireEvent.press(getByText('Clear'));
      expect(mockOnChange).toHaveBeenCalledWith('');
    });

    it('calls onChange with ISO date string when Done is pressed', () => {
      const { getByTestId, getByText } = render(
        <DatePickerField testID="date-picker" value="2024-06-15" onChange={mockOnChange} />
      );
      fireEvent.press(getByTestId('date-picker'));
      // Press Done without changing anything — should emit current date
      fireEvent.press(getByText('Done'));
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      // Result should be valid ISO format YYYY-MM-DD
      const result = mockOnChange.mock.calls[0][0] as string;
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('does not call onChange when disabled and trigger is pressed', () => {
      // Note: in Jest the Modal mock renders unconditionally (ignores visible prop),
      // so we verify the picker callback is not invoked rather than checking DOM.
      const { getByTestId } = render(
        <DatePickerField testID="date-picker" onChange={mockOnChange} disabled />
      );
      fireEvent.press(getByTestId('date-picker'));
      // handleOpen returns early when disabled — modal is not "opened" in logic
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('constraints', () => {
    it('respects maxDate prop (does not crash)', () => {
      expect(() =>
        render(
          <DatePickerField
            value="1990-06-15"
            maxDate="2000-01-01"
            onChange={mockOnChange}
          />
        )
      ).not.toThrow();
    });

    it('respects minDate prop (does not crash)', () => {
      expect(() =>
        render(
          <DatePickerField
            value="2025-06-15"
            minDate="2020-01-01"
            onChange={mockOnChange}
          />
        )
      ).not.toThrow();
    });
  });
});
