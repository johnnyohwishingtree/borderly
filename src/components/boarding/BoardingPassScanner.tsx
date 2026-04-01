/**
 * Boarding Pass Scanner Component
 *
 * Camera interface for scanning boarding pass barcodes (PDF417, Aztec, QR).
 * Integrates with BCBP Parser Service and provides visual feedback.
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
import { Lightbulb, Flashlight, Camera, Hourglass, Check } from 'lucide-react-native';
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
  onImageImport,
  lowPowerMode = false,
}: BoardingPassScannerProps) {
  const { scanner, camera, import_, ui } = useBoardingPassScanner({
    onScanSuccess,
    ...(onScanError != null && { onScanError }),
    ...(onImageImport != null && { onImageImport }),
    lowPowerMode,
  });

  // Show error state if permission denied or camera unavailable
  if (camera.status === 'denied' || camera.status === 'unavailable') {
    const isDenied = camera.status === 'denied';
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-4 text-center">
          {isDenied ? 'Camera Access Required' : 'Camera Not Available'}
        </Text>
        <Text className="text-muted text-center mb-8 leading-6">
          {isDenied
            ? 'To scan your boarding pass, we need camera permission. You can enable it in Settings, or enter your flight information manually.'
            : 'Camera could not be started. This may happen on simulators or devices without a camera.'}
        </Text>
        {isDenied && Platform.OS !== 'web' && (
          <Button
            title="Open Settings"
            onPress={() => Linking.openSettings()}
            variant="secondary"
            fullWidth
          />
        )}
        {!isDenied && (
          <View className="w-full">
            <Button
              title="Try Demo Scan"
              onPress={scanner.startDemo}
              variant="primary"
              fullWidth
            />
          </View>
        )}
        <View className="mt-4 w-full">
          <Button
            title="Import from Photo"
            onPress={import_.handleImageImport}
            variant="secondary"
            fullWidth
            disabled={import_.isImporting}
          />
        </View>
        <View className="mt-4 w-full">
          <Button
            title="Enter Manually Instead"
            onPress={onManualEntry}
            variant={isDenied ? 'primary' : 'secondary'}
            fullWidth
            disabled={import_.isImporting}
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
          {camera.status === 'demo' ? 'Demo: Scanning sample boarding pass' : 'Position boarding pass barcode in frame'}
        </Text>
        <Text className="text-muted text-center text-sm mb-4">
          {camera.status === 'demo' ? 'Simulating barcode recognition...' : 'Supports PDF417, Aztec, and QR codes'}
        </Text>
      </View>

      {/* Barcode Target Frame */}
      <View className="mx-8 my-4 relative">
        <View
          className={`border-2 ${
            scanner.result?.type === 'success'
              ? 'border-green-400'
              : scanner.result?.type === 'partial'
              ? 'border-yellow-400'
              : scanner.result?.type === 'error'
              ? 'border-red-400'
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
            <Text className="text-white/70 text-xs font-medium">
              BARCODE SCANNING AREA
            </Text>
            <Text className="text-white/50 text-xs mt-1">
              (PDF417, Aztec, or QR code)
            </Text>
          </View>
        </View>

        {/* Confidence indicator */}
        {scanner.result && scanner.result.confidence > 0 && (
          <View className="absolute -bottom-2 left-0 right-0 flex-row items-center justify-center">
            <View
              className={`h-1 rounded-full ${ui.getConfidenceColor(scanner.result.confidence)}`}
              style={{ width: `${scanner.result.confidence * 100}%` }}
            />
          </View>
        )}
      </View>

      {/* Bottom overlay */}
      <View className="flex-1 bg-black/60 flex-col justify-start">
        {/* Guidance text */}
        <View className="px-6 py-4">
          <Text className={`text-center text-sm font-medium ${ui.getGuidanceColor(scanner.result)}`}>
            {import_.isImporting ? 'Importing from photo...' : scanner.result?.guidance || 'Initializing scanner...'}
          </Text>
          {!import_.isImporting && scanner.result?.confidence !== undefined && scanner.result.confidence > 0 && (
            <Text className="text-center text-xs text-muted mt-1">
              Confidence: {Math.round(scanner.result.confidence * 100)}%
            </Text>
          )}
        </View>

        {/* Controls */}
        <View className="flex-row items-center justify-between px-6 pb-6">
          <Button
            title="Cancel"
            onPress={onScanCancel}
            variant="secondary"
            size="medium"
            disabled={import_.isImporting}
          />

          <View className="flex-row gap-3">
            {camera.status !== 'demo' && (
              <TouchableOpacity
                onPress={camera.toggleFlash}
                disabled={import_.isImporting}
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  camera.flashMode === 'on' ? 'bg-yellow-500' : 'bg-gray-600'
                } ${import_.isImporting ? 'opacity-50' : ''}`}
                accessibilityLabel={`Turn flash ${camera.flashMode === 'on' ? 'off' : 'on'}`}
              >
                {camera.flashMode === 'on' ? (
                  <Lightbulb size={20} color="#ffffff" />
                ) : (
                  <Flashlight size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={import_.handleImageImport}
              disabled={import_.isImporting}
              className={`w-12 h-12 rounded-full items-center justify-center bg-blue-600 ${
                import_.isImporting ? 'opacity-50' : ''
              }`}
              accessibilityLabel="Import from photo"
            >
              {import_.isImporting ? (
                <Hourglass size={20} color="#ffffff" />
              ) : (
                <Camera size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>

          <Button
            title="Manual"
            onPress={onManualEntry}
            variant="secondary"
            size="medium"
            disabled={import_.isImporting}
          />
        </View>
      </View>
    </View>
  );

  // Demo mode — show scanning UI without real camera
  if (camera.status === 'demo') {
    return (
      <View className="flex-1 bg-black">
        {scanOverlay}

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

  return (
    <View className="flex-1 bg-black">
      {/* Camera View — mounts during loading (null) so onCameraReady can fire */}
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
        {scanOverlay}
      </RNCamera>

      {/* Loading overlay — shown while camera initializes */}
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
