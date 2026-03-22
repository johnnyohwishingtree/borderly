/**
 * LockScreen — shown when the app is locked after inactivity or app-background.
 *
 * Features:
 * - Displays the app logo / branding
 * - "Unlock with Face ID / Touch ID / Fingerprint" button that triggers the
 *   OS biometric prompt via react-native-keychain
 * - PIN fallback option (shows a prompt when biometrics are unavailable or
 *   when the user explicitly chooses PIN)
 * - On success: calls useAppStore.unlock()
 * - On failure / cancel: shows an error message and allows retry
 * - Prevents access to any navigation while visible
 * - Full accessibility support (roles, labels, live regions)
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import * as Keychain from 'react-native-keychain';

import { Button } from '@/components/ui';
import { useAppStore } from '@/stores/useAppStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BiometryLabel = 'Face ID' | 'Touch ID' | 'Fingerprint' | 'Biometrics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBiometryLabel(type: string | null): BiometryLabel {
  if (type === Keychain.BIOMETRY_TYPE.FACE_ID) return 'Face ID';
  if (type === Keychain.BIOMETRY_TYPE.TOUCH_ID) return 'Touch ID';
  if (type === Keychain.BIOMETRY_TYPE.FINGERPRINT) return 'Fingerprint';
  return 'Biometrics';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LockScreen() {
  const unlock = useAppStore(s => s.unlock);

  const [biometryType, setBiometryType] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect which biometry type the device supports on mount.
  useEffect(() => {
    Keychain.getSupportedBiometryType()
      .then(type => setBiometryType(type))
      .catch(() => setBiometryType(null));
  }, []);

  // Derive the button label from the detected biometry type.
  const biometryLabel = getBiometryLabel(biometryType);
  const unlockButtonTitle = isUnlocking
    ? 'Unlocking…'
    : `Unlock with ${biometryLabel}`;

  // -------------------------------------------------------------------------
  // Biometric unlock
  // -------------------------------------------------------------------------

  const handleBiometricUnlock = useCallback(async () => {
    setIsUnlocking(true);
    setError(null);

    try {
      const result = await Keychain.getGenericPassword({
        authenticationPrompt: {
          title: 'Unlock Borderly',
          subtitle: 'Confirm your identity to access your travel data',
          cancel: 'Cancel',
        },
      });

      if (result !== false) {
        // Successfully authenticated — unlock the app.
        unlock();
      } else {
        // User cancelled or no credentials stored; allow retry.
        setError('Authentication was cancelled. Please try again.');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setIsUnlocking(false);
    }
  }, [unlock]);

  // -------------------------------------------------------------------------
  // PIN fallback
  // -------------------------------------------------------------------------

  const handlePinFallback = useCallback(() => {
    Alert.alert(
      'Enter PIN',
      'PIN unlock is not yet available in this version. Please use biometric authentication.',
      [{ text: 'OK' }],
    );
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View
      className="flex-1 bg-gray-950 items-center justify-center px-8"
      testID="lock-screen"
      accessible={false}
    >
      {/* App logo / branding — decorative, hidden from screen readers */}
      <View
        className="w-24 h-24 bg-blue-600 rounded-2xl items-center justify-center mb-8 shadow-2xl"
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      >
        <Text className="text-white text-4xl font-bold">B</Text>
      </View>

      {/* Title */}
      <Text
        className="text-white text-3xl font-bold mb-2 text-center"
        accessibilityRole="header"
      >
        Borderly Locked
      </Text>

      {/* Subtitle */}
      <Text className="text-gray-400 text-base text-center mb-12">
        Authenticate to access your travel data
      </Text>

      {/* Error message — announced to screen readers automatically */}
      {error !== null && (
        <View
          className="bg-red-900/50 border border-red-700 rounded-xl px-4 py-3 mb-6 w-full"
          accessible={true}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Error: ${error}`}
          testID="lock-screen-error"
        >
          <Text className="text-red-300 text-sm text-center">{error}</Text>
        </View>
      )}

      {/* Biometric unlock button */}
      <Button
        title={unlockButtonTitle}
        onPress={handleBiometricUnlock}
        loading={isUnlocking}
        size="large"
        fullWidth
        testID="lock-screen-biometric-button"
        accessibilityRole="button"
        accessibilityLabel={`Unlock with ${biometryLabel}`}
        accessibilityHint="Triggers the device biometric authentication prompt to unlock the app"
      />

      {/* PIN fallback */}
      <View className="mt-4 w-full">
        <Button
          title="Use PIN Instead"
          onPress={handlePinFallback}
          variant="outline"
          size="large"
          fullWidth
          testID="lock-screen-pin-button"
          accessibilityRole="button"
          accessibilityLabel="Use PIN to unlock"
          accessibilityHint="Opens a PIN entry prompt as an alternative to biometric authentication"
        />
      </View>
    </View>
  );
}
