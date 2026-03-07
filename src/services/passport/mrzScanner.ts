/**
 * MRZ Scanner Service
 * 
 * Integrates with ML Kit text recognition to scan passport MRZ zones.
 * Handles camera text recognition and real-time feedback.
 * 
 * Security: No image storage - immediate processing only.
 */

import type { TrackedTextFeature } from 'react-native-camera';

// Type for text recognition response from RNCamera
export interface TextRecognition {
  textBlocks: TrackedTextFeature[];
}
import { parseMRZ, extractMRZFromText, type MRZParseResult } from './mrzParser';

export interface ScanResult {
  type: 'success' | 'partial' | 'error' | 'no_mrz';
  mrz?: MRZParseResult;
  confidence: number;
  guidance: string; // User-facing instruction
}

export interface ScannerConfig {
  minConfidence: number; // Minimum confidence to accept scan (0-1)
  maxScanAttempts: number; // Max attempts before suggesting manual entry
  scanCooldownMs: number; // Cooldown between scans to prevent spam
}

export const defaultScannerConfig: ScannerConfig = {
  minConfidence: 0.7,
  maxScanAttempts: 10,
  scanCooldownMs: 500
};

// Performance-optimized configurations for different device tiers
export const performanceConfigs = {
  low: {
    minConfidence: 0.6,
    maxScanAttempts: 15,
    scanCooldownMs: 800,
  },
  medium: {
    minConfidence: 0.7,
    maxScanAttempts: 12,
    scanCooldownMs: 600,
  },
  high: {
    minConfidence: 0.8,
    maxScanAttempts: 8,
    scanCooldownMs: 300,
  },
};

/**
 * Process text recognition result from camera
 */
export function processCameraText(
  textRecognition: TextRecognition,
  config: ScannerConfig = defaultScannerConfig
): ScanResult {
  try {
    // Extract raw text from text blocks
    const rawText = extractRawText(textRecognition);
    
    if (!rawText || rawText.length < 80) {
      return {
        type: 'no_mrz',
        confidence: 0,
        guidance: 'Position passport so MRZ is visible in frame'
      };
    }

    // Look for MRZ pattern in text
    const mrzLines = extractMRZFromText(rawText);
    
    if (!mrzLines) {
      return {
        type: 'no_mrz',
        confidence: 0.2,
        guidance: 'Align passport MRZ (2 lines at bottom) in frame'
      };
    }

    // Parse the MRZ
    const parseResult = parseMRZ(mrzLines.line1, mrzLines.line2);
    
    if (!parseResult.success) {
      return {
        type: 'error',
        confidence: 0.1,
        guidance: 'MRZ not readable. Try better lighting or hold steady'
      };
    }

    // Check confidence threshold
    if (parseResult.confidence < config.minConfidence) {
      return {
        type: 'partial',
        mrz: parseResult,
        confidence: parseResult.confidence,
        guidance: `${Math.round(parseResult.confidence * 100)}% confident. Hold steady for better scan`
      };
    }

    return {
      type: 'success',
      mrz: parseResult,
      confidence: parseResult.confidence,
      guidance: `Scan complete (${Math.round(parseResult.confidence * 100)}% confident)`
    };

  } catch (error) {
    return {
      type: 'error',
      confidence: 0,
      guidance: 'Camera error. Please try again or enter manually'
    };
  }
}

/**
 * Extract raw text from camera text recognition result with optimizations
 */
function extractRawText(textRecognition: TextRecognition): string {
  if (!textRecognition.textBlocks || textRecognition.textBlocks.length === 0) {
    return '';
  }

  // Pre-allocate array for better performance
  const textLines: string[] = [];
  
  // Optimized text extraction with early termination for performance
  for (let i = 0; i < textRecognition.textBlocks.length && i < 50; i++) {
    const block = textRecognition.textBlocks[i];
    
    if (block.components && block.components.length > 0) {
      for (let j = 0; j < block.components.length && j < 10; j++) {
        const component = block.components[j];
        if (component.value && component.value.trim().length > 0) {
          textLines.push(component.value.trim());
        }
      }
    } else if (block.value && block.value.trim().length > 0) {
      textLines.push(block.value.trim());
    }
    
    // Early termination if we have enough text (likely found MRZ area)
    if (textLines.length > 20) {
      break;
    }
  }

  return textLines.join('\n');
}

/**
 * Scanner state management for continuous scanning with performance optimizations
 */
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
    private deviceTier: 'low' | 'medium' | 'high' = 'medium'
  ) {
    // Initialize adaptive configuration based on device performance
    this.adaptiveConfig = {
      ...config,
      ...performanceConfigs[deviceTier],
    };
  }

  /**
   * Process a new camera frame with adaptive performance optimization
   */
  processFrame(textRecognition: TextRecognition): ScanResult {
    if (this.isDisposed) {
      throw new Error('Scanner has been disposed');
    }

    const now = Date.now();
    const frameStart = performance.now();
    
    // Adaptive cooldown based on device performance and scan success rate
    const adaptiveCooldown = this.calculateAdaptiveCooldown();
    if (now - this.lastScanTime < adaptiveCooldown) {
      this.memoryUsage.framesSkipped++;
      return this.lastSuccessfulScan || {
        type: 'no_mrz',
        confidence: 0,
        guidance: 'Scanning...'
      };
    }
    
    this.lastScanTime = now;
    this.scanAttempts++;
    this.memoryUsage.totalFramesProcessed++;
    
    // Periodic memory cleanup with adaptive frequency
    const cleanupInterval = this.deviceTier === 'low' ? 15000 : 30000;
    if (now - this.memoryUsage.lastMemoryCleanup > cleanupInterval) {
      this.performMemoryCleanup();
    }
    
    const result = processCameraText(textRecognition, this.adaptiveConfig);
    
    // Track performance metrics
    const frameTime = performance.now() - frameStart;
    this.updatePerformanceMetrics(result, frameTime);
    
    // Update state
    if (result.type === 'success' || result.type === 'partial') {
      this.lastSuccessfulScan = result;
    }
    
    // Adaptive max attempts based on success rate
    const maxAttempts = this.calculateAdaptiveMaxAttempts();
    if (this.scanAttempts >= maxAttempts && result.type !== 'success') {
      return {
        ...result,
        guidance: 'Scan taking too long. Try manual entry instead'
      };
    }
    
    return result;
  }

  /**
   * Reset scanner state
   */
  reset(): void {
    if (this.isDisposed) return;
    
    this.lastScanTime = 0;
    this.scanAttempts = 0;
    this.lastSuccessfulScan = null;
    this.memoryUsage.totalFramesProcessed = 0;
    this.memoryUsage.lastMemoryCleanup = Date.now();
  }

  /**
   * Get current scan statistics
   */
  getStats(): { 
    attempts: number; 
    lastScan: ScanResult | null; 
    memoryUsage: {
      totalFramesProcessed: number;
      lastMemoryCleanup: number;
      maxRetainedScans: number;
    } 
  } {
    return {
      attempts: this.scanAttempts,
      lastScan: this.lastSuccessfulScan,
      memoryUsage: { ...this.memoryUsage }
    };
  }

  /**
   * Perform memory cleanup
   */
  private performMemoryCleanup(): void {
    if (this.isDisposed) return;
    
    // Clear old scan results to prevent memory accumulation
    if (this.lastSuccessfulScan) {
      // Keep only essential data, clear heavy objects
      this.lastSuccessfulScan = {
        type: this.lastSuccessfulScan.type,
        confidence: this.lastSuccessfulScan.confidence,
        guidance: this.lastSuccessfulScan.guidance,
        // Don't keep the full MRZ result to reduce memory usage
      };
    }
    
    this.memoryUsage.lastMemoryCleanup = Date.now();
    
    // Force garbage collection hint (if available in dev tools)
    if (__DEV__ && (globalThis as any).gc) {
      (globalThis as any).gc();
    }
  }

  /**
   * Dispose of scanner resources
   */
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

  /**
   * Check if scanner is disposed
   */
  isDisposedState(): boolean {
    return this.isDisposed;
  }

  /**
   * Calculate adaptive cooldown based on device performance and scan success rate
   */
  private calculateAdaptiveCooldown(): number {
    const baseCooldown = this.adaptiveConfig.scanCooldownMs;
    
    // Increase cooldown on low-end devices or low success rate
    if (this.deviceTier === 'low') {
      return baseCooldown * 1.5;
    }
    
    // Reduce cooldown if we have high success rate
    if (this.performanceMetrics.successRate > 0.7) {
      return baseCooldown * 0.8;
    }
    
    return baseCooldown;
  }

  /**
   * Calculate adaptive max attempts based on success rate
   */
  private calculateAdaptiveMaxAttempts(): number {
    const baseAttempts = this.adaptiveConfig.maxScanAttempts;
    
    // Give more attempts on low-end devices
    if (this.deviceTier === 'low') {
      return Math.min(baseAttempts * 1.5, 20);
    }
    
    // Reduce attempts if consistently failing
    if (this.performanceMetrics.successRate < 0.3 && this.scanAttempts > 5) {
      return Math.max(baseAttempts * 0.7, 5);
    }
    
    return baseAttempts;
  }

  /**
   * Update performance metrics for adaptive optimization
   */
  private updatePerformanceMetrics(result: ScanResult, processingTime: number): void {
    // Update processing time average
    this.memoryUsage.avgProcessingTime = 
      (this.memoryUsage.avgProcessingTime * 0.9) + (processingTime * 0.1);
    
    // Track recent scans for success rate calculation
    this.performanceMetrics.recentScans.push(result.type === 'success' ? 1 : 0);
    
    // Keep only last 20 scans for rolling average
    if (this.performanceMetrics.recentScans.length > 20) {
      this.performanceMetrics.recentScans.shift();
    }
    
    // Calculate success rate
    const recentSuccesses = this.performanceMetrics.recentScans.reduce((a, b) => a + b, 0);
    this.performanceMetrics.successRate = recentSuccesses / this.performanceMetrics.recentScans.length;
    
    // Calculate average attempts (simple approximation)
    this.performanceMetrics.averageAttempts = 
      (this.performanceMetrics.averageAttempts * 0.9) + (this.scanAttempts * 0.1);
  }

  /**
   * Get current performance metrics
   */
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
}

/**
 * Validate scanned passport data for common errors
 */
export function validateScannedPassport(result: MRZParseResult): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  if (!result.profile) {
    return { isValid: false, warnings: ['No passport data found'] };
  }
  
  const profile = result.profile;
  
  // Check required fields
  if (!profile.passportNumber || profile.passportNumber.length < 6) {
    warnings.push('Passport number appears incomplete');
  }
  
  if (!profile.surname || profile.surname.length < 2) {
    warnings.push('Surname appears incomplete');
  }
  
  if (!profile.givenNames || profile.givenNames.length < 2) {
    warnings.push('Given names appear incomplete');
  }
  
  // Check date validity
  if (profile.passportExpiry) {
    const expiryDate = new Date(profile.passportExpiry);
    const now = new Date();
    
    const SIX_MONTHS_IN_MS = 180 * 24 * 60 * 60 * 1000;
    
    if (expiryDate < now) {
      warnings.push('Passport appears to be expired');
    } else if (expiryDate.getTime() - now.getTime() < SIX_MONTHS_IN_MS) {
      warnings.push('Passport expires within 6 months');
    }
  }
  
  if (profile.dateOfBirth) {
    const birthDate = new Date(profile.dateOfBirth);
    const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    
    if (age < 0 || age > 150) {
      warnings.push('Birth date appears invalid');
    }
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * Get scanning guidance based on camera position and lighting
 */
export function getScanningGuidance(
  textRecognition: TextRecognition,
  _hasFlash: boolean
): string {
  const textCount = textRecognition.textBlocks?.length || 0;
  
  // No text detected
  if (textCount === 0) {
    return 'Position passport in frame. Ensure good lighting.';
  }
  
  // Some text but no MRZ
  if (textCount > 0 && textCount < 5) {
    return 'Move camera closer to passport. Focus on bottom area.';
  }
  
  // Lots of text (might be too far)
  if (textCount > 20) {
    return 'Move camera closer. Focus on MRZ lines at passport bottom.';
  }
  
  // Medium amount - probably in good position
  return 'Hold steady. Scanning MRZ...';
}

/**
 * Create an optimized MRZ scanner based on device performance
 */
export function createOptimizedMRZScanner(customConfig?: Partial<ScannerConfig>): MRZScanner {
  // Detect device performance tier
  const deviceTier = detectDevicePerformanceTier();
  
  // Merge custom config with performance-optimized defaults
  const config = {
    ...defaultScannerConfig,
    ...performanceConfigs[deviceTier],
    ...customConfig,
  };
  
  return new MRZScanner(config, deviceTier);
}

/**
 * Simple device performance tier detection
 */
function detectDevicePerformanceTier(): 'low' | 'medium' | 'high' {
  try {
    // Check hardware concurrency (CPU cores) if available
    const nav = typeof navigator !== 'undefined' ? navigator as any : null;
    const hardwareConcurrency = nav?.hardwareConcurrency || 2;
    
    // Check device memory if available
    const deviceMemory = nav?.deviceMemory || 2;
    
    // Check user agent for known low-end patterns if available
    const userAgent = nav?.userAgent?.toLowerCase() || '';
    const isLowEndDevice = userAgent.includes('low-end') || 
      userAgent.includes('lite') || 
      userAgent.includes('go');
    
    // Performance heuristics
    if (isLowEndDevice || hardwareConcurrency <= 2 || deviceMemory <= 2) {
      return 'low';
    } else if (hardwareConcurrency <= 4 || deviceMemory <= 4) {
      return 'medium';
    } else {
      return 'high';
    }
  } catch (error) {
    // Default to medium if detection fails
    return 'medium';
  }
}