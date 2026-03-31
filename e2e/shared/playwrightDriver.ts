/**
 * PlaywrightDriver — adapts Playwright Page to the shared E2EDriver interface.
 *
 * Runs against RN Web in a headless browser. Fast, CI-friendly.
 * Catches: broken navigation, missing screens, import errors, testID regressions.
 * Does NOT catch: native keyboard, gestures, WebView auto-fill, native overlays.
 */
import { expect, type Page } from '@playwright/test';
import type { E2EDriver } from './e2eDriver';

export class PlaywrightDriver implements E2EDriver {
  constructor(private page: Page) {}

  async tapById(testID: string): Promise<void> {
    await this.page.getByTestId(testID).click({ timeout: 10000 });
  }

  async fillById(testID: string, value: string): Promise<void> {
    await this.page.getByTestId(testID).fill(value, { timeout: 10000 });
  }

  async tapText(text: string): Promise<void> {
    await this.page.getByText(text, { exact: true }).click({ timeout: 10000 });
  }

  async assertVisible(text: string, opts?: { timeout?: number }): Promise<void> {
    await expect(this.page.getByText(text).first()).toBeVisible({
      timeout: opts?.timeout ?? 10000,
    });
  }

  async assertVisibleId(testID: string, opts?: { timeout?: number }): Promise<void> {
    await expect(this.page.getByTestId(testID)).toBeVisible({
      timeout: opts?.timeout ?? 10000,
    });
  }

  async screenshot(_name: string): Promise<void> {
    // No-op in Playwright — screenshots are taken automatically on failure
  }

  async sleep(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  async tap(_x: number, _y: number): Promise<void> {
    // Coordinate taps are for native overlays — skip in Playwright
    // Tests that depend on this will diverge (expected — that's why mobile E2E exists)
  }

  async handleAlert(_buttonText: string): Promise<void> {
    // Playwright auto-accepts dialogs via page.on('dialog') in test setup
  }
}
