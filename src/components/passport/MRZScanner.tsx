/**
 * MRZ Scanner Component
 *
 * Camera interface for scanning passport MRZ zones with real-time guidance.
 * Integrates with ML Kit text recognition and provides visual feedback.
 *
 * Security: No image storage - immediate processing only.
 */

import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import { Lightbulb, Flashlight, Check } from 'lucide-react-native';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useMRZScanner } from '../../hooks/useMRZScanner';
import type { MRZScannerProps } from './mrzScannerTypes';

export type { MRZScannerProps } from './mrzScannerTypes';

export default function MRZScannerComponent({
  onScanSuccess,
  onScanCancel,
  onManualEntry,
  onScanError,
  lowPowerMode = false,
}: MRZScannerProps) {
  const {
    cameraRef,
    scanResult,
    flashMode,
    cameraStatus,
    performanceMetrics,
    handleTextRecognition,
    handleCameraReady,
    handleStatusChange,
    handleMountError,
    startDemoScan,
    toggleFlash,
    getGuidanceColor,
    getConfidenceColor,
  } = useMRZScanner({
    onScanSuccess,
    ...(onScanError != null && { onScanError }),
    lowPowerMode,
  });

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
              {flashMode === 'on' ? (
                <Lightbulb size={20} color="#ffffff" />
              ) : (
                <Flashlight size={20} color="#ffffff" />
              )}
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
              <Check size={32} color="#ffffff" />
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
            <Check size={32} color="#ffffff" />
          </View>
          <Text className="text-white text-xl font-bold">Scan Complete!</Text>
        </View>
      )}
    </View>
  );
}
