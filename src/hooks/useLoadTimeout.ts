import { useState, useRef, useCallback, useEffect } from 'react';

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Manages a load timeout for WebView page loads.
 * Starts a timer on load start; sets an error if the timer expires
 * before the load completes. Clears on successful load or manual reset.
 */
export function useLoadTimeout(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setLoadError(null);
    loadTimerRef.current = setTimeout(() => {
      setLoadError('The page took too long to load. Please try again or continue manually.');
    }, timeoutMs);
  }, [clearTimer, timeoutMs]);

  const onLoadComplete = useCallback(() => {
    clearTimer();
    setLoadError(null);
  }, [clearTimer]);

  const onWebViewError = useCallback((_errorMessage: string) => {
    clearTimer();
    setLoadError('Failed to load the portal. Please check your connection and try again.');
  }, [clearTimer]);

  const clearError = useCallback(() => {
    setLoadError(null);
  }, []);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return {
    loadError,
    startTimer,
    onLoadComplete,
    onWebViewError,
    clearError,
  };
}
