import type { MRZParseResult } from '../../services/passport/mrzScanner/mrzParser';

export interface MRZScannerProps {
  onScanSuccess: (result: MRZParseResult) => void;
  onScanCancel: () => void;
  onManualEntry: () => void;
  onScanError?: (error: Error) => void;
  lowPowerMode?: boolean; // Enable aggressive power saving
}

export type MRZCameraStatus = 'pending' | 'ready' | 'denied' | 'unavailable' | 'demo';

export interface MRZPerformanceMetrics {
  successRate: number;
  averageAttempts: number;
  avgProcessingTime: number;
  framesSkipped: number;
  deviceTier: string;
}
