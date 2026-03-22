import { renderHook, act } from '@testing-library/react-native';
import { useAppLock, DEFAULT_LOCK_TIMEOUT_MS, minutesToMs } from '@/hooks/useAppLock';
import { useAppStore } from '@/stores/useAppStore';
import { AppState } from 'react-native';

jest.useFakeTimers();

// ──────────────────────────────────────────────────────────────────────────────
// Helpers — fire the registered AppState listener
// ──────────────────────────────────────────────────────────────────────────────

function getAppStateListener(): ((state: string) => void) | null {
  const addEventListenerMock = jest.mocked(AppState.addEventListener);
  const calls = addEventListenerMock.mock.calls;
  const lastCall = calls[calls.length - 1];
  return lastCall ? (lastCall[1] as (state: string) => void) : null;
}

function simulateAppState(state: string) {
  act(() => {
    getAppStateListener()?.(state);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('useAppLock', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    // Reset the store to a clean state with lock enabled and default timeout.
    useAppStore.getState().setAppLocked(false);
    useAppStore.getState().setLockEnabled(true);
    useAppStore.getState().setLockTimeoutMinutes(5);
  });

  // ── Constants ─────────────────────────────────────────────────────────────

  it('DEFAULT_LOCK_TIMEOUT_MS is 5 minutes', () => {
    expect(DEFAULT_LOCK_TIMEOUT_MS).toBe(5 * 60 * 1000);
  });

  it('minutesToMs converts minutes to milliseconds', () => {
    expect(minutesToMs(1)).toBe(60_000);
    expect(minutesToMs(5)).toBe(300_000);
    expect(minutesToMs(10)).toBe(600_000);
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  it('is not locked initially', () => {
    const { result } = renderHook(() => useAppLock());
    expect(result.current.isAppLocked).toBe(false);
  });

  it('exposes lock, unlock, resetTimer, and unlockWithBiometrics', () => {
    const { result } = renderHook(() => useAppLock());
    expect(typeof result.current.lock).toBe('function');
    expect(typeof result.current.unlock).toBe('function');
    expect(typeof result.current.resetTimer).toBe('function');
    expect(typeof result.current.unlockWithBiometrics).toBe('function');
  });

  // ── Foreground inactivity timer ───────────────────────────────────────────

  it('locks the app after the configured inactivity timeout', () => {
    renderHook(() => useAppLock());

    act(() => {
      jest.advanceTimersByTime(minutesToMs(5));
    });

    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  it('does NOT lock before the timeout elapses', () => {
    renderHook(() => useAppLock());

    act(() => {
      jest.advanceTimersByTime(minutesToMs(5) - 1000);
    });

    expect(useAppStore.getState().isAppLocked).toBe(false);
  });

  it('respects a custom lockTimeoutMinutes value', () => {
    useAppStore.getState().setLockTimeoutMinutes(2);

    renderHook(() => useAppLock());

    // Should NOT lock at 1:59.
    act(() => {
      jest.advanceTimersByTime(minutesToMs(2) - 1000);
    });
    expect(useAppStore.getState().isAppLocked).toBe(false);

    // Should lock at exactly 2 minutes.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  // ── AppState — background / inactive ─────────────────────────────────────

  it('locks immediately when app goes to background', () => {
    renderHook(() => useAppLock());

    simulateAppState('background');

    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  it('locks immediately when app becomes inactive', () => {
    renderHook(() => useAppLock());

    simulateAppState('inactive');

    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  it('(re)starts the inactivity timer when app returns to active', () => {
    renderHook(() => useAppLock());

    simulateAppState('background');
    expect(useAppStore.getState().isAppLocked).toBe(true);

    // Manually unlock, simulate returning to active.
    act(() => {
      useAppStore.getState().setAppLocked(false);
    });
    simulateAppState('active');

    // Should NOT be locked yet — timer just started.
    act(() => {
      jest.advanceTimersByTime(minutesToMs(5) - 1000);
    });
    expect(useAppStore.getState().isAppLocked).toBe(false);

    // Lock should fire after full timeout.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  // ── resetTimer ────────────────────────────────────────────────────────────

  it('resetTimer prevents lock by restarting the timer', () => {
    const { result } = renderHook(() => useAppLock());

    // Advance to just before the timeout.
    act(() => {
      jest.advanceTimersByTime(minutesToMs(5) - 1000);
    });
    expect(useAppStore.getState().isAppLocked).toBe(false);

    // Reset the timer — should restart the full 5-minute window.
    act(() => {
      result.current.resetTimer();
    });

    // Advance another 4 minutes 59 seconds — still within new window.
    act(() => {
      jest.advanceTimersByTime(minutesToMs(5) - 1000);
    });
    expect(useAppStore.getState().isAppLocked).toBe(false);

    // Now pass the full timeout from the reset point.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  // ── lock / unlock ─────────────────────────────────────────────────────────

  it('lock() sets isAppLocked to true', () => {
    const { result } = renderHook(() => useAppLock());

    act(() => {
      result.current.lock();
    });

    expect(result.current.isAppLocked).toBe(true);
  });

  it('unlock() sets isAppLocked to false', () => {
    const { result } = renderHook(() => useAppLock());

    act(() => {
      result.current.lock();
    });
    act(() => {
      result.current.unlock();
    });

    expect(result.current.isAppLocked).toBe(false);
  });

  // ── isLockEnabled = false ─────────────────────────────────────────────────

  it('does not start lock timer when isLockEnabled is false', () => {
    useAppStore.getState().setLockEnabled(false);

    renderHook(() => useAppLock());

    act(() => {
      jest.advanceTimersByTime(minutesToMs(5) + 1000);
    });

    expect(useAppStore.getState().isAppLocked).toBe(false);
  });

  it('does not lock on background when isLockEnabled is false', () => {
    useAppStore.getState().setLockEnabled(false);

    renderHook(() => useAppLock());

    simulateAppState('background');

    expect(useAppStore.getState().isAppLocked).toBe(false);
  });

  // ── unlockWithBiometrics ──────────────────────────────────────────────────

  it('unlockWithBiometrics unlocks the app on successful auth', async () => {
    const Keychain = require('react-native-keychain');
    Keychain.getGenericPassword.mockResolvedValueOnce(false);

    const { result } = renderHook(() => useAppLock());

    act(() => {
      useAppStore.getState().setAppLocked(true);
    });

    let success = false;
    await act(async () => {
      success = await result.current.unlockWithBiometrics();
    });

    expect(success).toBe(true);
    expect(useAppStore.getState().isAppLocked).toBe(false);
  });

  it('unlockWithBiometrics keeps app locked when auth is rejected', async () => {
    const Keychain = require('react-native-keychain');
    Keychain.getGenericPassword.mockRejectedValueOnce(new Error('User cancelled'));

    const { result } = renderHook(() => useAppLock());

    act(() => {
      useAppStore.getState().setAppLocked(true);
    });

    let success = true;
    await act(async () => {
      success = await result.current.unlockWithBiometrics();
    });

    expect(success).toBe(false);
    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  // ── Memory leak prevention ────────────────────────────────────────────────

  it('clears the timer on unmount to prevent memory leaks', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount } = renderHook(() => useAppLock());

    unmount();

    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0);
    clearTimeoutSpy.mockRestore();
  });

  it('removes the AppState listener on unmount', () => {
    const removeMock = jest.fn();
    jest.mocked(AppState.addEventListener).mockReturnValueOnce({
      remove: removeMock,
    } as ReturnType<typeof AppState.addEventListener>);

    const { unmount } = renderHook(() => useAppLock());

    unmount();

    expect(removeMock).toHaveBeenCalled();
  });
});
