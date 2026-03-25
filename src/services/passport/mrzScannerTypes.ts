import type { TrackedTextFeature } from 'react-native-camera';

// Type for text recognition response from RNCamera
export interface TextRecognition {
  textBlocks: TrackedTextFeature[];
}

export interface ScanResult {
  type: 'success' | 'partial' | 'error' | 'no_mrz';
  mrz?: import('./mrzParser').MRZParseResult;
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
