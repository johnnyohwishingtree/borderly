import { useEffect, useRef, useState } from 'react';
import { RNCamera } from 'react-native-camera';
import { trigger, HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { createOptimizedMRZScanner, type ScanResult, type TextRecognition } from '../services/passport/mrzScanner';
import type { MRZParseResult } from '../services/passport/mrzScanner/mrzParser';
import type { MRZCameraStatus, MRZPerformanceMetrics } from '../components/passport/mrzScannerTypes';

interface UseMRZScannerOptions {
  onScanSuccess: (result: MRZParseResult) => void;
  onScanError?: (error: Error) => void;
  lowPowerMode?: boolean;
}

export function useMRZScanner({
  onScanSuccess,
  onScanError,
  lowPowerMode = false,
}: UseMRZScannerOptions) {
  const cameraRef = useRef<RNCamera>(null);
  const scannerRef = useRef(createOptimizedMRZScanner(lowPowerMode ? {
    scanCooldownMs: 1000, // Longer cooldown in low power mode
    maxScanAttempts: 8,
  } : undefined));
  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [cameraStatus, setCameraStatus] = useState<MRZCameraStatus>('pending');
  const [performanceMetrics, setPerformanceMetrics] = useState<MRZPerformanceMetrics | null>(null);

  // Performance monitoring for optimization feedback
  const performanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Capture refs for use in cleanup
    const scanner = scannerRef.current;
    const camera = cameraRef.current;

    // Reset scanner when component mounts
    scanner.reset();

    // Timeout: if camera doesn't initialize within 10 seconds, assume unavailable
    cameraTimeoutRef.current = setTimeout(() => {
      setCameraStatus('unavailable');
    }, 10000);

    // Start performance monitoring
    if (!lowPowerMode) {
      performanceTimerRef.current = setInterval(() => {
        if (scannerRef.current && typeof scannerRef.current.getPerformanceMetrics === 'function') {
          const metrics = scannerRef.current.getPerformanceMetrics();
          setPerformanceMetrics(metrics);
        }
      }, 2000);
    }

    return () => {
      // Cleanup on unmount
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = null;
      }
      setIsScanning(false);

      // Clear performance timer
      if (performanceTimerRef.current) {
        clearInterval(performanceTimerRef.current);
        performanceTimerRef.current = null;
      }

      // Dispose scanner resources
      if (scanner && typeof scanner.dispose === 'function') {
        scanner.dispose();
      }

      // Clear camera ref and stop preview
      if (camera) {
        try {
          camera.pausePreview?.();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [lowPowerMode]);

  const handleTextRecognition = (textRecognition: TextRecognition) => {
    if (!isScanning || (scannerRef.current && typeof scannerRef.current.isDisposedState === 'function' && scannerRef.current.isDisposedState())) return;

    try {
      const result = scannerRef.current.processFrame(textRecognition);
      setScanResult(result);

      // Handle successful scan
      if (result.type === 'success' && result.mrz) {
        setIsScanning(false);

        // Haptic feedback for success
        trigger(HapticFeedbackTypes.notificationSuccess, {
          enableVibrateFallback: true,
        });

        // Small delay to show success state, then cleanup and callback
        setTimeout(() => {
          // Clear scan result to free memory before callback
          setScanResult(null);
          onScanSuccess(result.mrz!);
        }, 500);
      }
      // Handle scan error results
      else if (result.type === 'error') {
        setIsScanning(false);
        if (onScanError) {
          const errorMessage = result.guidance || 'MRZ scanning failed';
          onScanError(new Error(errorMessage));
        }
      }
      // Provide haptic feedback for partial scans
      else if (result.type === 'partial' && result.confidence > 0.5) {
        trigger(HapticFeedbackTypes.impactLight, {
          enableVibrateFallback: true,
        });
      }
    } catch (error) {
      setIsScanning(false);
      if (onScanError) {
        const errorObj = error instanceof Error ? error : new Error('Text recognition failed');
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
    // Show in-component fallback (Manual Entry) instead of
    // escalating to parent — camera init failure is not a scan error.
    setCameraStatus('unavailable');
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
    state: {
      isScanning,
      scanResult,
      cameraStatus,
      performanceMetrics,
      lowPowerMode,
    },
    camera: {
      cameraRef,
      flashMode,
      handleCameraReady,
      handleStatusChange,
      handleMountError,
      toggleFlash,
    },
    scanning: {
      handleTextRecognition,
    },
    ui: {
      getGuidanceColor,
      getConfidenceColor,
    },
  };
}
