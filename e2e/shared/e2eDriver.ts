/**
 * E2EDriver — shared interface for Playwright and Mobile E2E tests.
 *
 * Both drivers implement this interface. Journey definitions use it
 * so a single journey file produces both Playwright and mobile tests.
 *
 * Playwright: fast, headless, CI — catches navigation/import breaks.
 * Mobile: simulator, slow, local — catches native-specific issues.
 */

export interface E2EDriver {
  /** Tap an element by testID. Scrolls to find it if needed. */
  tapById(testID: string): Promise<void>;

  /** Type into a field identified by testID. */
  fillById(testID: string, value: string): Promise<void>;

  /** Tap an element by its visible text. */
  tapText(text: string): Promise<void>;

  /** Assert text is visible on screen. */
  assertVisible(text: string, opts?: { timeout?: number }): Promise<void>;

  /** Assert a testID is visible on screen. */
  assertVisibleId(testID: string, opts?: { timeout?: number }): Promise<void>;

  /** Save a screenshot (no-op in Playwright, saves to disk in mobile). */
  screenshot(name: string): Promise<void>;

  /** Wait for a duration (avoid if possible — use assertVisible instead). */
  sleep(ms: number): Promise<void>;

  /** Tap at raw coordinates (only for native overlays not in accessibility tree). */
  tap(x: number, y: number): Promise<void>;

  /** Dismiss a native alert dialog. */
  handleAlert(buttonText: string): Promise<void>;
}
