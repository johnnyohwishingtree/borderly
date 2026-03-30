import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import { ProfileSelector } from './ProfileSelector';
import type { ProfileOption } from './ProfileSelector';
import { AUTOFILL_PILL_IDS } from './testIDs';

export type { ProfileOption };

export interface AutoFillPillProps {
  /** List of profiles available to fill as */
  profiles: ProfileOption[];
  /** Currently selected profile ID */
  selectedProfileId: string;
  /** Called when the user selects a different profile */
  onProfileChange: (profileId: string) => void;
  /** Called when the user taps "Auto-fill Now" */
  onAutoFill: () => void;
  /** Called when the user dismisses the pill */
  onDismiss: () => void;
  testID?: string;
}

/**
 * AutoFillPill — floating "Auto-fill available" pill shown at the bottom
 * of the WebView when form fields are detected on the page.
 *
 * Design:
 * - Floating card anchored to the bottom of the WebView
 * - Shows profile selector when multiple family profiles are available
 * - User explicitly taps "Auto-fill Now" to trigger filling
 * - Can be dismissed without filling
 */
export function AutoFillPill({
  profiles,
  selectedProfileId,
  onProfileChange,
  onAutoFill,
  onDismiss,
  testID,
}: AutoFillPillProps) {
  const showProfileSelector = profiles.length > 1;
  const [fillPressed, setFillPressed] = useState(false);

  return (
    <View className="absolute bottom-4 left-4 right-4 z-50" testID={testID ?? AUTOFILL_PILL_IDS.container.id} pointerEvents="box-none">
      <View className="bg-white rounded-xl p-3.5 shadow-lg elevation-8 border border-gray-200">
        {/* Header row */}
        <View className="flex-row items-center mb-2.5 gap-1.5">
          <Sparkles size={16} color="#2563EB" />
          <Text className="flex-1 text-sm font-semibold text-gray-900">Auto-fill available</Text>
          <Pressable
            onPress={onDismiss}
            className="p-0.5"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Dismiss auto-fill pill"
            testID={AUTOFILL_PILL_IDS.dismiss.id}
          >
            <X size={16} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Profile selector (only shown for family trips with multiple profiles) */}
        {showProfileSelector && (
          <View className="flex-row items-start mb-3 gap-2">
            <Text className="text-sm text-gray-500 pt-2">Fill as:</Text>
            <View className="flex-1">
              <ProfileSelector
                profiles={profiles}
                selectedProfileId={selectedProfileId}
                onSelect={onProfileChange}
                testID={AUTOFILL_PILL_IDS.profileSelector.id}
              />
            </View>
          </View>
        )}

        {/* Single profile label (shown when only one profile) */}
        {!showProfileSelector && profiles.length === 1 && (
          <Text className="text-[13px] text-gray-500 mb-3" testID={AUTOFILL_PILL_IDS.singleProfile.id}>
            Fill as: {profiles[0].name} ({profiles[0].relationship})
          </Text>
        )}

        {/* Auto-fill Now button */}
        <Pressable
          onPress={onAutoFill}
          onPressIn={() => setFillPressed(true)}
          onPressOut={() => setFillPressed(false)}
          className={`rounded-lg py-3 items-center ${fillPressed ? 'bg-blue-700' : 'bg-blue-600'}`}
          accessibilityLabel="Auto-fill form fields now"
          testID={AUTOFILL_PILL_IDS.fillButton.id}
        >
          <Text className="text-white text-sm font-semibold">Auto-fill Now</Text>
        </Pressable>
      </View>
    </View>
  );
}
