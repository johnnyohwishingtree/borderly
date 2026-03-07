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
  Alert,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import { trigger, HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { MRZScanner, type ScanResult, type TextRecognition } from '../../services/passport/mrzScanner';
import { type MRZParseResult } from '../../services/passport/mrzParser';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

export interface MRZScannerProps {
  onScanSuccess: (result: MRZParseResult) => void;
  onScanCancel: () => void;
  onManualEntry: () => void;
}

export default function MRZScannerComponent({
  onScanSuccess,
  onScanCancel,
  onManualEntry,
}: MRZScannerProps) {
  const cameraRef = useRef<RNCamera>(null);
  const scannerRef = useRef(new MRZScanner());
  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    // Reset scanner when component mounts
    scannerRef.current.reset();
    
    return () => {
      // Cleanup on unmount
      setIsScanning(false);
      
      // Dispose scanner resources
      if (scannerRef.current && typeof scannerRef.current.dispose === 'function') {
        scannerRef.current.dispose();
      }
      
      // Clear camera ref
      if (cameraRef.current) {
        // Stop camera recording if active
        try {
          cameraRef.current.pausePreview?.();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const handleTextRecognition = (textRecognition: TextRecognition) => {
    if (!isScanning || (scannerRef.current && typeof scannerRef.current.isDisposedState === 'function' && scannerRef.current.isDisposedState())) return;

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
    
    // Provide haptic feedback for partial scans
    else if (result.type === 'partial' && result.confidence > 0.5) {
      trigger(HapticFeedbackTypes.impactLight, {
        enableVibrateFallback: true,
      });
    }
  };

  const handleCameraReady = () => {
    setPermissionGranted(true);
    setIsScanning(true);
  };

  const handleMountError = (error: any) => {
    console.error('Camera mount error:', error);
    setPermissionGranted(false);
    
    Alert.alert(
      'Camera Error',
      'Unable to access camera. Please check permissions and try again.',
      [
        { text: 'Manual Entry', onPress: onManualEntry },
        { text: 'Retry', onPress: () => setPermissionGranted(null) },
      ]
    );
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

  // Show loading while checking permissions
  if (permissionGranted === null) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <LoadingSpinner />
        <Text className="text-white mt-4">Initializing camera...</Text>
      </View>
    );
  }

  // Show error state if no permission
  if (permissionGranted === false) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-4 text-center">
          Camera Access Required
        </Text>
        <Text className="text-gray-300 text-center mb-8 leading-6">
          To scan your passport, we need camera permission. This allows us to read the 
          MRZ data from your passport without storing any images.
        </Text>
        <Button
          title="Enter Manually Instead"
          onPress={onManualEntry}
          variant="primary"
          fullWidth
        />
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
        onTextRecognized={handleTextRecognition}
        captureAudio={false}
        onCameraReady={handleCameraReady}
        onMountError={handleMountError}
      >
        {/* Overlay */}
        <View className="flex-1 relative">
          {/* Top overlay */}
          <View className="flex-1 bg-black/60 flex-col justify-end">
            <Text className="text-white text-center text-lg font-semibold mb-2">
              Position passport MRZ in frame
            </Text>
            <Text className="text-gray-300 text-center text-sm mb-4">
              Align the two lines at the bottom of your passport
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
              
              {/* Center text */}
              <View className="flex-1 items-center justify-center">
                <Text className="text-white/70 text-xs font-medium">
                  MRZ SCANNING AREA
                </Text>
                <Text className="text-white/50 text-xs mt-1">
                  (2 lines of passport data)
                </Text>
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
              
              <Button
                title="Manual"
                onPress={onManualEntry}
                variant="outline"
                size="medium"
              />
            </View>
          </View>
        </View>
      </RNCamera>
      
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