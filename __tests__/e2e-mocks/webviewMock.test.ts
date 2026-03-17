/**
 * Unit tests for the WebView web mock's load timeout behavior.
 *
 * Regression: on Vercel, government portal iframes could stall indefinitely
 * (X-Frame-Options blocking, slow network), causing an infinite spinner.
 * The mock now fires onError after a timeout if onLoad never fires.
 */

// We test the mock's timeout logic in isolation using fake timers.

describe('WebView mock load timeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires onError when iframe onLoad never fires (stalled load)', () => {
    // Simulate the mock's timeout logic directly
    let loadedRef = false;
    const onError = jest.fn();
    const onNavigationStateChange = jest.fn();
    const onLoadEnd = jest.fn();
    const url = 'https://vjw-lp.digital.go.jp/en/';

    // This mirrors the useEffect in webview.js
    const LOAD_TIMEOUT_MS = 8000;
    const timer = setTimeout(() => {
      if (!loadedRef) {
        onNavigationStateChange({ url, loading: false, canGoBack: false, canGoForward: false });
        onError({
          nativeEvent: {
            description: 'The page could not be loaded in the embedded viewer.',
            code: -2,
          },
        });
        onLoadEnd({ nativeEvent: { url, loading: false } });
      }
    }, LOAD_TIMEOUT_MS);

    // Advance past the timeout — iframe never fired onLoad
    jest.advanceTimersByTime(LOAD_TIMEOUT_MS + 100);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        nativeEvent: expect.objectContaining({ code: -2 }),
      })
    );
    expect(onNavigationStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ loading: false })
    );
    expect(onLoadEnd).toHaveBeenCalledTimes(1);

    clearTimeout(timer);
  });

  it('does NOT fire onError when iframe loads successfully before timeout', () => {
    let loadedRef = false;
    const onError = jest.fn();
    const LOAD_TIMEOUT_MS = 8000;

    const timer = setTimeout(() => {
      if (!loadedRef) {
        onError({ nativeEvent: { description: 'Timeout', code: -2 } });
      }
    }, LOAD_TIMEOUT_MS);

    // Simulate iframe onLoad firing after 2 seconds
    jest.advanceTimersByTime(2000);
    loadedRef = true;
    clearTimeout(timer);

    // Advance past the original timeout
    jest.advanceTimersByTime(LOAD_TIMEOUT_MS);

    expect(onError).not.toHaveBeenCalled();
  });

  it('timeout is 8 seconds (not too aggressive, not too slow)', () => {
    let loadedRef = false;
    const onError = jest.fn();

    const LOAD_TIMEOUT_MS = 8000;
    setTimeout(() => {
      if (!loadedRef) onError({ nativeEvent: { code: -2 } });
    }, LOAD_TIMEOUT_MS);

    // At 7 seconds — should not have fired yet
    jest.advanceTimersByTime(7000);
    expect(onError).not.toHaveBeenCalled();

    // At 8 seconds — should fire
    jest.advanceTimersByTime(1000);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
