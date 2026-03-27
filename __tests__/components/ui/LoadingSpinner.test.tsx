/**
 * Tests for LoadingSpinner component.
 * Covers: rendering, variants (spinner/skeleton/overlay), text, timeout, cancel.
 */
import { render, fireEvent, act } from '@testing-library/react-native';
import LoadingSpinner from '../../../src/components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders a spinner by default', () => {
    const { getByLabelText } = render(<LoadingSpinner />);
    getByLabelText('Loading');
  });

  it('renders loading text when provided', () => {
    const { getByText } = render(<LoadingSpinner text="Please wait..." />);
    getByText('Please wait...');
  });

  it('renders skeleton variant with pulsing bars', () => {
    const { queryByLabelText } = render(
      <LoadingSpinner variant="skeleton" />,
    );
    // Skeleton variant doesn't render ActivityIndicator
    expect(queryByLabelText('Loading')).toBeNull();
  });

  it('renders overlay variant', () => {
    const { getByLabelText } = render(
      <LoadingSpinner variant="overlay" />,
    );
    getByLabelText('Loading');
  });

  it('renders in fullScreen mode', () => {
    const { getByLabelText } = render(<LoadingSpinner fullScreen />);
    getByLabelText('Loading');
  });

  it('shows timeout message after specified duration', () => {
    jest.useFakeTimers();
    const { getByText, queryByText } = render(
      <LoadingSpinner timeout={2000} />,
    );

    expect(queryByText(/taking longer/i)).toBeNull();

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    getByText(/taking longer/i);
    jest.useRealTimers();
  });

  it('calls onTimeout callback when timeout fires', () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();
    render(<LoadingSpinner timeout={1000} onTimeout={onTimeout} />);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('shows cancel button when cancelable and onCancel provided', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <LoadingSpinner cancelable onCancel={onCancel} />,
    );
    getByText('Cancel');
  });

  it('calls onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <LoadingSpinner cancelable onCancel={onCancel} />,
    );
    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not show cancel button when not cancelable', () => {
    const { queryByText } = render(<LoadingSpinner />);
    expect(queryByText('Cancel')).toBeNull();
  });

  it('renders with different sizes', () => {
    const { getByLabelText, rerender } = render(
      <LoadingSpinner size="small" />,
    );
    getByLabelText('Loading');

    rerender(<LoadingSpinner size="large" />);
    getByLabelText('Loading');
  });
});
