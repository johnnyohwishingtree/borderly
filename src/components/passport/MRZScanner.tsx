/**
 * MRZ Scanner — Camera-only component.
 *
 * Renders the camera viewfinder for scanning passport MRZ zones.
 * The action sheet (Camera / Import / Manual) is handled by the
 * parent screen to avoid Modal navigation context issues.
 */

import {
  View,
  Text,
  TouchableOpacity,
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
    state: { scanResult, cameraStatus, lowPowerMode: isLowPower },
    camera: { cameraRef, flashMode, handleCameraReady, handleStatusChange, handleMountError, toggleFlash },
    scanning: { handleTextRecognition },
    ui: { getGuidanceColor, getConfidenceColor },
  } = useMRZScanner({
    onScanSuccess,
    ...(onScanError != null && { onScanError }),
    lowPowerMode,
  });

  // Camera unavailable — tell user to use Import or Manual (handled by parent)
  if (cameraStatus === 'unavailable' || cameraStatus === 'denied') {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-4 text-center">
          {cameraStatus === 'denied' ? 'Camera Access Required' : 'Camera Not Available'}
        </Text>
        <Text className="text-muted text-center mb-8 leading-6">
          Use "Import from Photo" or enter passport details manually.
        </Text>
        <Button title="Enter Manually" onPress={onManualEntry} variant="primary" fullWidth />
        <View className="mt-4 w-full">
          <Button title="Cancel" onPress={onScanCancel} variant="secondary" fullWidth />
        </View>
      </View>
    );
  }

  // Camera scanning
  return (
    <View className="flex-1 bg-black">
      <RNCamera
        ref={cameraRef}
        className="flex-1"
        type={RNCamera.Constants.Type.back}
        flashMode={flashMode === 'on' ? RNCamera.Constants.FlashMode.torch : RNCamera.Constants.FlashMode.off}
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
