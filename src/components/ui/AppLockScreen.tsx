import { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { APP_LOCK_SCREEN_IDS } from './testIDs';

interface AppLockScreenProps {
  onUnlock: () => Promise<boolean>;
}

/**
 * Overlay shown when the app has been locked due to inactivity.
 * Prompts the user to re-authenticate via biometrics.
 */
export default function AppLockScreen({ onUnlock }: AppLockScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  const handleUnlock = async () => {
    setIsAuthenticating(true);
    setAuthFailed(false);
    try {
      const success = await onUnlock();
      if (!success) {
        setAuthFailed(true);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View
      className="flex-1 bg-gray-900 items-center justify-center p-8"
      testID={APP_LOCK_SCREEN_IDS.container.id}
    >
      <View className="items-center mb-8">
        <View className="bg-blue-600 rounded-full p-6 mb-6">
          <Lock size={48} color="white" />
        </View>
        <Text className="text-2xl font-bold text-white mb-2">Borderly Locked</Text>
        <Text className="text-base text-gray-400 text-center">
          The app locked after 5 minutes of inactivity.{'\n'}
          Authenticate to continue.
        </Text>
      </View>

      {authFailed && (
        <View className="bg-red-900 border border-red-700 rounded-lg p-3 mb-6 w-full">
          <Text className="text-sm text-red-300 text-center">
            Authentication failed. Please try again.
          </Text>
        </View>
      )}

      {isAuthenticating ? (
        <ActivityIndicator size="large" color="#3b82f6" />
      ) : (
        <Button
          title="Unlock with Biometrics"
          onPress={handleUnlock}
          variant="primary"
          fullWidth
        />
      )}
    </View>
  );
}
