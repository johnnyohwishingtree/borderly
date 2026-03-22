import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { useAppStore } from '@/stores/useAppStore';

/** Default inactivity timeout in milliseconds (5 minutes). */
export const DEFAULT_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Derives the lock timeout in milliseconds from a minutes value.
 * Exported for use in tests.
 */
export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

/**
 * Hook that monitors app activity and enforces an inactivity lock.
 *
 * Behaviour:
 * - Locks **immediately** when AppState changes to 'background' or 'inactive'.
 * - Starts a foreground inactivity timer when the app is active; locks the app
 *   when the timer fires.
 * - `resetTimer()` resets the inactivity timer (call from touch handlers).
 * - Timeout duration is read from `useAppStore.lockTimeoutMinutes`
 *   (default 5 minutes).
 * - All lifecycle effects are cleaned up on unmount to prevent memory leaks.
 *
 * Security rule from CLAUDE.md: App lock after 5 minutes of inactivity.
 */
export function useAppLock() {
  const { isAppLocked, lock, unlock, updateLastActiveTime, isLockEnabled, lockTimeoutMinutes } =
    useAppStore();

  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref to the latest timeout so the timer callback always uses the
  // current value without requiring re-registration of effects.
  const lockTimeoutMsRef = useRef<number>(minutesToMs(lockTimeoutMinutes));
  useEffect(() => {
    lockTimeoutMsRef.current = minutesToMs(lockTimeoutMinutes);
  }, [lockTimeoutMinutes]);

  const cancelLockTimer = useCallback(() => {
    if (lockTimerRef.current !== null) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  /** (Re)start the foreground inactivity timer. */
  const scheduleLockTimer = useCallback(() => {
    cancelLockTimer();
    lockTimerRef.current = setTimeout(() => {
      lock();
    }, lockTimeoutMsRef.current);
  }, [cancelLockTimer, lock]);

  /**
   * Reset the inactivity timer — call this on any user interaction.
   * Also updates the last-active timestamp in the store.
   */
  const resetTimer = useCallback(() => {
    updateLastActiveTime();
    scheduleLockTimer();
  }, [updateLastActiveTime, scheduleLockTimer]);

  useEffect(() => {
    // Only enforce the lock when the feature is enabled.
    if (!isLockEnabled) {
      return;
    }

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Lock immediately when the app moves to the background.
        cancelLockTimer();
        lock();
      } else if (nextState === 'active') {
        // App came back to the foreground — (re)start the inactivity timer.
        scheduleLockTimer();
      }
    };

    // Start the inactivity timer immediately on mount.
    scheduleLockTimer();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      cancelLockTimer();
    };
  }, [isLockEnabled, lock, scheduleLockTimer, cancelLockTimer]);

  /** Attempt biometric unlock and clear the locked state on success. */
  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      await Keychain.getGenericPassword({
        service: 'borderly_lock_check',
        authenticationPrompt: {
          title: 'Unlock Borderly',
          subtitle: 'Authenticate to continue',
          cancel: 'Cancel',
        },
      });
      // Any non-throwing result means authentication succeeded.
      unlock();
      updateLastActiveTime();
      scheduleLockTimer();
      return true;
    } catch {
      // User cancelled or biometrics failed — keep locked.
      return false;
    }
  }, [unlock, updateLastActiveTime, scheduleLockTimer]);

  return {
    isAppLocked,
    lock,
    unlock,
    resetTimer,
    unlockWithBiometrics,
  };
}
