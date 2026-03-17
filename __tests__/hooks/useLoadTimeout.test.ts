import { renderHook, act } from '@testing-library/react-native';
import { useLoadTimeout } from '@/hooks/useLoadTimeout';

jest.useFakeTimers();

describe('useLoadTimeout', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('starts with no error', () => {
    const { result } = renderHook(() => useLoadTimeout());
    expect(result.current.loadError).toBeNull();
  });

  it('sets error after timeout expires', () => {
    const { result } = renderHook(() => useLoadTimeout(5000));

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.loadError).toBe(
      'The page took too long to load. Please try again or continue manually.'
    );
  });

  it('does not set error if load completes before timeout', () => {
    const { result } = renderHook(() => useLoadTimeout(5000));

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    act(() => {
      result.current.onLoadComplete();
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.loadError).toBeNull();
  });

  it('sets a generic error on webview error', () => {
    const { result } = renderHook(() => useLoadTimeout());

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      result.current.onWebViewError('net::ERR_CONNECTION_REFUSED');
    });

    expect(result.current.loadError).toBe(
      'Failed to load the portal. Please check your connection and try again.'
    );
  });

  it('clearError resets the error to null', () => {
    const { result } = renderHook(() => useLoadTimeout(100));

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.loadError).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.loadError).toBeNull();
  });

  it('uses default timeout of 30s', () => {
    const { result } = renderHook(() => useLoadTimeout());

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(29999);
    });

    expect(result.current.loadError).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(result.current.loadError).not.toBeNull();
  });

  it('restarts the timer on consecutive startTimer calls', () => {
    const { result } = renderHook(() => useLoadTimeout(5000));

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    // Restart — should reset the 5s window
    act(() => {
      result.current.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(result.current.loadError).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.loadError).not.toBeNull();
  });
});
