/**
 * MobileDriver — thin wrapper around mobilecli for E2E testing.
 *
 * Same tool chain used by mobile-mcp (Claude debugging) and CI tests.
 * No AI needed at runtime — all operations are deterministic.
 *
 * Usage:
 *   const device = await MobileDriver.connect();
 *   await device.launch('com.borderly.app', { clearState: true });
 *   await device.tapById('take-tutorial-button');
 *   await device.assertVisible('Welcome to');
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';

const exec = promisify(execFile);

// Resolve mobilecli binary for current platform
const PLATFORM = process.platform === 'win32' ? 'windows' : process.platform === 'linux' ? 'linux' : 'darwin';
const ARCH = process.arch === 'x64' ? 'amd64' : 'arm64';
const EXT = process.platform === 'win32' ? '.exe' : '';
const CLI = resolve(__dirname, `../../node_modules/@mobilenext/mobilecli/bin/mobilecli-${PLATFORM}-${ARCH}${EXT}`);

export interface ElementInfo {
  type: string;
  label?: string;
  name?: string;
  value?: string;
  identifier?: string;
  rect: { x: number; y: number; width: number; height: number };
}

export interface ScreenSize {
  width: number;
  height: number;
}

export class MobileDriver {
  constructor(public readonly deviceId: string) {}

  /** Connect to the first booted iOS simulator. */
  static async connect(): Promise<MobileDriver> {
    const result = await exec(CLI, ['devices']);
    const data = JSON.parse(result.stdout);
    const booted = data.data?.devices?.find(
      (d: { state: string; platform: string }) => d.state === 'online' && d.platform === 'ios',
    );
    if (!booted) throw new Error('No booted iOS simulator found');
    return new MobileDriver(booted.id);
  }

  // ── Low-level CLI calls ──

  private async cli(args: string[]): Promise<string> {
    const fullArgs = [...args, '--device', this.deviceId];
    try {
      const result = await exec(CLI, fullArgs, { timeout: 30000 });
      return result.stdout;
    } catch (err: unknown) {
      const e = err as { stderr?: string; stdout?: string };
      // Some commands output JSON to stdout even on non-zero exit
      if (e.stdout) return e.stdout;
      throw new Error(`mobilecli ${args.join(' ')} failed: ${e.stderr || err}`);
    }
  }

  private async cliJson<T>(args: string[]): Promise<T> {
    const stdout = await this.cli(args);
    try {
      return JSON.parse(stdout);
    } catch {
      throw new Error(`mobilecli ${args.join(' ')} returned non-JSON: ${stdout.slice(0, 200)}`);
    }
  }

  // ── Device operations ──

  async launch(packageName: string, opts?: { clearState?: boolean }): Promise<void> {
    if (opts?.clearState) {
      try {
        await this.cli(['apps', 'terminate', packageName]);
      } catch { /* app might not be running */ }
      await exec('xcrun', ['simctl', 'uninstall', this.deviceId, packageName]);
      // Reinstall from DerivedData
      const appPath = await this.findAppBundle();
      await exec('xcrun', ['simctl', 'install', this.deviceId, appPath]);
    }
    await this.cli(['apps', 'launch', packageName]);
    // Wait for app to start and render first screen
    await this.sleep(3000);
  }

  async getScreenSize(): Promise<ScreenSize> {
    const stdout = await this.cli(['device', 'info']);
    const data = JSON.parse(stdout);
    return { width: data.screenWidth || 402, height: data.screenHeight || 874 };
  }

  /** List all elements currently on screen with their positions. */
  async listElements(): Promise<ElementInfo[]> {
    const data = await this.cliJson<{ status: string; data: { elements: ElementInfo[] } }>(
      ['dump', 'ui'],
    );
    return data?.data?.elements ?? [];
  }

  /** Find an element by testID (identifier field). */
  async findById(testID: string): Promise<ElementInfo | null> {
    const elements = await this.listElements();
    return elements.find(el => el.identifier === testID || el.name === testID) ?? null;
  }

  // ── Interactions ──

  async tap(x: number, y: number): Promise<void> {
    await this.cli(['io', 'tap', `${Math.round(x)},${Math.round(y)}`]);
  }

  async swipe(direction: 'up' | 'down' | 'left' | 'right'): Promise<void> {
    // Screen coordinates: swipe "up" = scroll content down (finger moves up)
    const cx = 201; // center x for iPhone
    switch (direction) {
      case 'up':   await this.cli(['io', 'swipe', `${cx},700,${cx},200`]); break;
      case 'down': await this.cli(['io', 'swipe', `${cx},200,${cx},700`]); break;
      case 'left': await this.cli(['io', 'swipe', '350,437,50,437']); break;
      case 'right': await this.cli(['io', 'swipe', '50,437,350,437']); break;
    }
  }

  async typeText(text: string): Promise<void> {
    await this.cli(['io', 'text', text]);
  }

  async screenshot(path: string): Promise<void> {
    await this.cli(['screenshot', '-o', path, '-f', 'jpeg', '-q', '50']);
  }

  // ── Smart helpers (same logic mobile-mcp + Claude uses) ──

  /**
   * Tap an element by testID. If not visible, swipes down and retries.
   * This is the core helper — same approach Claude uses via mobile-mcp.
   */
  async tapById(testID: string, opts?: { maxSwipes?: number; swipeDirection?: 'up' | 'down' }): Promise<void> {
    const maxSwipes = opts?.maxSwipes ?? 5;
    const direction = opts?.swipeDirection ?? 'up'; // swipe up = scroll down

    // First check: is it visible right now?
    let el = await this.findById(testID);
    if (el) {
      await this.tapElement(el);
      return;
    }

    // Not visible — swipe and retry
    for (let i = 0; i < maxSwipes; i++) {
      await this.swipe(direction);
      await this.sleep(300); // wait for scroll to settle
      el = await this.findById(testID);
      if (el) {
        await this.tapElement(el);
        return;
      }
    }

    throw new Error(`tapById: element "${testID}" not found after ${maxSwipes} swipes`);
  }

  /** Type into a field by testID — taps the field, types, dismisses keyboard. */
  async fillById(testID: string, text: string): Promise<void> {
    await this.tapById(testID);
    await this.sleep(200);
    await this.typeText(text);
    await this.sleep(200);
    // Dismiss keyboard by typing newline (triggers return key)
    await this.typeText('\n');
    await this.sleep(300);
  }

  /** Assert that text is visible on screen. */
  async assertVisible(text: string, opts?: { timeout?: number }): Promise<void> {
    const timeout = opts?.timeout ?? 3000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const elements = await this.listElements();
      const found = elements.some(
        el => el.label?.includes(text) || el.value?.includes(text) || el.name?.includes(text),
      );
      if (found) return;
      await this.sleep(200);
    }

    throw new Error(`assertVisible: "${text}" not found within ${timeout}ms`);
  }

  /** Assert that a testID is visible on screen. */
  async assertVisibleId(testID: string, opts?: { timeout?: number }): Promise<void> {
    const timeout = opts?.timeout ?? 3000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const el = await this.findById(testID);
      if (el) return;
      await this.sleep(200);
    }

    throw new Error(`assertVisibleId: "${testID}" not found within ${timeout}ms`);
  }

  /** Tap text directly (finds element by label/value text). */
  async tapText(text: string): Promise<void> {
    const elements = await this.listElements();
    const el = elements.find(
      e => (e.label === text || e.value === text || e.name === text) && e.type === 'Button',
    ) ?? elements.find(
      e => e.label === text || e.value === text || e.name === text,
    );
    if (!el) throw new Error(`tapText: "${text}" not found`);
    await this.tapElement(el);
  }

  /**
   * Select from a SearchableSelect: tap trigger → type search → Enter to select.
   * Enter triggers onSubmitEditing which selects the single matching result.
   */
  async selectById(testID: string, searchText: string): Promise<void> {
    await this.tapById(`${testID}-trigger`);
    await this.sleep(500);
    // Search field is auto-focused — type the search term
    await this.typeText(searchText);
    await this.sleep(300);
    // Press Enter to select single match (triggers onSubmitEditing)
    await this.typeText('\n');
    await this.sleep(500);
  }

  /**
   * Handle an alert — wait for title, tap button.
   */
  async handleAlert(buttonText: string, opts?: { timeout?: number }): Promise<void> {
    await this.sleep(500);
    await this.tapText(buttonText);
  }

  // ── Private helpers ──

  private async tapElement(el: ElementInfo): Promise<void> {
    const centerX = el.rect.x + el.rect.width / 2;
    const centerY = el.rect.y + el.rect.height / 2;
    await this.tap(centerX, centerY);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async findAppBundle(): Promise<string> {
    // Check DerivedData for the app bundle
    const { stdout } = await exec('find', [
      `${process.env.HOME}/Library/Developer/Xcode/DerivedData`,
      '-name', 'Borderly.app',
      '-type', 'd',
    ]);
    const path = stdout.trim().split('\n')[0];
    if (!path) throw new Error('Borderly.app not found in DerivedData — run pnpm ios first');
    return path;
  }
}
