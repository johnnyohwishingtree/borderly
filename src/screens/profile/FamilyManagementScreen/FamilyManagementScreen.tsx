import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Users } from 'lucide-react-native';
import { ProfileStackParamList } from '@/app/navigation/types';
import { Button, Card, EmptyState, LoadingStates, ScreenContainer } from '@/components/ui';
import { FamilyMemberCard } from '@/components/profile';
import { FamilyMember } from '@/types/profile';
import { useProfileStore } from '@/stores/useProfileStore';
import { useTheme } from '@/utils/theme';

type FamilyManagementScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'FamilyManagement'>;

export default function FamilyManagementScreen() {
  const navigation = useNavigation<FamilyManagementScreenNavigationProp>();
  const { colors } = useTheme();
  const { loadFamilyProfiles, getAllFamilyProfiles, deleteProfile, familyProfiles } = useProfileStore();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all family members on screen focus
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setIsLoading(true);
        try {
          await loadFamilyProfiles();
          const members = await getAllFamilyProfiles();
          setFamilyMembers(members);
        } catch (error) {
          console.error('Failed to load family members:', error);
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }, [loadFamilyProfiles, getAllFamilyProfiles])
  );

  const handleAddFamilyMember = () => {
    navigation.navigate('AddFamilyMember');
  };

  const handleEditMember = (member: FamilyMember) => {
    if (member.relationship === 'self') {
      // Navigate to edit primary profile
      navigation.navigate('EditProfile');
    } else {
      // Navigate to PassportScan in familyMode with existing profile pre-filled
      navigation.navigate('PassportScan', {
        familyMode: true,
        relationship: member.relationship,
        profileId: member.id,
      });
    }
  };

  const handleRemoveMember = (member: FamilyMember) => {
    if (member.relationship === 'self') {
      return; // Can't remove primary profile
    }

    Alert.alert(
      'Remove Family Member',
      `Are you sure you want to remove ${member.givenNames} ${member.surname} from your family profile? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProfile(member.id);
              // Refresh the list after deletion
              const updated = await getAllFamilyProfiles();
              setFamilyMembers(updated);
            } catch (error) {
              console.error('Failed to remove family member:', error);
              Alert.alert(
                'Remove Failed',
                'Could not remove the family member. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  // Determine which member is the primary (for hiding delete button)
  const primaryProfileId = familyProfiles.primaryProfileId;

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <LoadingStates
          state="loading"
          variant="spinner"
          size="large"
          text="Loading family members..."
          fullScreen={true}
        />
      </View>
    );
  }

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
    <ScrollView className="flex-1">
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              <Users size={24} color={colors.textPrimary} style={{ marginRight: 8 }} importantForAccessibility="no" />
              <View>
                <Text
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                  accessibilityRole="header"
                >
                  Family Members
                </Text>
                <Text className="text-base text-gray-600 dark:text-gray-400">
                  Manage your family travel profiles
                </Text>
              </View>
            </View>
            <Button
              title="Add Member"
              onPress={handleAddFamilyMember}
              variant="primary"
              size="medium"
              testID="add-member-button"
            />
          </View>
        </View>

        {/* Family Members List */}
        {familyMembers.length > 0 ? (
          <View className="space-y-4">
            {familyMembers.map((member) => {
              const isPrimary = member.id === primaryProfileId;
              return (
                <FamilyMemberCard
                  key={member.id}
                  member={member}
                  onEdit={() => handleEditMember(member)}
                  isActive={isPrimary}
                  testID={`family-member-card-${member.id}`}
                  {...(!isPrimary ? { onRemove: () => handleRemoveMember(member) } : {})}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon={<Users size={40} color="#6b7280" />}
            title="No Family Members"
            description="Add family members to manage multiple travel profiles and streamline form completion for everyone."
            buttonProps={{
              title: "Add First Member",
              onPress: handleAddFamilyMember,
              variant: "primary"
            }}
            variant="illustration"
          />
        )}

        {/* Information Card */}
        <Card className="mt-6">
          <View className="p-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              About Family Profiles
            </Text>
            <View className="space-y-2">
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                • Each family member gets their own secure profile
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                • All data is stored locally on your device
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                • Scan multiple passports for quick setup
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                • Forms can be auto-filled for each family member
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
    </ScreenContainer>
  );
}
