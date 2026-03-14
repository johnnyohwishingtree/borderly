import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { CheckCircle, Download, X } from 'lucide-react-native';

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

  const countryLabels: Record<string, string> = {
    JPN: 'Visit Japan Web',
    MYS: 'Malaysia MDAC',
    SGP: 'SG Arrival Card',
  };
  const portalName = payload
    ? (countryLabels[payload.countryCode] ?? payload.countryCode)
    : '';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        transform: [{ translateY }],
        zIndex: 100,
      }}
      testID={testID ?? 'qr-save-overlay'}
    >
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 16,
          paddingBottom: 32,
        }}
      >
        {/* Drag handle */}
        <View
          style={{
            width: 36,
            height: 4,
            backgroundColor: '#D1D5DB',
            borderRadius: 2,
            alignSelf: 'center',
            marginTop: 12,
            marginBottom: 16,
          }}
        />

        {/* Header row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            {overlayState === 'saved' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CheckCircle size={20} color="#16A34A" />
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#166534',
                  }}
                  testID="qr-overlay-title"
                >
                  QR Code Saved!
                </Text>
              </View>
            ) : (
              <Text
                style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}
                testID="qr-overlay-title"
              >
                QR Code Detected
              </Text>
            )}
            <Text
              style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}
              testID="qr-overlay-subtitle"
            >
              {overlayState === 'saved'
                ? `Saved from ${portalName} to your QR Wallet`
                : `${portalName} generated a QR code`}
            </Text>
          </View>

          {overlayState !== 'saved' && (
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                padding: 6,
              })}
              accessibilityLabel="Dismiss QR save prompt"
              testID="qr-overlay-dismiss"
            >
              <X size={20} color="#6B7280" />
            </Pressable>
          )}
        </View>

        {/* QR image preview */}
        {payload?.qrImageBase64 && overlayState !== 'saved' && (
          <View
            style={{
              alignItems: 'center',
              marginBottom: 16,
              paddingHorizontal: 20,
            }}
            testID="qr-overlay-preview"
          >
            <Image
              source={{ uri: payload.qrImageBase64 }}
              style={{
                width: 140,
                height: 140,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
              resizeMode="contain"
              accessibilityLabel="Detected QR code preview"
              testID="qr-overlay-image"
            />
          </View>
        )}

        {/* Confirmation number */}
        {payload?.confirmationNumber && overlayState !== 'saved' && (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 16,
              backgroundColor: '#F9FAFB',
              borderRadius: 8,
              padding: 12,
            }}
            testID="qr-overlay-confirmation"
          >
            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>
              Reference Number
            </Text>
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}
              testID="qr-overlay-ref-number"
            >
              {payload.confirmationNumber}
            </Text>
          </View>
        )}

        {/* Error message */}
        {overlayState === 'error' && errorMessage && (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 12,
              backgroundColor: '#FEF2F2',
              borderRadius: 8,
              padding: 12,
              borderWidth: 1,
              borderColor: '#FECACA',
            }}
            testID="qr-overlay-error"
          >
            <Text style={{ fontSize: 13, color: '#991B1B' }}>{errorMessage}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
          {overlayState === 'saved' ? (
            <>
              <Pressable
                onPress={onOpenWallet}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#1D4ED8' : '#2563EB',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                })}
                accessibilityLabel="Open QR wallet"
                testID="qr-overlay-open-wallet"
              >
                <Text
                  style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}
                >
                  Open QR Wallet
                </Text>
              </Pressable>
              <Pressable
                onPress={onDismiss}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#F3F4F6' : '#FFFFFF',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  marginTop: 10,
                })}
                accessibilityLabel="Back to trip"
                testID="qr-overlay-back-to-trip"
              >
                <Text
                  style={{ color: '#374151', fontWeight: '600', fontSize: 15 }}
                >
                  Back to Trip
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={handleSave}
                disabled={overlayState === 'saving'}
                style={({ pressed }) => ({
                  backgroundColor:
                    overlayState === 'saving'
                      ? '#93C5FD'
                      : pressed
                      ? '#1D4ED8'
                      : '#2563EB',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                })}
                accessibilityLabel="Save QR code to wallet"
                testID="qr-overlay-save-button"
              >
                <View style={{ marginRight: 8 }}>
                  <Download size={18} color="#FFFFFF" />
                </View>
                <Text
                  style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}
                >
                  {overlayState === 'saving' ? 'Saving…' : 'Save QR to Wallet'}
                </Text>
              </Pressable>

              <Pressable
                onPress={onDismiss}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#F3F4F6' : '#FFFFFF',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginTop: 10,
                })}
                accessibilityLabel="Skip saving QR code"
                testID="qr-overlay-skip-button"
              >
                <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 15 }}>
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
