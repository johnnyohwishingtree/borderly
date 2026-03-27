/**
 * Tests for AccessibleInput component.
 * Covers: rendering, label, error state, a11y props, field types, icons.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import AccessibleInput from '../../../src/components/ui/AccessibleInput';

// Mock accessibility utilities
jest.mock('../../../src/utils/accessibility', () => ({
  AccessibilityStateHelpers: {
    createFormFieldState: (_required = false, _hasError = false, disabled = false) => ({
      disabled,
    }),
  },
  TouchTargetUtils: {
    ensureMinimumTouchTarget: () => ({ minWidth: 44, minHeight: 44 }),
    getHitSlop: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  },
  SemanticUtils: {
    generateFieldLabel: (label: string, required: boolean, hasError: boolean, error?: string) => {
      let full = label;
      if (required) full += ', required';
      if (hasError && error) full += `, error: ${error}`;
      return full;
    },
  },
  ACCESSIBILITY_CONSTANTS: {
    MIN_TOUCH_TARGET: 44,
  },
  ScreenReaderUtils: {
    announce: jest.fn(),
  },
}));

describe('AccessibleInput', () => {
  it('renders with label', () => {
    const { getByText } = render(<AccessibleInput label="Full Name" />);
    expect(getByText('Full Name')).toBeTruthy();
  });

  it('shows required indicator when required', () => {
    const { getByLabelText } = render(
      <AccessibleInput label="Email" required />,
    );
    expect(getByLabelText('required')).toBeTruthy();
  });

  it('renders error message', () => {
    const { getByText } = render(
      <AccessibleInput label="Email" error="Invalid email" errorTestID="email-error" />,
    );
    expect(getByText('Invalid email')).toBeTruthy();
  });

  it('renders helper text when no error', () => {
    const { getByText } = render(
      <AccessibleInput label="Name" helperText="Enter your full name" />,
    );
    expect(getByText('Enter your full name')).toBeTruthy();
  });

  it('hides helper text when error is shown', () => {
    const { queryByText, getByText } = render(
      <AccessibleInput
        label="Name"
        helperText="Enter your full name"
        error="Name is required"
      />,
    );
    expect(getByText('Name is required')).toBeTruthy();
    expect(queryByText('Enter your full name')).toBeNull();
  });

  it('applies testID to input', () => {
    const { getByTestId } = render(
      <AccessibleInput testID="name-input" />,
    );
    expect(getByTestId('name-input')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <AccessibleInput testID="input" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(getByTestId('input'), 'hello');
    expect(onChangeText).toHaveBeenCalledWith('hello');
  });

  it('renders left icon when provided', () => {
    const icon = <Text testID="left-icon">Icon</Text>;
    const { getByTestId } = render(
      <AccessibleInput leftIcon={icon} />,
    );
    expect(getByTestId('left-icon')).toBeTruthy();
  });

  it('renders right icon with press handler', () => {
    const onPress = jest.fn();
    const icon = <Text testID="right-icon">X</Text>;
    const { getByLabelText } = render(
      <AccessibleInput
        rightIcon={icon}
        onRightIconPress={onPress}
        rightIconAccessibilityLabel="Clear input"
      />,
    );
    fireEvent.press(getByLabelText('Clear input'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('generates semantic accessibility label', () => {
    const { getByLabelText } = render(
      <AccessibleInput label="Email" required error="Invalid" />,
    );
    expect(getByLabelText('Email, required, error: Invalid')).toBeTruthy();
  });
});
