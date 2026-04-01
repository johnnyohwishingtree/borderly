/**
 * Boarding Pass Scanner — Camera-only component.
 *
 * Renders the camera viewfinder for scanning boarding pass barcodes.
 * The "Import from Photo" action is handled by the parent screen
 * (outside Modal) to avoid navigation context issues.
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
import { useBoardingPassScanner } from '../../hooks/useBoardingPassScanner';
import type { BoardingPassScannerProps } from './boardingPassScannerTypes';

export type { BoardingPassScannerProps } from './boardingPassScannerTypes';

export default function BoardingPassScanner({
  onScanSuccess,
  onScanCancel,
  onManualEntry,
  onScanError,
  lowPowerMode = false,
}: BoardingPassScannerProps) {
  const { scanner, camera, ui } = useBoardingPassScanner({
    onScanSuccess,
    ...(onScanError != null && { onScanError }),
    lowPowerMode,
  });

  // Camera unavailable — tell user to use Import from Photo (handled by parent)
  if (camera.status === 'unavailable' || camera.status === 'denied') {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-4 text-center">
          {camera.status === 'denied' ? 'Camera Access Required' : 'Camera Not Available'}
        </Text>
        <Text className="text-muted text-center mb-8 leading-6">
          Use "Import from Photo" instead, or enter flight details manually.
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

  // Camera scanning
  return (
    <View className="flex-1 bg-black">
      <RNCamera
        ref={camera.ref}
        className="flex-1"
        type={RNCamera.Constants.Type.back}
        flashMode={
          camera.flashMode === 'on'
            ? RNCamera.Constants.FlashMode.torch
            : RNCamera.Constants.FlashMode.off
        }
        onBarCodeRead={scanner.handleBarcodeRead}
        barCodeTypes={[
          RNCamera.Constants.BarCodeType.pdf417,
          RNCamera.Constants.BarCodeType.aztec,
          RNCamera.Constants.BarCodeType.qr,
        ]}
        captureAudio={false}
        onCameraReady={camera.handleReady}
        onMountError={camera.handleMountError}
        onStatusChange={camera.handleStatusChange}
        ratio={lowPowerMode ? "4:3" : "16:9"}
        autoFocusPointOfInterest={{ x: 0.5, y: 0.5 }}
      >
        <View className="flex-1 relative">
          <View className="flex-1 bg-black/60 flex-col justify-end">
            <Text className="text-white text-center text-lg font-semibold mb-2">
              Position boarding pass barcode in frame
            </Text>
            <Text className="text-muted text-center text-sm mb-4">
              Supports PDF417, Aztec, and QR codes
            </Text>
          </View>

          <View className="mx-8 my-4 relative">
            <View
              className={`border-2 ${
                scanner.result?.type === 'success' ? 'border-green-400'
                  : scanner.result?.type === 'partial' ? 'border-yellow-400'
                  : scanner.result?.type === 'error' ? 'border-red-400'
                  : 'border-white/70'
              } rounded-lg bg-transparent`}
              style={{ height: 120 }}
            >
              <View className="absolute -top-1 -left-1 w-4 h-4 border-l-4 border-t-4 border-white" />
              <View className="absolute -top-1 -right-1 w-4 h-4 border-r-4 border-t-4 border-white" />
              <View className="absolute -bottom-1 -left-1 w-4 h-4 border-l-4 border-b-4 border-white" />
              <View className="absolute -bottom-1 -right-1 w-4 h-4 border-r-4 border-b-4 border-white" />
              <View className="flex-1 items-center justify-center">
                <Text className="text-white/70 text-xs font-medium">BARCODE SCANNING AREA</Text>
              </View>
            </View>
          </View>

          <View className="flex-1 bg-black/60 flex-col justify-start">
            <View className="px-6 py-4">
              <Text className={`text-center text-sm font-medium ${ui.getGuidanceColor(scanner.result)}`}>
                {scanner.result?.guidance || 'Initializing scanner...'}
              </Text>
            </View>
            <View className="flex-row items-center justify-between px-6 pb-6">
              <Button title="Cancel" onPress={onScanCancel} variant="secondary" size="medium" />
              <TouchableOpacity
                onPress={camera.toggleFlash}
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  camera.flashMode === 'on' ? 'bg-yellow-500' : 'bg-gray-600'
                }`}
                accessibilityLabel={`Turn flash ${camera.flashMode === 'on' ? 'off' : 'on'}`}
              >
                {camera.flashMode === 'on' ? <Lightbulb size={20} color="#ffffff" /> : <Flashlight size={20} color="#ffffff" />}
              </TouchableOpacity>
              <Button title="Manual" onPress={onManualEntry} variant="secondary" size="medium" />
            </View>
          </View>
        </View>
      </RNCamera>

      {camera.status === 'pending' && (
        <View className="absolute inset-0 bg-black items-center justify-center">
          <LoadingSpinner />
          <Text className="text-white mt-4">Initializing camera...</Text>
        </View>
      )}

      {scanner.result?.type === 'success' && (
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
