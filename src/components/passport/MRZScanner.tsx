/**
 * MRZ Scanner Component
 * 
 * Camera interface for scanning passport MRZ zones with real-time guidance.
 * Integrates with ML Kit text recognition and provides visual feedback.
 * 
 * Security: No image storage - immediate processing only.
 */

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,

  Linking,
  Platform,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import { trigger, HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { createOptimizedMRZScanner, type ScanResult, type TextRecognition } from '../../services/passport/mrzScanner';
import { parseMRZ, type MRZParseResult } from '../../services/passport/mrzParser';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

export interface MRZScannerProps {
  onScanSuccess: (result: MRZParseResult) => void;
  onScanCancel: () => void;
  onManualEntry: () => void;
  onScanError?: (error: Error) => void;
  lowPowerMode?: boolean; // Enable aggressive power saving
}

export default function MRZScannerComponent({
  onScanSuccess,
  onScanCancel,
  onManualEntry,
  onScanError,
  lowPowerMode = false,
}: MRZScannerProps) {
  const cameraRef = useRef<RNCamera>(null);
  const scannerRef = useRef(createOptimizedMRZScanner(lowPowerMode ? {
    scanCooldownMs: 1000, // Longer cooldown in low power mode
    maxScanAttempts: 8,
  } : undefined));
  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [cameraStatus, setCameraStatus] = useState<'pending' | 'ready' | 'denied' | 'unavailable' | 'demo'>('pending');
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    successRate: number;
    averageAttempts: number;
    avgProcessingTime: number;
    framesSkipped: number;
    deviceTier: string;
  } | null>(null);
  
  // Performance monitoring for optimization feedback
  const performanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset scanner when component mounts
    scannerRef.current.reset();

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
      if (demoTimerRef.current) {
        clearTimeout(demoTimerRef.current);
        demoTimerRef.current = null;
      }
      setIsScanning(false);
      
      // Clear performance timer
      if (performanceTimerRef.current) {
        clearInterval(performanceTimerRef.current);
        performanceTimerRef.current = null;
      }
      
      // Dispose scanner resources
      if (scannerRef.current && typeof scannerRef.current.dispose === 'function') {
        scannerRef.current.dispose();
      }
      
      // Clear camera ref and stop preview
      if (cameraRef.current) {
        try {
          cameraRef.current.pausePreview?.();
        } catch (error) {
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

  const handleStatusChange = ({ cameraStatus }: { cameraStatus: string }) => {
    if (cameraStatus === 'NOT_AUTHORIZED') {
      // Permission denied — show error immediately instead of waiting for timeout
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = null;
      }
      setCameraStatus('denied');
    }
  };

  const handleMountError = (error: any) => {
    console.error('Camera mount error:', error);
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
      cameraTimeoutRef.current = null;
    }
    setCameraStatus('unavailable');
    
    // Call error handler if provided
    if (onScanError) {
      const errorObj = error instanceof Error ? error : new Error('Camera mount failed');
      onScanError(errorObj);
    }
  };

  // Sample MRZ for demo mode (ICAO standard test passport)
  const DEMO_MRZ_LINE1 = 'P<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<';
  const DEMO_MRZ_LINE2 = 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';

  const startDemoScan = () => {
    setCameraStatus('demo');
    setIsScanning(true);
    scannerRef.current.reset();

    // Step 1: No MRZ detected (1s)
    setScanResult({
      type: 'no_mrz',
      confidence: 0,
      guidance: 'Searching for passport MRZ...',
    });

    // Step 2: Partial detection (2s)
    demoTimerRef.current = setTimeout(() => {
      setScanResult({
        type: 'partial',
        confidence: 0.4,
        guidance: 'MRZ detected — hold steady...',
      });

      // Step 3: Higher confidence (3s)
      demoTimerRef.current = setTimeout(() => {
        setScanResult({
          type: 'partial',
          confidence: 0.7,
          guidance: 'Reading passport data...',
        });

        // Step 4: Parse and succeed (4s)
        demoTimerRef.current = setTimeout(() => {
          const result = parseMRZ(DEMO_MRZ_LINE1, DEMO_MRZ_LINE2);
          setScanResult({
            type: 'success',
            mrz: result,
            confidence: result.confidence,
            guidance: 'Scan complete!',
          });
          setIsScanning(false);

          trigger(HapticFeedbackTypes.notificationSuccess, {
            enableVibrateFallback: true,
          });

          // Deliver result after showing success overlay
          demoTimerRef.current = setTimeout(() => {
            setScanResult(null);
            onScanSuccess(result);
          }, 800);
        }, 1000);
      }, 1000);
    }, 1500);
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

  // Show error state if permission denied or camera unavailable
  if (cameraStatus === 'denied' || cameraStatus === 'unavailable') {
    const isDenied = cameraStatus === 'denied';
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-4 text-center">
          {isDenied ? 'Camera Access Required' : 'Camera Not Available'}
        </Text>
        <Text className="text-gray-300 text-center mb-8 leading-6">
          {isDenied
            ? 'To scan your passport, we need camera permission. You can enable it in Settings, or enter your passport information manually.'
            : 'Camera could not be started. This may happen on simulators or devices without a camera.'}
        </Text>
        {isDenied && Platform.OS !== 'web' && (
          <Button
            title="Open Settings"
            onPress={() => Linking.openSettings()}
            variant="outline"
            fullWidth
          />
        )}
        {!isDenied && (
          <View className="w-full">
            <Button
              title="Try Demo Scan"
              onPress={startDemoScan}
              variant="primary"
              fullWidth
            />
          </View>
        )}
        <View className="mt-4 w-full">
          <Button
            title="Enter Manually Instead"
            onPress={onManualEntry}
            variant={isDenied ? 'primary' : 'outline'}
            fullWidth
          />
        </View>
      </View>
    );
  }

  const scanOverlay = (
    <View className="flex-1 relative">
      {/* Top overlay */}
      <View className="flex-1 bg-black/60 flex-col justify-end">
        <Text className="text-white text-center text-lg font-semibold mb-2">
          {cameraStatus === 'demo' ? 'Demo: Scanning sample passport' : 'Position passport MRZ in frame'}
        </Text>
        <Text className="text-gray-300 text-center text-sm mb-4">
          {cameraStatus === 'demo' ? 'Simulating MRZ recognition...' : 'Align the two lines at the bottom of your passport'}
        </Text>
      </View>

      {/* MRZ Target Frame */}
      <View className="mx-8 my-4 relative">
        <View
          className={`border-2 ${
            scanResult?.type === 'success'
              ? 'border-green-400'
              : scanResult?.type === 'partial'
              ? 'border-yellow-400'
              : 'border-white/70'
          } rounded-lg bg-transparent`}
          style={{
            height: 80,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
          }}
        >
          {/* Corner markers */}
          <View className="absolute -top-1 -left-1 w-4 h-4 border-l-4 border-t-4 border-white" />
          <View className="absolute -top-1 -right-1 w-4 h-4 border-r-4 border-t-4 border-white" />
          <View className="absolute -bottom-1 -left-1 w-4 h-4 border-l-4 border-b-4 border-white" />
          <View className="absolute -bottom-1 -right-1 w-4 h-4 border-r-4 border-b-4 border-white" />

          {/* Center text — show sample MRZ lines in demo mode */}
          <View className="flex-1 items-center justify-center">
            {cameraStatus === 'demo' ? (
              <>
                <Text className="text-green-400/80 font-mono" style={{ fontSize: 7 }}>
                  P{'<'}UTODOE{'<'}{'<'}JANE{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}{'<'}
                </Text>
                <Text className="text-green-400/80 font-mono" style={{ fontSize: 7 }}>
                  L898902C36UTO7408122F1204159ZE184226B{'<'}{'<'}{'<'}{'<'}{'<'}10
                </Text>
              </>
            ) : (
              <>
                <Text className="text-white/70 text-xs font-medium">
                  MRZ SCANNING AREA
                </Text>
                <Text className="text-white/50 text-xs mt-1">
                  (2 lines of passport data)
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Confidence indicator */}
        {scanResult && scanResult.confidence > 0 && (
          <View className="absolute -bottom-2 left-0 right-0 flex-row items-center justify-center">
            <View
              className={`h-1 rounded-full ${getConfidenceColor(scanResult.confidence)}`}
              style={{ width: `${scanResult.confidence * 100}%` }}
            />
          </View>
        )}
      </View>

      {/* Bottom overlay */}
      <View className="flex-1 bg-black/60 flex-col justify-start">
        {/* Guidance text */}
        <View className="px-6 py-4">
          <Text className={`text-center text-sm font-medium ${getGuidanceColor(scanResult)}`}>
            {scanResult?.guidance || 'Initializing scanner...'}
          </Text>
          {scanResult?.confidence !== undefined && scanResult.confidence > 0 && (
            <Text className="text-center text-xs text-gray-400 mt-1">
              Confidence: {Math.round(scanResult.confidence * 100)}%
            </Text>
          )}

          {/* Performance info (dev mode only) */}
          {__DEV__ && performanceMetrics && !lowPowerMode && (
            <View className="mt-2 px-2 py-1 bg-black/60 rounded">
              <Text className="text-xs text-gray-300 text-center">
                Success: {Math.round(performanceMetrics.successRate * 100)}% |
                Tier: {performanceMetrics.deviceTier} |
                Skipped: {performanceMetrics.framesSkipped}
              </Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View className="flex-row items-center justify-between px-6 pb-6">
          <Button
            title="Cancel"
            onPress={onScanCancel}
            variant="outline"
            size="medium"
          />

          {cameraStatus !== 'demo' && (
            <TouchableOpacity
              onPress={toggleFlash}
              className={`w-12 h-12 rounded-full items-center justify-center ${
                flashMode === 'on' ? 'bg-yellow-500' : 'bg-gray-600'
              }`}
              accessibilityLabel={`Turn flash ${flashMode === 'on' ? 'off' : 'on'}`}
            >
              <Text className="text-white font-bold text-lg">
                {flashMode === 'on' ? '💡' : '🔦'}
              </Text>
            </TouchableOpacity>
          )}

          <Button
            title="Manual"
            onPress={onManualEntry}
            variant="outline"
            size="medium"
          />
        </View>
      </View>
    </View>
  );

  // Demo mode — show scanning UI without real camera
  if (cameraStatus === 'demo') {
    return (
      <View className="flex-1 bg-black">
        {scanOverlay}

        {/* Success overlay */}
        {scanResult?.type === 'success' && (
          <View className="absolute inset-0 bg-green-500/20 items-center justify-center">
            <View className="bg-green-500 rounded-full p-4 mb-4">
              <Text className="text-white text-2xl">✓</Text>
            </View>
            <Text className="text-white text-xl font-bold">Scan Complete!</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Camera View — mounts during loading (null) so onCameraReady can fire */}
      <RNCamera
        ref={cameraRef}
        className="flex-1"
        type={RNCamera.Constants.Type.back}
        flashMode={
          flashMode === 'on'
            ? RNCamera.Constants.FlashMode.torch
            : RNCamera.Constants.FlashMode.off
        }
        onTextRecognized={handleTextRecognition}
        captureAudio={false}
        onCameraReady={handleCameraReady}
        onMountError={handleMountError}
        onStatusChange={handleStatusChange}
        ratio={lowPowerMode ? "4:3" : "16:9"}
        autoFocusPointOfInterest={{ x: 0.5, y: 0.7 }}
      >
        {scanOverlay}
      </RNCamera>

      {/* Loading overlay — shown while camera initializes */}
      {cameraStatus === 'pending' && (
        <View className="absolute inset-0 bg-black items-center justify-center">
          <LoadingSpinner />
          <Text className="text-white mt-4">Initializing camera...</Text>
        </View>
      )}

      {/* Success overlay */}
      {scanResult?.type === 'success' && (
        <View className="absolute inset-0 bg-green-500/20 items-center justify-center">
          <View className="bg-green-500 rounded-full p-4 mb-4">
            <Text className="text-white text-2xl">✓</Text>
          </View>
          <Text className="text-white text-xl font-bold">Scan Complete!</Text>
        </View>
      )}
    </View>
  );
}