import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CheckCircle, Download, X } from 'lucide-react-native';
import { getPortalName } from '../../utils/countryUtils';
import { QR_SAVE_OVERLAY_IDS } from './testIDs';

export interface QRPageDetectedPayload {
  /** ISO 3166-1 alpha-3 country code */
  countryCode: string;
  /** Base64 image data URI or remote URL for the detected QR code, null if not extractable */
  qrImageBase64: string | null;
  /** Optional confirmation / reference number */
  confirmationNumber?: string | null;
  /** URL of the portal page where detection occurred */
  pageUrl: string;
}

export interface QRSaveOverlayProps {
  /** Detection payload; overlay is visible when this is non-null */
  payload: QRPageDetectedPayload | null;
  /** Called when the user taps "Save QR to Wallet" */
  onSave: (imageBase64: string | null) => Promise<void>;
  /** Called when the user taps "Skip" or dismisses the overlay */
  onDismiss: () => void;
  /** Called when the user taps "Open QR Wallet" after a successful save */
  onOpenWallet: () => void;
  testID?: string;
}

type OverlayState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * QRSaveOverlay — floating bottom sheet shown when a QR code is detected on
 * the government portal WebView.
 *
 * States:
 *  - idle   → shows "Save QR to Wallet" CTA and a preview of the QR image (if available)
 *  - saving → shows a spinner / disabled button while persisting
 *  - saved  → shows a success confirmation with "Open QR Wallet" action
 *  - error  → shows error message and lets user retry or skip
 */
export function QRSaveOverlay({
  payload,
  onSave,
  onDismiss,
  onOpenWallet,
  testID,
}: QRSaveOverlayProps) {
  const translateY = useRef(new Animated.Value(300)).current;
  const [overlayState, setOverlayState] = useState<OverlayState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [primaryPressed, setPrimaryPressed] = useState(false);
  const [secondaryPressed, setSecondaryPressed] = useState(false);
  const [savePressed, setSavePressed] = useState(false);
  const [skipPressed, setSkipPressed] = useState(false);
  // Keep a ref to know whether the overlay is currently animated in.
  const isVisible = useRef(false);

  // Reset state whenever a new detection payload arrives.
  useEffect(() => {
    if (payload) {
      setOverlayState('idle');
      setErrorMessage(null);
    }
  }, [payload]);

  // Slide the overlay in/out based on whether payload is present.
  useEffect(() => {
    if (payload && !isVisible.current) {
      isVisible.current = true;
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else if (!payload && isVisible.current) {
      isVisible.current = false;
      Animated.timing(translateY, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [payload, translateY]);

  const handleSave = useCallback(async () => {
    if (!payload || overlayState === 'saving') return;
    setOverlayState('saving');
    setErrorMessage(null);
    try {
      await onSave(payload.qrImageBase64);
      setOverlayState('saved');
    } catch (err) {
      setOverlayState('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save QR code.'
      );
    }
  }, [payload, overlayState, onSave]);

  // Do not render at all if the overlay has never been triggered.
  if (!payload && !isVisible.current) {
    return null;
  }

  const portalName = payload ? getPortalName(payload.countryCode) : '';

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      testID={testID ?? QR_SAVE_OVERLAY_IDS.container.id}
    >
      <View className="bg-white rounded-t-[20px] shadow-lg elevation-16 pb-8">
        {/* Drag handle */}
        <View className="w-9 h-1 bg-gray-300 rounded-sm self-center mt-3 mb-4" />

        {/* Header row */}
        <View className="flex-row items-center px-5 mb-3">
          <View className="flex-1">
            {overlayState === 'saved' ? (
              <View className="flex-row items-center">
                <CheckCircle size={20} color="#16A34A" />
                <Text className="ml-2 text-base font-bold text-green-900" testID={QR_SAVE_OVERLAY_IDS.title.id}>
                  QR Code Saved!
                </Text>
              </View>
            ) : (
              <Text className="text-base font-bold text-gray-900" testID={QR_SAVE_OVERLAY_IDS.title.id}>
                QR Code Detected
              </Text>
            )}
            <Text className="text-sm text-gray-500 mt-0.5" testID={QR_SAVE_OVERLAY_IDS.subtitle.id}>
              {overlayState === 'saved'
                ? `Saved from ${portalName} to your QR Wallet`
                : `${portalName} generated a QR code`}
            </Text>
          </View>

          {overlayState !== 'saved' && (
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.dismissButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              accessibilityLabel="Dismiss QR save prompt"
              testID={QR_SAVE_OVERLAY_IDS.dismissButton.id}
            >
              <X size={20} color="#6B7280" />
            </Pressable>
          )}
        </View>

        {/* QR image preview */}
        {payload?.qrImageBase64 && overlayState !== 'saved' && (
          <View className="items-center mb-4 px-5" testID={QR_SAVE_OVERLAY_IDS.preview.id}>
            <Image
              source={{ uri: payload.qrImageBase64 }}
              className="w-[140px] h-[140px] rounded-lg border border-gray-200"
              resizeMode="contain"
              accessibilityLabel="Detected QR code preview"
              testID={QR_SAVE_OVERLAY_IDS.image.id}
            />
          </View>
        )}

        {/* Confirmation number */}
        {payload?.confirmationNumber && overlayState !== 'saved' && (
          <View className="mx-5 mb-4 bg-gray-50 rounded-lg p-3" testID={QR_SAVE_OVERLAY_IDS.confirmation.id}>
            <Text className="text-xs text-gray-500 mb-0.5">Reference Number</Text>
            <Text className="text-sm font-semibold text-gray-900" testID={QR_SAVE_OVERLAY_IDS.refNumber.id}>
              {payload.confirmationNumber}
            </Text>
          </View>
        )}

        {/* Error message */}
        {overlayState === 'error' && errorMessage && (
          <View className="mx-5 mb-3 bg-red-50 rounded-lg p-3 border border-red-200" testID={QR_SAVE_OVERLAY_IDS.error.id}>
            <Text className="text-sm text-red-900">{errorMessage}</Text>
          </View>
        )}

        {/* Actions */}
        <View className="px-5 mt-1">
          {overlayState === 'saved' ? (
            <>
              <Pressable
                onPress={onOpenWallet}
                onPressIn={() => setPrimaryPressed(true)}
                onPressOut={() => setPrimaryPressed(false)}
                className={`rounded-xl py-3.5 items-center ${primaryPressed ? 'bg-blue-700' : 'bg-blue-600'}`}
                accessibilityLabel="Open QR wallet"
                testID={QR_SAVE_OVERLAY_IDS.openWalletButton.id}
              >
                <Text className="text-white font-bold text-base">Open QR Wallet</Text>
              </Pressable>
              <Pressable
                onPress={onDismiss}
                onPressIn={() => setSecondaryPressed(true)}
                onPressOut={() => setSecondaryPressed(false)}
                className={`rounded-xl py-3.5 items-center border border-gray-200 mt-2.5 ${secondaryPressed ? 'bg-gray-100' : 'bg-white'}`}
                accessibilityLabel="Back to trip"
                testID={QR_SAVE_OVERLAY_IDS.backToTripButton.id}
              >
                <Text className="text-gray-700 font-semibold text-base">Back to Trip</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={handleSave}
                disabled={overlayState === 'saving'}
                onPressIn={() => setSavePressed(true)}
                onPressOut={() => setSavePressed(false)}
                className={`rounded-xl py-3.5 items-center flex-row justify-center ${
                  overlayState === 'saving'
                    ? 'bg-blue-300'
                    : savePressed
                    ? 'bg-blue-700'
                    : 'bg-blue-600'
                }`}
                accessibilityLabel="Save QR code to wallet"
                testID={QR_SAVE_OVERLAY_IDS.saveButton.id}
              >
                <View className="mr-2">
                  <Download size={18} color="#FFFFFF" />
                </View>
                <Text className="text-white font-bold text-base">
                  {overlayState === 'saving' ? 'Saving…' : 'Save QR to Wallet'}
                </Text>
              </Pressable>

              <Pressable
                onPress={onDismiss}
                onPressIn={() => setSkipPressed(true)}
                onPressOut={() => setSkipPressed(false)}
                className={`rounded-xl py-3.5 items-center mt-2.5 ${skipPressed ? 'bg-gray-100' : 'bg-white'}`}
                accessibilityLabel="Skip saving QR code"
                testID={QR_SAVE_OVERLAY_IDS.skipButton.id}
              >
                <Text className="text-gray-500 font-semibold text-base">
                  {overlayState === 'error' ? 'Skip (Screenshot Manually)' : 'Skip'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  dismissButton: {
    padding: 6,
  },
});
