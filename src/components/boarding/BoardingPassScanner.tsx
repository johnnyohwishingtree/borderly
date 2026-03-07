/**
 * Boarding Pass Scanner Component
 * 
 * Camera interface for scanning boarding pass barcodes (PDF417, Aztec, QR).
 * Follows the same UX patterns as MRZScanner with barcode detection support.
 * 
 * Security: No barcode storage - immediate processing only.
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
import { parseBoardingPass } from '../../services/boarding/boardingPassParser';
import { type ParsedBoardingPass, type BCBPParseError } from '../../types/boarding';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

export interface BoardingPassScannerProps {
  onScanSuccess: (result: ParsedBoardingPass) => void;
  onScanCancel: () => void;
  onManualEntry: () => void;
  onScanError?: (error: Error) => void;
  lowPowerMode?: boolean;
}

type ScanResult = {
  type: 'no_barcode' | 'partial' | 'success' | 'error';
  confidence: number;
  guidance: string;
  boardingPass?: ParsedBoardingPass;
};

export default function BoardingPassScanner({
  onScanSuccess,
  onScanCancel,
  onManualEntry,
  onScanError,
  lowPowerMode = false,
}: BoardingPassScannerProps) {
  const cameraRef = useRef<RNCamera>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [cameraStatus, setCameraStatus] = useState<'pending' | 'ready' | 'denied' | 'unavailable' | 'demo'>('pending');
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Scan cooldown to prevent excessive processing
  const SCAN_COOLDOWN_MS = lowPowerMode ? 1000 : 500;

  useEffect(() => {
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
      if (demoTimerRef.current) {
        clearTimeout(demoTimerRef.current);
        demoTimerRef.current = null;
      }
      if (scanCooldownRef.current) {
        clearTimeout(scanCooldownRef.current);
        scanCooldownRef.current = null;
      }
      setIsScanning(false);
      
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

  const handleBarcodeDetected = ({ data, type }: { data: string; type: string }) => {
    if (!isScanning) return;

    // Implement scan cooldown to prevent excessive processing
    const now = Date.now();
    if (now - lastScanTimeRef.current < SCAN_COOLDOWN_MS) {
      return;
    }
    lastScanTimeRef.current = now;

    try {
      // Update scan result to show detection in progress
      setScanResult({
        type: 'partial',
        confidence: 0.7,
        guidance: `Reading ${type} barcode...`,
      });

      // Parse the boarding pass data
      const parseResult = parseBoardingPass(data);
      
      if ('code' in parseResult) {
        // Parse error
        const error = parseResult as BCBPParseError;
        setScanResult({
          type: 'error',
          confidence: 0,
          guidance: `Parse error: ${error.message}`,
        });
        
        // Add cooldown before allowing another scan
        scanCooldownRef.current = setTimeout(() => {
          if (isScanning) {
            setScanResult({
              type: 'no_barcode',
              confidence: 0,
              guidance: 'Scan the barcode on your boarding pass',
            });
          }
        }, 2000);
      } else {
        // Successful parse
        const boardingPass = parseResult as ParsedBoardingPass;
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
      }
    } catch (error) {
      setIsScanning(false);
      if (onScanError) {
        const errorObj = error instanceof Error ? error : new Error('Barcode detection failed');
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

  // Sample BCBP for demo mode
  const DEMO_BCBP_DATA = 'M1JANE/DOE            EABC123 NRTHAN HK1Y009F001A0025 319>5180WW6319BHK              2A0025^164GQKL^099EW                         *30A2A5              09         N';

  const startDemoScan = () => {
    setCameraStatus('demo');
    setIsScanning(true);

    // Step 1: No barcode detected (1s)
    setScanResult({
      type: 'no_barcode',
      confidence: 0,
      guidance: 'Searching for boarding pass barcode...',
    });

    // Step 2: Partial detection (2s)
    demoTimerRef.current = setTimeout(() => {
      setScanResult({
        type: 'partial',
        confidence: 0.4,
        guidance: 'Barcode detected — hold steady...',
      });

      // Step 3: Higher confidence (3s)
      demoTimerRef.current = setTimeout(() => {
        setScanResult({
          type: 'partial',
          confidence: 0.7,
          guidance: 'Reading boarding pass data...',
        });

        // Step 4: Parse and succeed (4s)
        demoTimerRef.current = setTimeout(() => {
          const result = parseBoardingPass(DEMO_BCBP_DATA);
          if ('code' in result) {
            // Demo should always succeed, but handle error case
            setScanResult({
              type: 'error',
              confidence: 0,
              guidance: 'Demo parse failed',
            });
            return;
          }

          setScanResult({
            type: 'success',
            confidence: 1.0,
            guidance: 'Scan complete!',
            boardingPass: result,
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
            ? 'To scan your boarding pass, we need camera permission. You can enable it in Settings, or enter your flight information manually.'
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
          {cameraStatus === 'demo' ? 'Demo: Scanning sample boarding pass' : 'Scan your boarding pass barcode'}
        </Text>
        <Text className="text-gray-300 text-center text-sm mb-4">
          {cameraStatus === 'demo' ? 'Simulating barcode recognition...' : 'Works with physical and digital boarding passes'}
        </Text>
      </View>

      {/* Barcode Target Frame */}
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
            height: 120,
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

          {/* Center text */}
          <View className="flex-1 items-center justify-center">
            {cameraStatus === 'demo' ? (
              <View className="items-center">
                <Text className="text-green-400 text-6xl">📱</Text>
                <Text className="text-white/70 text-xs font-medium mt-2">
                  DEMO BOARDING PASS
                </Text>
              </View>
            ) : (
              <>
                <Text className="text-white/70 text-xs font-medium">
                  BARCODE SCANNING AREA
                </Text>
                <Text className="text-white/50 text-xs mt-1">
                  PDF417, Aztec, or QR code
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
      {/* Camera View */}
      <RNCamera
        ref={cameraRef}
        className="flex-1"
        type={RNCamera.Constants.Type.back}
        flashMode={
          flashMode === 'on'
            ? RNCamera.Constants.FlashMode.torch
            : RNCamera.Constants.FlashMode.off
        }
        onBarCodeRead={handleBarcodeDetected}
        barCodeTypes={[
          RNCamera.Constants.BarCodeType.pdf417,
          RNCamera.Constants.BarCodeType.aztec,
          RNCamera.Constants.BarCodeType.qr,
        ]}
        captureAudio={false}
        onCameraReady={handleCameraReady}
        onMountError={handleMountError}
        onStatusChange={handleStatusChange}
        ratio={lowPowerMode ? "4:3" : "16:9"}
        autoFocusPointOfInterest={{ x: 0.5, y: 0.5 }}
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