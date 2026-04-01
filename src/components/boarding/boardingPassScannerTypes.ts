import type { ParsedBoardingPass } from '../../types/boarding';

export interface BoardingPassScannerProps {
  onScanSuccess: (result: ParsedBoardingPass) => void;
  onScanCancel: () => void;
  onManualEntry: () => void;
  onScanError?: (error: Error) => void;
  onImageImport?: () => void; // Optional callback for when image import is triggered
  lowPowerMode?: boolean; // Enable aggressive power saving
}

export type ScanResult = {
  type: 'no_barcode' | 'partial' | 'success' | 'error';
  guidance: string;
  confidence: number;
  boardingPass?: ParsedBoardingPass;
  error?: string;
};

export type CameraStatus = 'pending' | 'ready' | 'denied' | 'unavailable';
