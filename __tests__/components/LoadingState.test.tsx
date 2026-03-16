/**
 * Unit tests for LoadingState / LoadingStates component.
 * Verifies loading, success, error, and timeout rendering.
 */
import { render, fireEvent } from '@testing-library/react-native';

// Mock accessibility utilities used inside LoadingStates
jest.mock('../../src/utils/accessibility', () => ({
  ScreenReaderUtils: {
    announce: jest.fn(),
  },
}));

// Mock HapticFeedback
jest.mock('../../src/components/ui/HapticFeedback', () => ({
  HapticFeedback: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    button: jest.fn(),
  },
}));

// Mock LoadingIndicator to keep tests simple
jest.mock('../../src/components/ui/LoadingIndicator', () => {
  const MockReact = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: function MockLoadingIndicator({ text }: { text?: string }) {
      return MockReact.createElement(Text, { testID: 'loading-indicator' }, text ?? 'Loading');
    },
  };
});

import LoadingState, { useLoadingState } from '../../src/components/ui/LoadingState';
import { renderHook, act as hookAct } from '@testing-library/react-native';

describe('LoadingState', () => {
  it('renders nothing when state is idle', () => {
    const { toJSON } = render(<LoadingState state="idle" />);
    expect(toJSON()).toBeNull();
  });

  it('renders the loading indicator when state is loading', () => {
    const { getByTestId } = render(
      <LoadingState state="loading" text="Fetching data…" />,
    );
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders success message when state is success', () => {
    const { getByText } = render(
      <LoadingState state="success" successMessage="All done!" />,
    );
    expect(getByText('All done!')).toBeTruthy();
  });

  it('renders default success message', () => {
    const { getByText } = render(<LoadingState state="success" />);
    expect(getByText('Completed successfully')).toBeTruthy();
  });

  it('renders error message when state is error', () => {
    const { getByText } = render(
      <LoadingState state="error" errorMessage="Something went wrong" />,
    );
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('renders retry button and calls onRetry when pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <LoadingState state="error" onRetry={onRetry} showRetryButton />,
    );
    fireEvent.press(getByText('Try Again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders a custom retry button label', () => {
    const { getByText } = render(
      <LoadingState
        state="error"
        onRetry={jest.fn()}
        retryButtonText="Reload"
        showRetryButton
      />,
    );
    expect(getByText('Reload')).toBeTruthy();
  });

  it('renders cancel button and calls onCancel when pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <LoadingState state="error" onCancel={onCancel} />,
    );
    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders timeout state message', () => {
    const { getByText } = render(<LoadingState state="timeout" />);
    expect(getByText('Request Timed Out')).toBeTruthy();
  });
});

describe('useLoadingState hook', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useLoadingState());
    expect(result.current.state).toBe('idle');
  });

  it('transitions to loading state', () => {
    const { result } = renderHook(() => useLoadingState());
    hookAct(() => { result.current.setLoading(); });
    expect(result.current.state).toBe('loading');
  });

  it('transitions to success state with message', () => {
    const { result } = renderHook(() => useLoadingState());
    hookAct(() => { result.current.setLoadingSuccess('Done!'); });
    expect(result.current.state).toBe('success');
    expect(result.current.success).toBe('Done!');
  });

  it('transitions to error state with message', () => {
    const { result } = renderHook(() => useLoadingState());
    hookAct(() => { result.current.setLoadingError('Oops'); });
    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe('Oops');
  });

  it('resets back to idle', () => {
    const { result } = renderHook(() => useLoadingState());
    hookAct(() => { result.current.setLoading(); });
    hookAct(() => { result.current.reset(); });
    expect(result.current.state).toBe('idle');
  });

  it('transitions to timeout state', () => {
    const { result } = renderHook(() => useLoadingState());
    hookAct(() => { result.current.setLoadingTimeout(); });
    expect(result.current.state).toBe('timeout');
  });
});
