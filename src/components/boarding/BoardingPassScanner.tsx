/**
 * Boarding Pass Scanner Component
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
import { useBoardingPassScanner } from '../../hooks/useBoardingPassScanner';
import type { BoardingPassScannerProps } from './boardingPassScannerTypes';

export type { BoardingPassScannerProps } from './boardingPassScannerTypes';

type ScanMode = 'choose' | 'camera';

export default function BoardingPassScanner({
  onScanSuccess,
  onScanCancel,
  onManualEntry,
  onScanError,
  onImageImport,
  lowPowerMode = false,
}: BoardingPassScannerProps) {
  const [scanMode, setScanMode] = useState<ScanMode>('choose');

  const { scanner, camera, import_, ui } = useBoardingPassScanner({
    onScanSuccess,
    ...(onScanError != null && { onScanError }),
    ...(onImageImport != null && { onImageImport }),
    lowPowerMode,
  });

  // Action sheet — choose how to scan
  if (scanMode === 'choose') {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-2 text-center">
          Scan Boarding Pass
        </Text>
        <Text className="text-muted text-center mb-8 leading-6">
          Scan your boarding pass barcode to auto-fill flight details
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
            onPress={import_.handleImageImport}
            variant="secondary"
            fullWidth
            disabled={import_.isImporting}
            loading={import_.isImporting}
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
  if (scanMode === 'camera' && camera.status === 'denied') {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-4 text-center">
          Camera Access Required
        </Text>
        <Text className="text-muted text-center mb-8 leading-6">
          To scan your boarding pass, we need camera permission.
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
            title="Import from Photo Instead"
            onPress={import_.handleImageImport}
            variant="secondary"
            fullWidth
            disabled={import_.isImporting}
            loading={import_.isImporting}
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

  // Camera unavailable (simulator)
  if (scanMode === 'camera' && camera.status === 'unavailable') {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-4 text-center">
          Camera Not Available
        </Text>
        <Text className="text-muted text-center mb-8 leading-6">
          Camera could not be started. You can import a photo of your boarding pass instead.
        </Text>
        <Button
          title="Import from Photo"
          onPress={import_.handleImageImport}
          variant="primary"
          disabled={import_.isImporting}
          loading={import_.isImporting}
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
        {/* Scan overlay */}
        <View className="flex-1 relative">
          <View className="flex-1 bg-black/60 flex-col justify-end">
            <Text className="text-white text-center text-lg font-semibold mb-2">
              Position boarding pass barcode in frame
            </Text>
            <Text className="text-muted text-center text-sm mb-4">
              Supports PDF417, Aztec, and QR codes
            </Text>
          </View>

          {/* Barcode target frame */}
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

          {/* Bottom controls */}
          <View className="flex-1 bg-black/60 flex-col justify-start">
            <View className="px-6 py-4">
              <Text className={`text-center text-sm font-medium ${ui.getGuidanceColor(scanner.result)}`}>
                {scanner.result?.guidance || 'Initializing scanner...'}
              </Text>
            </View>
            <View className="flex-row items-center justify-between px-6 pb-6">
              <Button title="Cancel" onPress={onScanCancel} variant="secondary" size="medium" />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={camera.toggleFlash}
                  className={`w-12 h-12 rounded-full items-center justify-center ${
                    camera.flashMode === 'on' ? 'bg-yellow-500' : 'bg-gray-600'
                  }`}
                  accessibilityLabel={`Turn flash ${camera.flashMode === 'on' ? 'off' : 'on'}`}
                >
                  {camera.flashMode === 'on' ? <Lightbulb size={20} color="#ffffff" /> : <Flashlight size={20} color="#ffffff" />}
                </TouchableOpacity>
              </View>
              <Button title="Manual" onPress={onManualEntry} variant="secondary" size="medium" />
            </View>
          </View>
        </View>
      </RNCamera>

      {/* Loading overlay */}
      {camera.status === 'pending' && (
        <View className="absolute inset-0 bg-black items-center justify-center">
          <LoadingSpinner />
          <Text className="text-white mt-4">Initializing camera...</Text>
        </View>
      )}

      {/* Success overlay */}
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
