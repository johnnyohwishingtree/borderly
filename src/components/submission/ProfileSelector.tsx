import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
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

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const displayLabel = selectedProfile
    ? `${selectedProfile.name} (${selectedProfile.relationship})`
    : 'Select profile';

  return (
    <View testID={testID ?? 'profile-selector'}>
      {/* Trigger button */}
      <Pressable
        onPress={() => setIsOpen(prev => !prev)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        accessibilityLabel="Select profile for auto-fill"
        testID="profile-selector-trigger"
      >
        <User size={14} color="#6B7280" />
        <Text style={styles.triggerText} numberOfLines={1} testID="profile-selector-label">
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
          style={styles.dropdown}
          contentContainerStyle={styles.dropdownContent}
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
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
                accessibilityLabel={`Select ${profile.name}`}
                testID={`profile-option-${profile.id}`}
              >
                <Text
                  style={[styles.optionText, isSelected && styles.optionTextSelected]}
                  numberOfLines={1}
                >
                  {profile.name} ({profile.relationship})
                </Text>
                {isSelected && (
                  <View style={styles.selectedDot} testID={`profile-selected-dot-${profile.id}`} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  triggerPressed: {
    backgroundColor: '#E5E7EB',
  },
  triggerText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  dropdown: {
    maxHeight: 200,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownContent: {
    paddingVertical: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionPressed: {
    backgroundColor: '#F3F4F6',
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginLeft: 8,
  },
});
