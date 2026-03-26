/**
 * MRZ Scanner — Camera text processing, validation, and scanning guidance.
 *
 * Security: No image storage — immediate processing only.
 */

import { parseMRZ, extractMRZFromText, type MRZParseResult } from './mrzParser';
import {
  defaultScannerConfig,
  performanceConfigs,
  type TextRecognition,
  type ScanResult,
  type ScannerConfig,
} from './mrzScannerTypes';
import { MRZScanner } from './scannerClass';

// Re-export types and configs so existing consumers still work
export { defaultScannerConfig, performanceConfigs, MRZScanner };
export type { TextRecognition, ScanResult, ScannerConfig };

/**
 * Process text recognition result from camera
 */
export function processCameraText(
  textRecognition: TextRecognition,
  config: ScannerConfig = defaultScannerConfig,
): ScanResult {
  try {
    const rawText = extractRawText(textRecognition);

    if (!rawText || rawText.length < 80) {
      return {
        type: 'no_mrz',
        confidence: 0,
        guidance: 'Position passport so MRZ is visible in frame',
      };
    }

    const mrzLines = extractMRZFromText(rawText);

    if (!mrzLines) {
      return {
        type: 'no_mrz',
        confidence: 0.2,
        guidance: 'Align passport MRZ (2 lines at bottom) in frame',
      };
    }

    const parseResult = parseMRZ(mrzLines.line1, mrzLines.line2);

    if (!parseResult.success) {
      return {
        type: 'error',
        confidence: 0.1,
        guidance: 'MRZ not readable. Try better lighting or hold steady',
      };
    }

    if (parseResult.confidence < config.minConfidence) {
      return {
        type: 'partial',
        mrz: parseResult,
        confidence: parseResult.confidence,
        guidance: `${Math.round(parseResult.confidence * 100)}% confident. Hold steady for better scan`,
      };
    }

    return {
      type: 'success',
      mrz: parseResult,
      confidence: parseResult.confidence,
      guidance: `Scan complete (${Math.round(parseResult.confidence * 100)}% confident)`,
    };
  } catch {
    return {
      type: 'error',
      confidence: 0,
      guidance: 'Camera error. Please try again or enter manually',
    };
  }
}

/**
 * Extract raw text from camera text recognition result
 */
function extractRawText(textRecognition: TextRecognition): string {
  if (!textRecognition.textBlocks || textRecognition.textBlocks.length === 0) {
    return '';
  }

  const textLines: string[] = [];

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

    if (textLines.length > 20) break;
  }

  return textLines.join('\n');
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

  if (!profile.passportNumber || profile.passportNumber.length < 6) {
    warnings.push('Passport number appears incomplete');
  }
  if (!profile.surname || profile.surname.length < 2) {
    warnings.push('Surname appears incomplete');
  }
  if (!profile.givenNames || profile.givenNames.length < 2) {
    warnings.push('Given names appear incomplete');
  }

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

  return { isValid: warnings.length === 0, warnings };
}

/**
 * Get scanning guidance based on camera position and lighting
 */
export function getScanningGuidance(
  textRecognition: TextRecognition,
  _hasFlash: boolean,
): string {
  const textCount = textRecognition.textBlocks?.length || 0;

  if (textCount === 0) return 'Position passport in frame. Ensure good lighting.';
  if (textCount < 5) return 'Move camera closer to passport. Focus on bottom area.';
  if (textCount > 20) return 'Move camera closer. Focus on MRZ lines at passport bottom.';
  return 'Hold steady. Scanning MRZ...';
}

/**
 * Create an optimized MRZ scanner based on device performance
 */
export function createOptimizedMRZScanner(customConfig?: Partial<ScannerConfig>): MRZScanner {
  const deviceTier = detectDevicePerformanceTier();
  const config = {
    ...defaultScannerConfig,
    ...performanceConfigs[deviceTier],
    ...customConfig,
  };
  return new MRZScanner(config, deviceTier);
}

function detectDevicePerformanceTier(): 'low' | 'medium' | 'high' {
  try {
    const nav = (typeof navigator !== 'undefined' ? navigator : null) as {
      hardwareConcurrency?: number;
      deviceMemory?: number;
      userAgent?: string;
    } | null;
    const hardwareConcurrency = nav?.hardwareConcurrency || 2;
    const deviceMemory = nav?.deviceMemory || 2;
    const userAgent = nav?.userAgent?.toLowerCase() || '';
    const isLowEndDevice =
      userAgent.includes('low-end') || userAgent.includes('lite') || userAgent.includes('go');

    if (isLowEndDevice || hardwareConcurrency <= 2 || deviceMemory <= 2) return 'low';
    if (hardwareConcurrency <= 4 || deviceMemory <= 4) return 'medium';
    return 'high';
  } catch {
    return 'medium';
  }
}
