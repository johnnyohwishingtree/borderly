import { renderHook, act } from '@testing-library/react-native';
import { useAppLock, APP_LOCK_TIMEOUT_MS } from '@/hooks/useAppLock';
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
    // Reset the store to a clean state with biometricEnabled = true.
    useAppStore.getState().setAppLocked(false);
    useAppStore.getState().updatePreference('biometricEnabled', true);
  });

  it('APP_LOCK_TIMEOUT_MS is 5 minutes', () => {
    expect(APP_LOCK_TIMEOUT_MS).toBe(5 * 60 * 1000);
  });

  it('is not locked initially', () => {
    const { result } = renderHook(() => useAppLock());
    expect(result.current.isAppLocked).toBe(false);
  });

  it('locks the app after 5 minutes of foreground inactivity', () => {
    renderHook(() => useAppLock());

    // Advance the foreground inactivity timer past the threshold.
    act(() => {
      jest.advanceTimersByTime(APP_LOCK_TIMEOUT_MS);
    });

    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  it('does NOT lock before 5 minutes', () => {
    renderHook(() => useAppLock());

    act(() => {
      jest.advanceTimersByTime(APP_LOCK_TIMEOUT_MS - 1000);
    });

    expect(useAppStore.getState().isAppLocked).toBe(false);
  });

  it('locks when returning from background after > 5 minutes', () => {
    renderHook(() => useAppLock());

    // App goes to background.
    const pastTime = Date.now();
    simulateAppState('background');

    // Simulate that more than 5 minutes pass.
    jest.setSystemTime(pastTime + APP_LOCK_TIMEOUT_MS + 1000);

    // App returns to foreground.
    simulateAppState('active');

    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  it('does NOT lock when returning from background under 5 minutes', () => {
    renderHook(() => useAppLock());

    const pastTime = Date.now();
    simulateAppState('background');

    // Simulate under 5 minutes in background.
    jest.setSystemTime(pastTime + APP_LOCK_TIMEOUT_MS - 1000);

    simulateAppState('active');

    expect(useAppStore.getState().isAppLocked).toBe(false);
  });

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

  it('does not start lock timer when biometricEnabled is false', () => {
    // Disable biometric in store.
    useAppStore.getState().updatePreference('biometricEnabled', false);

    renderHook(() => useAppLock());

    act(() => {
      jest.advanceTimersByTime(APP_LOCK_TIMEOUT_MS + 1000);
    });

    expect(useAppStore.getState().isAppLocked).toBe(false);
  });
});
