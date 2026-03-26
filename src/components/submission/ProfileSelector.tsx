import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { ChevronDown, ChevronUp, User } from 'lucide-react-native';

export interface ProfileOption {
  id: string;
  /** Full display name (e.g. "Alice Smith") */
  name: string;
  /** Relationship label (e.g. "self", "spouse") */
  relationship: string;
}

export interface ProfileSelectorProps {
  profiles: ProfileOption[];
  selectedProfileId: string;
  onSelect: (profileId: string) => void;
  testID?: string;
}

/**
 * ProfileSelector — dropdown for selecting a family member profile.
 *
 * Shows each profile as "Name (relationship)".
 * Used inside AutoFillPill to let the user choose which family member
 * to auto-fill a form for.
 */
export function ProfileSelector({
  profiles,
  selectedProfileId,
  onSelect,
  testID,
}: ProfileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const displayLabel = selectedProfile
    ? `${selectedProfile.name} (${selectedProfile.relationship})`
    : 'Select profile';

  return (
    <View testID={testID ?? 'profile-selector'}>
      {/* Trigger button */}
      <Pressable
        onPress={() => setIsOpen(prev => !prev)}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        className={`flex-row items-center rounded-lg px-2.5 py-2 gap-1.5 ${isPressed ? 'bg-gray-200' : 'bg-gray-100'}`}
        accessibilityLabel="Select profile for auto-fill"
        testID="profile-selector-trigger"
      >
        <User size={14} color="#6B7280" />
        <Text className="flex-1 text-[13px] text-gray-700 font-medium" numberOfLines={1} testID="profile-selector-label">
          {displayLabel}
        </Text>
        {isOpen ? (
          <ChevronUp size={14} color="#6B7280" />
        ) : (
          <ChevronDown size={14} color="#6B7280" />
        )}
      </Pressable>

      {/* Dropdown options */}
      {isOpen && (
        <ScrollView
          className="max-h-[200px] mt-1 bg-white rounded-lg border border-gray-200 shadow-sm elevation-3"
          contentContainerClassName="py-1"
          nestedScrollEnabled
          testID="profile-selector-dropdown"
        >
          {profiles.map(profile => {
            const isSelected = profile.id === selectedProfileId;
            return (
              <Pressable
                key={profile.id}
                onPress={() => {
                  onSelect(profile.id);
                  setIsOpen(false);
                }}
                className={`flex-row items-center px-3 py-2.5 ${isSelected ? 'bg-blue-50' : ''}`}
                accessibilityLabel={`Select ${profile.name}`}
                testID={`profile-option-${profile.id}`}
              >
                <Text
                  className={`flex-1 text-[13px] ${isSelected ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
                  numberOfLines={1}
                >
                  {profile.name} ({profile.relationship})
                </Text>
                {isSelected && (
                  <View className="w-2 h-2 rounded-full bg-blue-600 ml-2" testID={`profile-selected-dot-${profile.id}`} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
