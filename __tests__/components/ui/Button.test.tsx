/**
 * Tests for Button component.
 * Covers: rendering, variants, disabled, loading, onPress callback, accessibility.
 */
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../../../src/components/ui/Button';

describe('Button', () => {
  it('renders the title text', () => {
    const { getByText } = render(<Button title="Save" onPress={jest.fn()} />);
    getByText('Save');
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Submit" onPress={onPress} />);
    fireEvent.press(getByText('Submit'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Submit" onPress={onPress} disabled />,
    );
    fireEvent.press(getByText('Submit'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button title="Submit" onPress={onPress} loading />,
    );
    const button = getByRole('button');
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when loading', () => {
    const { getByLabelText } = render(
      <Button title="Submit" onPress={jest.fn()} loading />,
    );
    getByLabelText('Loading');
  });

  it('renders with primary variant by default', () => {
    const { getByRole } = render(
      <Button title="Go" onPress={jest.fn()} />,
    );
    getByRole('button');
  });

  it('renders with secondary variant', () => {
    const { getByText } = render(
      <Button title="Cancel" onPress={jest.fn()} variant="secondary" />,
    );
    getByText('Cancel');
  });

  it('renders with outline variant', () => {
    const { getByText } = render(
      <Button title="Details" onPress={jest.fn()} variant="outline" />,
    );
    getByText('Details');
  });

  it('has accessible button role', () => {
    const { getByRole } = render(
      <Button title="Save" onPress={jest.fn()} />,
    );
    getByRole('button');
  });

  it('applies disabled accessibility state', () => {
    const { getByRole } = render(
      <Button title="Save" onPress={jest.fn()} disabled />,
    );
    const button = getByRole('button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('applies custom accessibility label', () => {
    const { getByLabelText } = render(
      <Button
        title="X"
        onPress={jest.fn()}
        accessibilityLabel="Close dialog"
      />,
    );
    getByLabelText('Close dialog');
  });
});
