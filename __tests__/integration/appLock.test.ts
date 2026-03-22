/**
 * Integration test: App Lock lifecycle.
 *
 * Verifies the full lock/unlock cycle using the real useAppLock hook
 * and the real useAppStore, with AppState transitions mocked.
 *
 * Scenario:
 *   1. App starts in an unlocked state
 *   2. Lock is enabled via the store
 *   3. Hook is rendered — inactivity timer starts
 *   4. AppState goes to 'background' → app locks immediately
 *   5. AppState comes back to 'active' → still locked (biometric required)
 *   6. unlockWithBiometrics() is called → biometric auth succeeds → app unlocks
 *   7. Verify isAppLocked is false after successful unlock
 */

import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { useAppLock } from '@/hooks/useAppLock';
import { useAppStore } from '@/stores/useAppStore';

jest.useFakeTimers();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the most recently registered AppState change listener. */
function getAppStateListener(): ((state: AppStateStatus) => void) | null {
  const mock = jest.mocked(AppState.addEventListener);
  const calls = mock.mock.calls;
  const last = calls[calls.length - 1];
  return last ? last[1] : null;
}

function simulateAppState(state: AppStateStatus) {
  act(() => {
    getAppStateListener()?.(state);
  });
}

// ---------------------------------------------------------------------------
// Integration test
// ---------------------------------------------------------------------------

describe('App Lock — full lifecycle integration', () => {
  const mockGetGenericPassword = Keychain.getGenericPassword as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store to a clean state before each test
    useAppStore.setState({
      isAppLocked: false,
      isLockEnabled: false,
      lockTimeoutMinutes: 5,
      lastActiveTime: Date.now(),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('app starts unlocked', () => {
    // Confirm clean starting state
    expect(useAppStore.getState().isAppLocked).toBe(false);
  });

  it('app goes to background and locks immediately when lock is enabled', () => {
    // Enable the lock feature
    useAppStore.setState({ isLockEnabled: true });

    // Render the hook (registers the AppState listener and starts the timer)
    renderHook(() => useAppLock());

    // App is not locked yet (just started foreground timer)
    expect(useAppStore.getState().isAppLocked).toBe(false);

    // Simulate going to background
    simulateAppState('background');

    // App should now be locked
    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  it('app remains locked when returning to foreground after background lock', () => {
    useAppStore.setState({ isLockEnabled: true });
    renderHook(() => useAppLock());

    // Go to background → app locks
    simulateAppState('background');
    expect(useAppStore.getState().isAppLocked).toBe(true);

    // Come back to active — app stays locked (biometric unlock required)
    simulateAppState('active');
    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  it('app locks after inactivity timeout when lock is enabled', () => {
    useAppStore.setState({ isLockEnabled: true, lockTimeoutMinutes: 5 });
    renderHook(() => useAppLock());

    expect(useAppStore.getState().isAppLocked).toBe(false);

    // Advance time past the 5-minute inactivity timeout
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000 + 100);
    });

    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  it('biometric unlock succeeds and unlocks the app', async () => {
    // Set up: app is locked, biometric auth will succeed
    useAppStore.setState({ isLockEnabled: true, isAppLocked: true });
    mockGetGenericPassword.mockResolvedValue({ username: 'user', password: 'key' });

    const { result } = renderHook(() => useAppLock());

    // App is locked
    expect(useAppStore.getState().isAppLocked).toBe(true);

    // Attempt biometric unlock
    let unlockResult: boolean = false;
    await act(async () => {
      unlockResult = await result.current.unlockWithBiometrics();
    });

    // Biometric call should succeed
    expect(unlockResult).toBe(true);
    // App should be unlocked
    expect(useAppStore.getState().isAppLocked).toBe(false);
  });

  it('biometric unlock failure keeps the app locked', async () => {
    useAppStore.setState({ isLockEnabled: true, isAppLocked: true });
    mockGetGenericPassword.mockRejectedValue(new Error('User cancelled'));

    const { result } = renderHook(() => useAppLock());

    expect(useAppStore.getState().isAppLocked).toBe(true);

    let unlockResult: boolean = true;
    await act(async () => {
      unlockResult = await result.current.unlockWithBiometrics();
    });

    // Biometric call failed — app stays locked
    expect(unlockResult).toBe(false);
    expect(useAppStore.getState().isAppLocked).toBe(true);
  });

  it('hook does not lock when isLockEnabled is false', () => {
    // Lock is disabled — background transitions and timeouts should have no effect
    useAppStore.setState({ isLockEnabled: false });
    renderHook(() => useAppLock());

    simulateAppState('background');
    expect(useAppStore.getState().isAppLocked).toBe(false);

    simulateAppState('active');
    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(useAppStore.getState().isAppLocked).toBe(false);
  });

  it('full cycle: start unlocked → background locks → biometric succeeds → unlocked', async () => {
    useAppStore.setState({ isLockEnabled: true });
    mockGetGenericPassword.mockResolvedValue({ username: 'user', password: 'key' });

    const { result } = renderHook(() => useAppLock());

    // Start: unlocked
    expect(useAppStore.getState().isAppLocked).toBe(false);

    // Background: locked immediately
    simulateAppState('background');
    expect(useAppStore.getState().isAppLocked).toBe(true);

    // Return to foreground: still locked
    simulateAppState('active');
    expect(useAppStore.getState().isAppLocked).toBe(true);

    // Biometric auth succeeds: unlocked
    let unlocked = false;
    await act(async () => {
      unlocked = await result.current.unlockWithBiometrics();
    });
    expect(unlocked).toBe(true);
    expect(useAppStore.getState().isAppLocked).toBe(false);
  });
});
