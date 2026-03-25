import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { Bell, Clock, CheckCircle } from 'lucide-react-native';

import { Button, Card, ScreenContainer } from '@/components/ui';
import { useProfileStore } from '@/stores/useProfileStore';

export default function NotificationPermissionScreen() {
  const { setOnboardingComplete } = useProfileStore();
  const [isRequesting, setIsRequesting] = useState(false);

  // Auto-skip if permission was already granted (re-entry path).
  // Uses InteractionManager to defer the navigator swap until after the
  // screen transition animation completes — avoids a race condition where
  // setOnboardingComplete fires while the OnboardingStack is still animating.
  useEffect(() => {
    let cancelled = false;
    async function checkPermission() {
      try {
        const settings = await notifee.getNotificationSettings();
        if (
          cancelled ||
          (settings.authorizationStatus !== AuthorizationStatus.AUTHORIZED &&
           settings.authorizationStatus !== AuthorizationStatus.PROVISIONAL)
        ) {
          return;
        }
        // Wait for the navigation animation to settle before swapping navigators
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!cancelled) {
          setOnboardingComplete(true);
        }
      } catch {
        // If the check fails, show the screen normally so user can choose
      }
    }
    checkPermission();
    return () => { cancelled = true; };
  }, [setOnboardingComplete]);

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      await notifee.requestPermission();
    } catch {
      // Permission request failed — continue gracefully without crashing
    } finally {
      setIsRequesting(false);
    }
    setOnboardingComplete(true);
  };

  const handleSkip = () => {
    setOnboardingComplete(true);
  };

  return (
    <ScreenContainer className="bg-white dark:bg-gray-900">
    <ScrollView
      className="flex-1"
      accessibilityLabel="Notification permission screen"
    >
      <View className="px-6 py-10">
        {/* Decorative icon — hidden from screen readers */}
        <View
          className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center mb-8 self-center"
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        >
          <Bell size={48} color="#3b82f6" />
        </View>

        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
          Stay on Top of Deadlines
        </Text>
        <Text className="text-base text-gray-600 dark:text-gray-400 text-center mb-8">
          Get reminded before your travel declarations are due — 48 hours,
          24 hours, and 6 hours in advance so you never miss a submission window.
        </Text>

        <Card variant="outlined" className="mb-8">
          <View className="space-y-4">
            <View className="flex-row items-center">
              <Clock
                size={24}
                color="#3b82f6"
                style={{ marginRight: 12 }}
                accessibilityElementsHidden={true}
              />
              <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-semibold">Timely Reminders</Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  Never miss a submission deadline again
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <CheckCircle
                size={24}
                color="#16a34a"
                style={{ marginRight: 12 }}
                accessibilityElementsHidden={true}
              />
              <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-semibold">No Spam</Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  Only deadline-related notifications, nothing else
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <View className="space-y-4">
          <Button
            title={isRequesting ? 'Requesting…' : 'Allow Notifications'}
            onPress={handleAllow}
            loading={isRequesting}
            size="large"
            fullWidth
            testID="allow-notifications-button"
            accessibilityRole="button"
            accessibilityLabel="Allow notifications for deadline reminders"
            accessibilityHint="Grants permission to send you deadline reminder notifications"
          />

          <Button
            title="Skip for Now"
            onPress={handleSkip}
            variant="outline"
            size="large"
            fullWidth
            testID="skip-notifications-button"
            accessibilityRole="button"
            accessibilityLabel="Skip notification permission"
            accessibilityHint="Skip this step. You can enable notifications later in Settings."
          />
        </View>
      </View>
    </ScrollView>
    </ScreenContainer>
  );
}
