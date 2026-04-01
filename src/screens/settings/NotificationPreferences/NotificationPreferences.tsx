import { View, Text, ScrollView, Pressable } from 'react-native';
import { Bell, BellOff, Clock, Moon, Check } from 'lucide-react-native';
import { Card, Toggle, ScreenContainer } from '@/components/ui';
import { useAppStore, type NotificationTiming } from '@/stores/useAppStore';

const TIMING_OPTIONS: { value: NotificationTiming; label: string; description: string }[] = [
  { value: '48h', label: '48 hours before', description: '2 days before deadline' },
  { value: '24h', label: '24 hours before', description: '1 day before deadline' },
  { value: '6h', label: '6 hours before', description: 'Last reminder before deadline' },
];

export default function NotificationPreferences() {
  const { notificationPreferences, updateNotificationPreferences } = useAppStore();
  const { enabled, timing, quietHoursEnabled, quietHoursStart, quietHoursEnd } = notificationPreferences;

  const handleMasterToggle = (value: boolean) => {
    updateNotificationPreferences({ enabled: value });
  };

  const handleTimingToggle = (timingValue: NotificationTiming) => {
    const newTiming = timing.includes(timingValue)
      ? timing.filter(t => t !== timingValue)
      : [...timing, timingValue];
    // Ensure at least one timing is selected
    if (newTiming.length > 0) {
      updateNotificationPreferences({ timing: newTiming });
    }
  };

  const handleQuietHoursToggle = (value: boolean) => {
    updateNotificationPreferences({ quietHoursEnabled: value });
  };

  return (
    <ScreenContainer className="bg-surface-secondary">
      <ScrollView className="flex-1">
        <View className="p-4 space-y-4">
          {/* Header */}
          <View className="mb-2">
            <Text className="text-base text-secondary">
              Configure deadline reminders for your travel forms
            </Text>
          </View>

          {/* Master Toggle */}
          <Card testID="notification-master-card">
            <View className="flex-row justify-between items-start">
              <View className="flex-row items-center flex-1">
                {enabled ? (
                  <Bell size={24} color="#3b82f6" />
                ) : (
                  <BellOff size={24} color="#9ca3af" />
                )}
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-primary">
                    Deadline Reminders
                  </Text>
                  <Text className="text-sm text-secondary mt-1">
                    Get notified before form submission deadlines
                  </Text>
                </View>
              </View>
              <Toggle
                value={enabled}
                onValueChange={handleMasterToggle}
                accessibilityLabel="Enable deadline notifications"
                accessibilityHint="Toggle all deadline reminder notifications"
                testID="notification-master-toggle"
              />
            </View>
          </Card>

          {/* Timing Options */}
          {enabled && (
            <Card testID="notification-timing-card">
              <View className="flex-row items-center mb-4">
                <Clock size={20} color="#6b7280" />
                <Text className="text-lg font-semibold text-primary ml-2">
                  Reminder Timing
                </Text>
              </View>
              <Text className="text-sm text-secondary mb-4">
                Choose when to receive reminders before each deadline
              </Text>

              <View className="space-y-3">
                {TIMING_OPTIONS.map(option => {
                  const isSelected = timing.includes(option.value);
                  const isLastSelected = isSelected && timing.length === 1;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => handleTimingToggle(option.value)}
                      disabled={isLastSelected}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected, disabled: isLastSelected }}
                      accessibilityLabel={`${option.label} reminder`}
                      accessibilityHint={isLastSelected ? 'At least one timing must be selected' : `Toggle ${option.label} reminder`}
                      testID={`timing-${option.value}`}
                    >
                      <View className={`flex-row items-center justify-between p-3 rounded-lg ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'bg-surface-secondary'
                      }`}>
                        <View className="flex-1">
                          <Text className={`text-base font-medium ${
                            isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-secondary'
                          }`}>
                            {option.label}
                          </Text>
                          <Text className="text-xs text-tertiary mt-1">
                            {option.description}
                          </Text>
                        </View>
                        <View className={`w-6 h-6 rounded border-2 items-center justify-center ${
                          isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-surface border-border-default'
                        }`}>
                          {isSelected && (
                            <Check size={14} color="#ffffff" />
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          )}

          {/* Quiet Hours */}
          {enabled && (
            <Card testID="notification-quiet-hours-card">
              <View className="flex-row items-center mb-4">
                <Moon size={20} color="#6b7280" />
                <Text className="text-lg font-semibold text-primary ml-2">
                  Quiet Hours
                </Text>
              </View>

              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-base font-medium text-primary">
                    Suppress during sleep
                  </Text>
                  <Text className="text-sm text-secondary mt-1">
                    Notifications are held until quiet hours end
                  </Text>
                </View>
                <Toggle
                  value={quietHoursEnabled}
                  onValueChange={handleQuietHoursToggle}
                  accessibilityLabel="Enable quiet hours"
                  accessibilityHint="Suppress notifications during sleep hours"
                  testID="quiet-hours-toggle"
                />
              </View>

              {quietHoursEnabled && (
                <View className="bg-surface-secondary p-3 rounded-lg">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm text-secondary">Start</Text>
                    <Text
                      className="text-base font-medium text-primary"
                      accessibilityLabel={`Quiet hours start at ${quietHoursStart}`}
                      testID="quiet-hours-start"
                    >
                      {quietHoursStart}
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center mt-2">
                    <Text className="text-sm text-secondary">End</Text>
                    <Text
                      className="text-base font-medium text-primary"
                      accessibilityLabel={`Quiet hours end at ${quietHoursEnd}`}
                      testID="quiet-hours-end"
                    >
                      {quietHoursEnd}
                    </Text>
                  </View>
                </View>
              )}
            </Card>
          )}

          {/* Info */}
          <View className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <Text className="text-sm font-medium text-blue-900 dark:text-blue-100">
              About Notifications
            </Text>
            <Text className="text-xs text-blue-800 dark:text-blue-200 mt-1">
              Notifications are local-only — they are scheduled on your device and never sent to any server.
              You can change these settings at any time.
            </Text>
          </View>

          <View className="h-8" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
