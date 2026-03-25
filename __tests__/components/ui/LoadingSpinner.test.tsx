/**
 * Tests for LoadingSpinner component.
 * Covers: rendering, variants (spinner/skeleton/overlay), text, timeout, cancel.
 */
import { render, fireEvent, act } from '@testing-library/react-native';
import LoadingSpinner from '../../../src/components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders a spinner by default', () => {
    const { getByLabelText } = render(<LoadingSpinner />);
    expect(getByLabelText('Loading')).toBeTruthy();
  });

  it('renders loading text when provided', () => {
    const { getByText } = render(<LoadingSpinner text="Please wait..." />);
    expect(getByText('Please wait...')).toBeTruthy();
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
    expect(getByLabelText('Loading')).toBeTruthy();
  });

  it('renders in fullScreen mode', () => {
    const { getByLabelText } = render(<LoadingSpinner fullScreen />);
    expect(getByLabelText('Loading')).toBeTruthy();
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

    expect(getByText(/taking longer/i)).toBeTruthy();
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
    expect(getByText('Cancel')).toBeTruthy();
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
    expect(getByLabelText('Loading')).toBeTruthy();

    rerender(<LoadingSpinner size="large" />);
    expect(getByLabelText('Loading')).toBeTruthy();
  });
});
