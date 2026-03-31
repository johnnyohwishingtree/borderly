/**
 * MobileDriverAdapter — adapts MobileDriver to the shared E2EDriver interface.
 *
 * Runs against a real iOS simulator via mobilecli. Slow, local-only.
 * Catches everything including native-specific issues.
 */
import { resolve } from 'path';
import { MobileDriver } from '../mobile/driver';
import type { E2EDriver } from './e2eDriver';

const SCREENSHOTS = resolve(__dirname, '../screenshots');

export class MobileDriverAdapter implements E2EDriver {
  constructor(private device: MobileDriver) {}

  static async connect(): Promise<MobileDriverAdapter> {
    const device = await MobileDriver.connect();
    return new MobileDriverAdapter(device);
  }

  get raw(): MobileDriver {
    return this.device;
  }

  async tapById(testID: string): Promise<void> {
    await this.device.tapById(testID);
  }

  async fillById(testID: string, value: string): Promise<void> {
    await this.device.fillById(testID, value);
  }

  async tapText(text: string): Promise<void> {
    await this.device.tapText(text);
  }

  async assertVisible(text: string, opts?: { timeout?: number }): Promise<void> {
    await this.device.assertVisible(text, opts);
  }

  async assertVisibleId(testID: string, opts?: { timeout?: number }): Promise<void> {
    await this.device.assertVisibleId(testID, opts);
  }

  async screenshot(name: string): Promise<void> {
    await this.device.screenshot(`${SCREENSHOTS}/${name}.jpg`);
  }

  async sleep(ms: number): Promise<void> {
    await this.device.sleep(ms);
  }

  async tap(x: number, y: number): Promise<void> {
    await this.device.tap(x, y);
  }

  async handleAlert(buttonText: string): Promise<void> {
    await this.device.handleAlert(buttonText);
  }
}
