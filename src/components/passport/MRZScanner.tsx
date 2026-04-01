/**
 * MRZ Scanner Component
 *
 * Shows an action sheet (Camera / Import from Photo / Cancel) first,
 * then opens the camera or photo picker.
 *
 * Security: No image storage - immediate processing only.
 */

import { useState } from 'react';
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

type ScanMode = 'choose' | 'camera';

export default function MRZScannerComponent({
  onScanSuccess,
  onScanCancel,
  onManualEntry,
  onScanError,
  lowPowerMode = false,
}: MRZScannerProps) {
  const [scanMode, setScanMode] = useState<ScanMode>('choose');

  const {
    state: { scanResult, cameraStatus, lowPowerMode: isLowPower },
    camera: { cameraRef, flashMode, handleCameraReady, handleStatusChange, handleMountError, toggleFlash },
    scanning: { handleTextRecognition },
    ui: { getGuidanceColor, getConfidenceColor },
  } = useMRZScanner({
    onScanSuccess,
    ...(onScanError != null && { onScanError }),
    lowPowerMode,
  });

  // Action sheet — choose how to scan
  if (scanMode === 'choose') {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-2 text-center">
          Scan Passport
        </Text>
        <Text className="text-muted text-center mb-8 leading-6">
          Scan the MRZ zone at the bottom of your passport photo page
        </Text>

        <View className="w-full space-y-3">
          <Button
            title="Camera Scan"
            onPress={() => setScanMode('camera')}
            variant="primary"
            fullWidth
          />
          <Button
            title="Import from Photo"
            onPress={onManualEntry}
            variant="secondary"
            fullWidth
          />
          <Button
            title="Cancel"
            onPress={onScanCancel}
            variant="secondary"
            fullWidth
          />
        </View>
      </View>
    );
  }

  // Permission denied
  if (cameraStatus === 'denied') {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-4 text-center">
          Camera Access Required
        </Text>
        <Text className="text-muted text-center mb-8 leading-6">
          To scan your passport, we need camera permission.
        </Text>
        {Platform.OS !== 'web' && (
          <Button
            title="Open Settings"
            onPress={() => Linking.openSettings()}
            variant="primary"
            fullWidth
          />
        )}
        <View className="mt-4 w-full">
          <Button
            title="Enter Manually Instead"
            onPress={onManualEntry}
            variant="secondary"
            fullWidth
          />
        </View>
        <View className="mt-4 w-full">
          <Button
            title="Cancel"
            onPress={onScanCancel}
            variant="secondary"
            fullWidth
          />
        </View>
      </View>
    );
  }

  // Camera unavailable
  if (cameraStatus === 'unavailable') {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-4 text-center">
          Camera Not Available
        </Text>
        <Text className="text-muted text-center mb-8 leading-6">
          Camera could not be started. Please enter your passport information manually.
        </Text>
        <Button
          title="Enter Manually"
          onPress={onManualEntry}
          variant="primary"
          fullWidth
        />
        <View className="mt-4 w-full">
          <Button
            title="Cancel"
            onPress={onScanCancel}
            variant="secondary"
            fullWidth
          />
        </View>
      </View>
    );
  }

  // Camera scanning mode
  return (
    <View className="flex-1 bg-black">
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
        ratio={isLowPower ? "4:3" : "16:9"}
        autoFocusPointOfInterest={{ x: 0.5, y: 0.7 }}
      >
        <View className="flex-1 relative">
          <View className="flex-1 bg-black/60 flex-col justify-end">
            <Text className="text-white text-center text-lg font-semibold mb-2">
              Position passport MRZ in frame
            </Text>
            <Text className="text-muted text-center text-sm mb-4">
              Align the two lines at the bottom of your passport
            </Text>
          </View>

          {/* MRZ target frame */}
          <View className="mx-8 my-4 relative">
            <View
              className={`border-2 ${
                scanResult?.type === 'success' ? 'border-green-400'
                  : scanResult?.type === 'partial' ? 'border-yellow-400'
                  : 'border-white/70'
              } rounded-lg bg-transparent`}
              style={{ height: 80 }}
            >
              <View className="absolute -top-1 -left-1 w-4 h-4 border-l-4 border-t-4 border-white" />
              <View className="absolute -top-1 -right-1 w-4 h-4 border-r-4 border-t-4 border-white" />
              <View className="absolute -bottom-1 -left-1 w-4 h-4 border-l-4 border-b-4 border-white" />
              <View className="absolute -bottom-1 -right-1 w-4 h-4 border-r-4 border-b-4 border-white" />
              <View className="flex-1 items-center justify-center">
                <Text className="text-white/70 text-xs font-medium">MRZ SCANNING AREA</Text>
                <Text className="text-white/50 text-xs mt-1">(2 lines of passport data)</Text>
              </View>
            </View>

            {scanResult && scanResult.confidence > 0 && (
              <View className="absolute -bottom-2 left-0 right-0 flex-row items-center justify-center">
                <View
                  className={`h-1 rounded-full ${getConfidenceColor(scanResult.confidence)}`}
                  style={{ width: `${scanResult.confidence * 100}%` }}
                />
              </View>
            )}
          </View>

          {/* Bottom controls */}
          <View className="flex-1 bg-black/60 flex-col justify-start">
            <View className="px-6 py-4">
              <Text className={`text-center text-sm font-medium ${getGuidanceColor(scanResult)}`}>
                {scanResult?.guidance || 'Initializing scanner...'}
              </Text>
            </View>
            <View className="flex-row items-center justify-between px-6 pb-6">
              <Button title="Cancel" onPress={onScanCancel} variant="secondary" size="medium" />
              <TouchableOpacity
                onPress={toggleFlash}
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  flashMode === 'on' ? 'bg-yellow-500' : 'bg-gray-600'
                }`}
                accessibilityLabel={`Turn flash ${flashMode === 'on' ? 'off' : 'on'}`}
              >
                {flashMode === 'on' ? <Lightbulb size={20} color="#ffffff" /> : <Flashlight size={20} color="#ffffff" />}
              </TouchableOpacity>
              <Button title="Manual" onPress={onManualEntry} variant="secondary" size="medium" />
            </View>
          </View>
        </View>
      </RNCamera>

      {cameraStatus === 'pending' && (
        <View className="absolute inset-0 bg-black items-center justify-center">
          <LoadingSpinner />
          <Text className="text-white mt-4">Initializing camera...</Text>
        </View>
      )}

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
