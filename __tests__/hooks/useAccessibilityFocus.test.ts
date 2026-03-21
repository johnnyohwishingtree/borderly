import { renderHook, act } from '@testing-library/react-native';
import { AccessibilityInfo, findNodeHandle } from 'react-native';
import { useAccessibilityFocus } from '@/hooks/useAccessibilityFocus';

jest.useFakeTimers();

// AccessibilityInfo and findNodeHandle are mocked via jest.setup.js

const mockSetFocus = AccessibilityInfo.setAccessibilityFocus as jest.Mock;
const mockFindNodeHandle = findNodeHandle as jest.Mock;

describe('useAccessibilityFocus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('returns a ref and focusElement callback', () => {
    const { result } = renderHook(() => useAccessibilityFocus());
    expect(result.current.ref).toBeDefined();
    expect(typeof result.current.focusElement).toBe('function');
  });

  it('does not call setAccessibilityFocus when shouldFocus is false', () => {
    renderHook(() => useAccessibilityFocus({ shouldFocus: false }));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockSetFocus).not.toHaveBeenCalled();
  });

  it('calls setAccessibilityFocus after delay when shouldFocus becomes true', () => {
    mockFindNodeHandle.mockReturnValue(42);

    const { result, rerender } = renderHook(
      ({ shouldFocus }: { shouldFocus: boolean }) => useAccessibilityFocus({ shouldFocus, delay: 300 }),
      { initialProps: { shouldFocus: false } }
    );

    // Assign a fake node to the ref so findNodeHandle has something to work with
    (result.current.ref as React.MutableRefObject<unknown>).current = {};

    rerender({ shouldFocus: true });

    // Should not be called immediately
    expect(mockSetFocus).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockSetFocus).toHaveBeenCalledWith(42);
  });

  it('respects custom delay', () => {
    mockFindNodeHandle.mockReturnValue(99);

    const { result } = renderHook(() =>
      useAccessibilityFocus({ shouldFocus: true, delay: 500 })
    );
    (result.current.ref as React.MutableRefObject<unknown>).current = {};

    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(mockSetFocus).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockSetFocus).toHaveBeenCalledWith(99);
  });

  it('does not call setAccessibilityFocus when ref is null', () => {
    renderHook(() => useAccessibilityFocus({ shouldFocus: true, delay: 0 }));
    // ref.current is null — findNodeHandle will not be called
    act(() => {
      jest.runAllTimers();
    });
    expect(mockSetFocus).not.toHaveBeenCalled();
  });

  it('focusElement calls setAccessibilityFocus imperatively', () => {
    mockFindNodeHandle.mockReturnValue(77);

    const { result } = renderHook(() => useAccessibilityFocus());
    (result.current.ref as React.MutableRefObject<unknown>).current = {};

    act(() => {
      result.current.focusElement();
    });

    expect(mockSetFocus).toHaveBeenCalledWith(77);
  });

  it('focusElement does nothing when ref is null', () => {
    const { result } = renderHook(() => useAccessibilityFocus());
    // ref.current is null (default)
    act(() => {
      result.current.focusElement();
    });
    expect(mockSetFocus).not.toHaveBeenCalled();
  });

  it('clears the timer on unmount to prevent stale focus calls', () => {
    mockFindNodeHandle.mockReturnValue(10);

    const { result, unmount } = renderHook(() =>
      useAccessibilityFocus({ shouldFocus: true, delay: 300 })
    );
    (result.current.ref as React.MutableRefObject<unknown>).current = {};

    unmount();

    // Advancing timers after unmount should not cause focus to be set
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(mockSetFocus).not.toHaveBeenCalled();
  });

  it('does not focus when findNodeHandle returns null', () => {
    mockFindNodeHandle.mockReturnValue(null);

    const { result } = renderHook(() => useAccessibilityFocus({ shouldFocus: true, delay: 0 }));
    (result.current.ref as React.MutableRefObject<unknown>).current = {};

    act(() => {
      jest.runAllTimers();
    });

    expect(mockSetFocus).not.toHaveBeenCalled();
  });
});
