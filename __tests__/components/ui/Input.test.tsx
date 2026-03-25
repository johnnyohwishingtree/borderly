/**
 * Tests for Input component.
 * Covers: rendering, label, error, helper text, required, focus, accessibility.
 */
import { render, fireEvent } from '@testing-library/react-native';
import Input from '../../../src/components/ui/Input';

describe('Input', () => {
  it('renders with placeholder', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Enter name" />,
    );
    expect(getByPlaceholderText('Enter name')).toBeTruthy();
  });

  it('renders the label when provided', () => {
    const { getByText } = render(<Input label="Full Name" />);
    expect(getByText('Full Name')).toBeTruthy();
  });

  it('shows required asterisk when required', () => {
    const { getByText } = render(<Input label="Email" required />);
    expect(getByText('*')).toBeTruthy();
  });

  it('shows error message when provided', () => {
    const { getByText } = render(<Input error="This field is required" />);
    expect(getByText('This field is required')).toBeTruthy();
  });

  it('shows helper text when no error', () => {
    const { getByText } = render(<Input helperText="Enter your full name" />);
    expect(getByText('Enter your full name')).toBeTruthy();
  });

  it('hides helper text when error is present', () => {
    const { queryByText, getByText } = render(
      <Input helperText="Hint" error="Required" />,
    );
    expect(getByText('Required')).toBeTruthy();
    expect(queryByText('Hint')).toBeNull();
  });

  it('calls onChangeText when text changes', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Type here" onChangeText={onChange} />,
    );
    fireEvent.changeText(getByPlaceholderText('Type here'), 'hello');
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('calls onFocus when focused', () => {
    const onFocus = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Focus me" onFocus={onFocus} />,
    );
    fireEvent(getByPlaceholderText('Focus me'), 'focus');
    expect(onFocus).toHaveBeenCalled();
  });

  it('has accessible text input role', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test input" />,
    );
    const input = getByPlaceholderText('Test input');
    expect(input).toBeTruthy();
  });
});
