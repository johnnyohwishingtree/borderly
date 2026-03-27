/**
 * Tests for LoadingStates component and useLoadingState hook.
 * Covers: idle/loading/success/error/timeout states, retry, cancel, accessibility.
 */
import { render, fireEvent, renderHook, act } from '@testing-library/react-native';
import { ReactTestRendererJSON } from 'react-test-renderer';
import LoadingStates, { useLoadingState } from '../../../src/components/ui/LoadingStates';

// Mock ScreenReaderUtils and AccessibilityStateHelpers (used by Button via @/utils/accessibility)
jest.mock('../../../src/utils/accessibility', () => ({
  ScreenReaderUtils: {
    announce: jest.fn(),
  },
  ACCESSIBILITY_CONSTANTS: {
    MIN_TOUCH_TARGET: 44,
    MIN_COLOR_CONTRAST: 4.5,
    MIN_COLOR_CONTRAST_LARGE: 3,
    TIMEOUT_DURATION: 300000,
  },
  AccessibilityStateHelpers: {
    createButtonState: (disabled = false, loading = false, selected = false) => ({
      disabled,
      busy: loading,
      selected,
    }),
  },
  TouchTargetUtils: {
    ensureMinimumTouchTarget: () => ({ width: 44, height: 44, minWidth: 44, minHeight: 44 }),
    getHitSlop: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  },
}));

// Mock HapticFeedback (includes methods used by Button and LoadingStates)
jest.mock('../../../src/components/ui/HapticFeedback', () => ({
  HapticFeedback: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    button: jest.fn(),
    tab: jest.fn(),
    toggle: jest.fn(),
    card: jest.fn(),
    listItem: jest.fn(),
    focus: jest.fn(),
    longPress: jest.fn(),
    dragStart: jest.fn(),
    dragEnd: jest.fn(),
  },
}));

describe('LoadingStates', () => {
  it('renders nothing when state is idle', () => {
    const { toJSON } = render(<LoadingStates state="idle" />);
    expect(toJSON()).toBeNull();
  });

  it('renders loading indicator when state is loading', () => {
    const { toJSON } = render(<LoadingStates state="loading" />);
    expect(toJSON()).not.toBeNull();
    expect((toJSON() as ReactTestRendererJSON).props.accessibilityLabel).toBe('Loading');
  });

  it('renders success message', () => {
    const { getByText } = render(
      <LoadingStates state="success" successMessage="Profile saved" />,
    );
    getByText('Success!');
    getByText('Profile saved');
  });

  it('renders default success message', () => {
    const { getByText } = render(<LoadingStates state="success" />);
    getByText('Completed successfully');
  });

  it('renders error state with message', () => {
    const { getByText } = render(
      <LoadingStates state="error" errorMessage="Network failed" />,
    );
    getByText('Error');
    getByText('Network failed');
  });

  it('renders default error message', () => {
    const { getByText } = render(<LoadingStates state="error" />);
    getByText('Something went wrong. Please try again.');
  });

  it('renders timeout state', () => {
    const { getByText } = render(<LoadingStates state="timeout" />);
    getByText('Request Timed Out');
  });

  it('renders retry button on error when onRetry provided', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <LoadingStates state="error" onRetry={onRetry} />,
    );
    fireEvent.press(getByText('Try Again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders custom retry button text', () => {
    const { getByText } = render(
      <LoadingStates state="error" onRetry={jest.fn()} retryButtonText="Reload" />,
    );
    getByText('Reload');
  });

  it('hides retry button when showRetryButton is false', () => {
    const { queryByText } = render(
      <LoadingStates state="error" onRetry={jest.fn()} showRetryButton={false} />,
    );
    expect(queryByText('Try Again')).toBeNull();
  });

  it('renders cancel button on error when onCancel provided', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <LoadingStates state="error" onCancel={onCancel} />,
    );
    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('announces state changes for screen readers', () => {
    const { ScreenReaderUtils } = require('../../../src/utils/accessibility');
    render(<LoadingStates state="loading" />);
    expect(ScreenReaderUtils.announce).toHaveBeenCalledWith('Loading, please wait');
  });

  it('does not announce when announceStateChanges is false', () => {
    const { ScreenReaderUtils } = require('../../../src/utils/accessibility');
    ScreenReaderUtils.announce.mockClear();
    render(<LoadingStates state="loading" announceStateChanges={false} />);
    expect(ScreenReaderUtils.announce).not.toHaveBeenCalled();
  });
});

describe('useLoadingState', () => {
  it('starts with idle state by default', () => {
    const { result } = renderHook(() => useLoadingState());
    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeUndefined();
    expect(result.current.success).toBeUndefined();
  });

  it('starts with provided initial state', () => {
    const { result } = renderHook(() => useLoadingState('loading'));
    expect(result.current.state).toBe('loading');
  });

  it('transitions to loading', () => {
    const { result } = renderHook(() => useLoadingState());
    act(() => result.current.setLoading());
    expect(result.current.state).toBe('loading');
  });

  it('transitions to success with message', () => {
    const { result } = renderHook(() => useLoadingState());
    act(() => result.current.setLoadingSuccess('Done!'));
    expect(result.current.state).toBe('success');
    expect(result.current.success).toBe('Done!');
  });

  it('transitions to error with message', () => {
    const { result } = renderHook(() => useLoadingState());
    act(() => result.current.setLoadingError('Failed'));
    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe('Failed');
  });

  it('transitions to timeout', () => {
    const { result } = renderHook(() => useLoadingState());
    act(() => result.current.setLoadingTimeout());
    expect(result.current.state).toBe('timeout');
  });

  it('resets to idle', () => {
    const { result } = renderHook(() => useLoadingState());
    act(() => result.current.setLoadingError('err'));
    act(() => result.current.reset());
    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeUndefined();
  });

  it('retries by setting state to loading', () => {
    const { result } = renderHook(() => useLoadingState());
    act(() => result.current.setLoadingError('err'));
    act(() => result.current.retry());
    expect(result.current.state).toBe('loading');
    expect(result.current.error).toBeUndefined();
  });
});
