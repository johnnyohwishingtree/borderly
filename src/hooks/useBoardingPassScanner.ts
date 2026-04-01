import { useEffect, useRef, useState } from 'react';
import { RNCamera } from 'react-native-camera';
import { trigger, HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { parseBoardingPass } from '../services/boarding/boardingPassParser';
import { importBoardingPassFromImage, getImageImportErrorMessage } from '../services/boarding/boardingPassImageImport';
import type { ParsedBoardingPass, BCBPParseError } from '../types/boarding';
import type { ScanResult, CameraStatus } from '../components/boarding/boardingPassScannerTypes';

interface UseBoardingPassScannerOptions {
  onScanSuccess: (result: ParsedBoardingPass) => void;
  onScanError?: (error: Error) => void;
  onImageImport?: () => void;
  lowPowerMode?: boolean;
}

export function useBoardingPassScanner({
  onScanSuccess,
  onScanError,
  onImageImport,
  lowPowerMode = false,
}: UseBoardingPassScannerOptions) {
  const cameraRef = useRef<RNCamera>(null);
  const lastScanRef = useRef<number>(0);
  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('pending');
  const [isImporting, setIsImporting] = useState(false);
  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scan cooldown to prevent excessive processing
  const scanCooldownMs = lowPowerMode ? 1000 : 500;

  useEffect(() => {
    // Capture ref for use in cleanup
    const camera = cameraRef.current;

    // Timeout: if camera doesn't initialize within 10 seconds, assume unavailable
    cameraTimeoutRef.current = setTimeout(() => {
      setCameraStatus('unavailable');
    }, 10000);

    return () => {
      // Cleanup on unmount
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = null;
      }
      setIsScanning(false);

      // Clear camera ref and stop preview
      if (camera) {
        try {
          camera.pausePreview?.();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const handleBarcodeRead = ({ data, type }: { data: string; type: string }) => {
    if (!isScanning) return;

    // Apply scan cooldown to prevent excessive processing
    const now = Date.now();
    if (now - lastScanRef.current < scanCooldownMs) {
      return;
    }
    lastScanRef.current = now;

    try {
      // Check if this is a supported barcode type
      const supportedTypes = ['pdf417', 'aztec', 'qr'];
      if (!supportedTypes.includes(type.toLowerCase())) {
        setScanResult({
          type: 'partial',
          confidence: 0.3,
          guidance: 'Barcode detected, but not a boarding pass format...',
        });
        return;
      }

      // Show parsing state
      setScanResult({
        type: 'partial',
        confidence: 0.7,
        guidance: 'Reading boarding pass data...',
      });

      // Parse the barcode data
      const result = parseBoardingPass(data);

      // Handle parse error
      if ('code' in result) {
        const error = result as BCBPParseError;
        setScanResult({
          type: 'error',
          confidence: 0,
          guidance: error.message,
          error: error.message,
        });

        // Clear error after 3 seconds and resume scanning
        setTimeout(() => {
          setScanResult({
            type: 'no_barcode',
            confidence: 0,
            guidance: 'Scan the barcode on your boarding pass',
          });
        }, 3000);
        return;
      }

      // Success!
      const boardingPass = result as ParsedBoardingPass;
      setIsScanning(false);

      setScanResult({
        type: 'success',
        confidence: 1.0,
        guidance: 'Scan complete!',
        boardingPass,
      });

      // Haptic feedback for success
      trigger(HapticFeedbackTypes.notificationSuccess, {
        enableVibrateFallback: true,
      });

      // Small delay to show success state, then callback
      setTimeout(() => {
        setScanResult(null);
        onScanSuccess(boardingPass);
      }, 500);

    } catch (error) {
      setIsScanning(false);
      if (onScanError) {
        const errorObj = error instanceof Error ? error : new Error('Barcode reading failed');
        onScanError(errorObj);
      }
    }
  };

  const handleCameraReady = () => {
    // Cancel the initialization timeout — camera is ready
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
      cameraTimeoutRef.current = null;
    }
    setCameraStatus('ready');
    setIsScanning(true);
    setScanResult({
      type: 'no_barcode',
      confidence: 0,
      guidance: 'Scan the barcode on your boarding pass',
    });
  };

  const handleStatusChange = ({ cameraStatus: camStatus }: { cameraStatus: string }) => {
    if (camStatus === 'NOT_AUTHORIZED') {
      // Permission denied — show error immediately instead of waiting for timeout
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = null;
      }
      setCameraStatus('denied');
    }
  };

  const handleMountError = (_error: any) => {
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
      cameraTimeoutRef.current = null;
    }
    // Show in-component fallback (Import / Manual Entry) instead of
    // escalating to parent — camera init failure is not a scan error.
    setCameraStatus('unavailable');
  };

  const handleImageImport = async () => {
    setIsImporting(true);

    try {
      // Trigger callback if provided (for analytics/tracking)
      if (onImageImport) {
        onImageImport();
      }

      const result = await importBoardingPassFromImage();

      if (result.success && result.boardingPass) {
        // Success! Use the same flow as camera scan success
        setIsScanning(false);
        setScanResult({
          type: 'success',
          confidence: 1.0,
          guidance: 'Import complete!',
          boardingPass: result.boardingPass,
        });

        // Haptic feedback for success
        trigger(HapticFeedbackTypes.notificationSuccess, {
          enableVibrateFallback: true,
        });

        // Small delay to show success state, then callback
        setTimeout(() => {
          setScanResult(null);
          setIsImporting(false);
          onScanSuccess(result.boardingPass!);
        }, 500);
      } else {
        // Show error message
        const errorMessage = result.error || getImageImportErrorMessage(result.errorCode);
        setScanResult({
          type: 'error',
          confidence: 0,
          guidance: errorMessage,
          error: errorMessage,
        });

        // Clear error after 4 seconds and resume scanning
        setTimeout(() => {
          setScanResult({
            type: 'no_barcode',
            confidence: 0,
            guidance: 'Scan the barcode on your boarding pass',
          });
          setIsImporting(false);
        }, 4000);
      }
    } catch (error) {
      const errorMessage = 'Failed to import image';
      setScanResult({
        type: 'error',
        confidence: 0,
        guidance: errorMessage,
        error: errorMessage,
      });

      setTimeout(() => {
        setScanResult({
          type: 'no_barcode',
          confidence: 0,
          guidance: 'Scan the barcode on your boarding pass',
        });
        setIsImporting(false);
      }, 4000);

      if (onScanError) {
        onScanError(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  };

  const toggleFlash = () => {
    setFlashMode(prev => prev === 'off' ? 'on' : 'off');
    trigger(HapticFeedbackTypes.impactLight);
  };

  const getGuidanceColor = (result: ScanResult | null): string => {
    if (!result) return 'text-gray-400';

    switch (result.type) {
      case 'success':
        return 'text-green-400';
      case 'partial':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    if (confidence >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return {
    scanner: {
      isScanning,
      result: scanResult,
      handleBarcodeRead,
    },
    camera: {
      ref: cameraRef,
      status: cameraStatus,
      flashMode,
      handleReady: handleCameraReady,
      handleStatusChange,
      handleMountError,
      toggleFlash,
    },
    import_: {
      isImporting,
      handleImageImport,
    },
    ui: {
      lowPowerMode,
      getGuidanceColor,
      getConfidenceColor,
    },
  };
}
