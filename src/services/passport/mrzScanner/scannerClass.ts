/**
 * MRZScanner — Stateful scanner with adaptive performance optimization.
 *
 * Manages continuous camera scanning with cooldown, memory cleanup,
 * and adaptive configuration based on device performance tier.
 */

import { processCameraText } from './mrzScanner';
import {
  defaultScannerConfig,
  performanceConfigs,
  type TextRecognition,
  type ScanResult,
  type ScannerConfig,
} from './mrzScannerTypes';

export class MRZScanner {
  private lastScanTime = 0;
  private scanAttempts = 0;
  private lastSuccessfulScan: ScanResult | null = null;
  private isDisposed = false;
  private memoryUsage = {
    totalFramesProcessed: 0,
    lastMemoryCleanup: Date.now(),
    maxRetainedScans: 5,
    framesSkipped: 0,
    avgProcessingTime: 0,
  };
  private performanceMetrics = {
    successRate: 0,
    averageAttempts: 0,
    recentScans: [] as number[],
  };
  private adaptiveConfig: ScannerConfig;

  constructor(
    config: ScannerConfig = defaultScannerConfig,
    private deviceTier: 'low' | 'medium' | 'high' = 'medium',
  ) {
    this.adaptiveConfig = {
      ...config,
      ...performanceConfigs[deviceTier],
    };
  }

  processFrame(textRecognition: TextRecognition): ScanResult {
    if (this.isDisposed) {
      throw new Error('Scanner has been disposed');
    }

    const now = Date.now();
    const frameStart = performance.now();

    const adaptiveCooldown = this.calculateAdaptiveCooldown();
    if (now - this.lastScanTime < adaptiveCooldown) {
      this.memoryUsage.framesSkipped++;
      return this.lastSuccessfulScan || {
        type: 'no_mrz',
        confidence: 0,
        guidance: 'Scanning...',
      };
    }

    this.lastScanTime = now;
    this.scanAttempts++;
    this.memoryUsage.totalFramesProcessed++;

    const cleanupInterval = this.deviceTier === 'low' ? 15000 : 30000;
    if (now - this.memoryUsage.lastMemoryCleanup > cleanupInterval) {
      this.performMemoryCleanup();
    }

    const result = processCameraText(textRecognition, this.adaptiveConfig);

    const frameTime = performance.now() - frameStart;
    this.updatePerformanceMetrics(result, frameTime);

    if (result.type === 'success' || result.type === 'partial') {
      this.lastSuccessfulScan = result;
    }

    const maxAttempts = this.calculateAdaptiveMaxAttempts();
    if (this.scanAttempts >= maxAttempts && result.type !== 'success') {
      return {
        ...result,
        guidance: 'Scan taking too long. Try manual entry instead',
      };
    }

    return result;
  }

  reset(): void {
    if (this.isDisposed) return;
    this.lastScanTime = 0;
    this.scanAttempts = 0;
    this.lastSuccessfulScan = null;
    this.memoryUsage.totalFramesProcessed = 0;
    this.memoryUsage.lastMemoryCleanup = Date.now();
  }

  getStats(): {
    attempts: number;
    lastScan: ScanResult | null;
    memoryUsage: {
      totalFramesProcessed: number;
      lastMemoryCleanup: number;
      maxRetainedScans: number;
    };
  } {
    return {
      attempts: this.scanAttempts,
      lastScan: this.lastSuccessfulScan,
      memoryUsage: { ...this.memoryUsage },
    };
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.lastSuccessfulScan = null;
    this.lastScanTime = 0;
    this.scanAttempts = 0;
    this.memoryUsage = {
      totalFramesProcessed: 0,
      lastMemoryCleanup: 0,
      maxRetainedScans: 0,
      framesSkipped: 0,
      avgProcessingTime: 0,
    };
  }

  isDisposedState(): boolean {
    return this.isDisposed;
  }

  getPerformanceMetrics(): {
    successRate: number;
    averageAttempts: number;
    avgProcessingTime: number;
    framesSkipped: number;
    deviceTier: string;
  } {
    return {
      successRate: this.performanceMetrics.successRate,
      averageAttempts: this.performanceMetrics.averageAttempts,
      avgProcessingTime: this.memoryUsage.avgProcessingTime,
      framesSkipped: this.memoryUsage.framesSkipped,
      deviceTier: this.deviceTier,
    };
  }

  private performMemoryCleanup(): void {
    if (this.isDisposed) return;
    if (this.lastSuccessfulScan) {
      this.lastSuccessfulScan = {
        type: this.lastSuccessfulScan.type,
        confidence: this.lastSuccessfulScan.confidence,
        guidance: this.lastSuccessfulScan.guidance,
      };
    }
    this.memoryUsage.lastMemoryCleanup = Date.now();

    if (__DEV__ && (globalThis as { gc?: () => void }).gc) {
      (globalThis as { gc?: () => void }).gc!();
    }
  }

  private calculateAdaptiveCooldown(): number {
    const baseCooldown = this.adaptiveConfig.scanCooldownMs;
    if (this.deviceTier === 'low') return baseCooldown * 1.5;
    if (this.performanceMetrics.successRate > 0.7) return baseCooldown * 0.8;
    return baseCooldown;
  }

  private calculateAdaptiveMaxAttempts(): number {
    const baseAttempts = this.adaptiveConfig.maxScanAttempts;
    if (this.deviceTier === 'low') return Math.min(baseAttempts * 1.5, 20);
    if (this.performanceMetrics.successRate < 0.3 && this.scanAttempts > 5) {
      return Math.max(baseAttempts * 0.7, 5);
    }
    return baseAttempts;
  }

  private updatePerformanceMetrics(result: ScanResult, processingTime: number): void {
    this.memoryUsage.avgProcessingTime =
      this.memoryUsage.avgProcessingTime * 0.9 + processingTime * 0.1;

    this.performanceMetrics.recentScans.push(result.type === 'success' ? 1 : 0);
    if (this.performanceMetrics.recentScans.length > 20) {
      this.performanceMetrics.recentScans.shift();
    }

    const recentSuccesses = this.performanceMetrics.recentScans.reduce((a, b) => a + b, 0);
    this.performanceMetrics.successRate =
      recentSuccesses / this.performanceMetrics.recentScans.length;

    this.performanceMetrics.averageAttempts =
      this.performanceMetrics.averageAttempts * 0.9 + this.scanAttempts * 0.1;
  }
}
