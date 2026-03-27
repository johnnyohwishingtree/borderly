/**
 * Tests for Toggle component.
 * Covers: rendering, checked/unchecked states, onChange, disabled, accessibility.
 */
import { render, fireEvent } from '@testing-library/react-native';
import Toggle from '../../../src/components/ui/Toggle';

describe('Toggle', () => {
  it('renders in unchecked state', () => {
    const { getByRole } = render(
      <Toggle value={false} onValueChange={jest.fn()} />,
    );
    const toggle = getByRole('switch');
    expect(toggle.props.accessibilityState?.checked).toBe(false);
  });

  it('renders in checked state', () => {
    const { getByRole } = render(
      <Toggle value={true} onValueChange={jest.fn()} />,
    );
    const toggle = getByRole('switch');
    expect(toggle.props.accessibilityState?.checked).toBe(true);
  });

  it('calls onValueChange with toggled value when pressed', () => {
    const onChange = jest.fn();
    const { getByRole } = render(
      <Toggle value={false} onValueChange={onChange} />,
    );
    fireEvent.press(getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onValueChange with false when toggling off', () => {
    const onChange = jest.fn();
    const { getByRole } = render(
      <Toggle value={true} onValueChange={onChange} />,
    );
    fireEvent.press(getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does not call onValueChange when disabled', () => {
    const onChange = jest.fn();
    const { getByRole } = render(
      <Toggle value={false} onValueChange={onChange} disabled />,
    );
    fireEvent.press(getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has disabled accessibility state when disabled', () => {
    const { getByRole } = render(
      <Toggle value={false} onValueChange={jest.fn()} disabled />,
    );
    const toggle = getByRole('switch');
    expect(toggle.props.accessibilityState?.disabled).toBe(true);
  });

  it('applies custom accessibility label with state suffix', () => {
    const { getByRole } = render(
      <Toggle
        value={false}
        onValueChange={jest.fn()}
        accessibilityLabel="Dark mode"
      />,
    );
    const toggle = getByRole('switch');
    expect(toggle.props.accessibilityLabel).toContain('Dark mode');
  });

  it('renders with small size', () => {
    const { getByRole } = render(
      <Toggle value={false} onValueChange={jest.fn()} size="small" />,
    );
    getByRole('switch');
  });

  it('renders with large size', () => {
    const { getByRole } = render(
      <Toggle value={false} onValueChange={jest.fn()} size="large" />,
    );
    getByRole('switch');
  });
});
