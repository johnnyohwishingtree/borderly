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
 * Extract raw text from camera text recognition result
 */
function extractRawText(textRecognition: TextRecognition): string {
  if (!textRecognition.textBlocks) {
    return '';
  }

  // Combine all text blocks, preserving line structure
  const textLines: string[] = [];
  
  for (const block of textRecognition.textBlocks) {
    if (block.components) {
      for (const component of block.components) {
        if (component.value) {
          textLines.push(component.value);
        }
      }
    } else if (block.value) {
      textLines.push(block.value);
    }
  }

  return textLines.join('\n');
}

/**
 * Scanner state management for continuous scanning
 */
export class MRZScanner {
  private lastScanTime = 0;
  private scanAttempts = 0;
  private lastSuccessfulScan: ScanResult | null = null;
  private isDisposed = false;
  private memoryUsage = {
    totalFramesProcessed: 0,
    lastMemoryCleanup: Date.now(),
    maxRetainedScans: 5
  };
  
  constructor(private config: ScannerConfig = defaultScannerConfig) {}

  /**
   * Process a new camera frame
   */
  processFrame(textRecognition: TextRecognition): ScanResult {
    if (this.isDisposed) {
      throw new Error('Scanner has been disposed');
    }

    const now = Date.now();
    
    // Enforce cooldown
    if (now - this.lastScanTime < this.config.scanCooldownMs) {
      return this.lastSuccessfulScan || {
        type: 'no_mrz',
        confidence: 0,
        guidance: 'Scanning...'
      };
    }
    
    this.lastScanTime = now;
    this.scanAttempts++;
    this.memoryUsage.totalFramesProcessed++;
    
    // Periodic memory cleanup
    if (now - this.memoryUsage.lastMemoryCleanup > 30000) { // Every 30 seconds
      this.performMemoryCleanup();
    }
    
    const result = processCameraText(textRecognition, this.config);
    
    // Update state
    if (result.type === 'success' || result.type === 'partial') {
      this.lastSuccessfulScan = result;
    }
    
    // Suggest manual entry after max attempts
    if (
      this.scanAttempts >= this.config.maxScanAttempts &&
      result.type !== 'success'
    ) {
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
      maxRetainedScans: 0
    };
  }

  /**
   * Check if scanner is disposed
   */
  isDisposedState(): boolean {
    return this.isDisposed;
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