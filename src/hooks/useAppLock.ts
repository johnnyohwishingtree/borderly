import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { useAppStore } from '@/stores/useAppStore';

/** Inactivity timeout before the app locks (5 minutes in milliseconds). */
export const APP_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Hook that monitors app activity and enforces the 5-minute inactivity lock
 * described in CLAUDE.md security rules.
 *
 * - Tracks the timestamp when the app moves to the background.
 * - On returning to the foreground, checks whether more than
 *   {@link APP_LOCK_TIMEOUT_MS} have elapsed and locks the app if so.
 * - Exposes `unlockWithBiometrics` so the lock screen can request re-auth.
 */
export function useAppLock() {
  const { isAppLocked, setAppLocked, updateLastActiveTime, preferences } = useAppStore();
  const backgroundTimeRef = useRef<number | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Attempt biometric unlock and clear the locked state on success. */
  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      const result = await Keychain.getGenericPassword({
        service: 'borderly_lock_check',
        authenticationPrompt: {
          title: 'Unlock Borderly',
          subtitle: 'Authenticate to continue',
          cancel: 'Cancel',
        },
      });
      // Any successful keychain access (result or false-y but no throw) means auth passed.
      // react-native-keychain returns false when no credentials stored but auth succeeded,
      // or an object with username/password when credentials exist.
      if (result !== null && result !== undefined) {
        setAppLocked(false);
        updateLastActiveTime();
        return true;
      }
      // If the service has no stored credentials that's still an auth success path.
      setAppLocked(false);
      updateLastActiveTime();
      return true;
    } catch {
      // User cancelled or biometrics failed — keep locked.
      return false;
    }
  }, [setAppLocked, updateLastActiveTime]);

  /** Schedule an in-foreground inactivity lock timer. */
  const scheduleLockTimer = useCallback(() => {
    if (lockTimerRef.current !== null) {
      clearTimeout(lockTimerRef.current);
    }
    lockTimerRef.current = setTimeout(() => {
      setAppLocked(true);
    }, APP_LOCK_TIMEOUT_MS);
  }, [setAppLocked]);

  const cancelLockTimer = useCallback(() => {
    if (lockTimerRef.current !== null) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Only enforce the lock when biometric is enabled.
    if (!preferences.biometricEnabled) {
      return;
    }

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Record when we went to background and cancel the foreground timer.
        backgroundTimeRef.current = Date.now();
        cancelLockTimer();
      } else if (nextState === 'active') {
        // Back in the foreground — check elapsed time.
        if (backgroundTimeRef.current !== null) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          if (elapsed >= APP_LOCK_TIMEOUT_MS) {
            setAppLocked(true);
          }
          backgroundTimeRef.current = null;
        }
        // (Re)start the foreground inactivity timer.
        scheduleLockTimer();
      }
    };

    // Start foreground timer immediately.
    scheduleLockTimer();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      cancelLockTimer();
    };
  }, [preferences.biometricEnabled, setAppLocked, scheduleLockTimer, cancelLockTimer]);

  return { isAppLocked, unlockWithBiometrics };
}
