import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Users } from 'lucide-react-native';
import { ProfileStackParamList } from '@/app/navigation/types';
import { Button, Card, EmptyState, LoadingSpinner } from '@/components/ui';
import { FamilyMemberCard } from '@/components/profile';
import { FamilyMember } from '@/types/profile';
import { useProfileStore } from '@/stores/useProfileStore';

type FamilyManagementScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'FamilyManagement'>;

export default function FamilyManagementScreen() {
  const navigation = useNavigation<FamilyManagementScreenNavigationProp>();
  const { profile, loadProfile } = useProfileStore();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load family members on screen focus
  useFocusEffect(() => {
    loadFamilyMembers();
  });

  const loadFamilyMembers = async () => {
    setIsLoading(true);
    try {
      await loadProfile();
      
      // Create family members list with primary profile as 'self'
      if (profile) {
        const primaryMember: FamilyMember = {
          ...profile,
          relationship: 'self'
        };
        
        // TODO: Load additional family members from storage
        // For now, just show the primary profile
        setFamilyMembers([primaryMember]);
      }
    } catch (error) {
      console.error('Failed to load family members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFamilyMember = () => {
    navigation.navigate('AddFamilyMember');
  };

  const handleEditMember = (member: FamilyMember) => {
    if (member.relationship === 'self') {
      // Navigate to edit primary profile
      navigation.navigate('EditProfile');
    } else {
      // TODO: Navigate to edit family member screen
      Alert.alert('Edit Family Member', 'Family member editing coming soon!');
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
          onPress: () => {
            // TODO: Implement family member removal
            Alert.alert('Remove Family Member', 'Family member removal coming soon!');
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50">
        <LoadingSpinner 
          size="large" 
          text="Loading family members..." 
          variant="spinner"
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              <Users size={24} color="#111827" style={{ marginRight: 8 }} />
              <View>
                <Text className="text-2xl font-bold text-gray-900">
                  Family Members
                </Text>
                <Text className="text-base text-gray-600">
                  Manage your family travel profiles
                </Text>
              </View>
            </View>
            <Button
              title="Add Member"
              onPress={handleAddFamilyMember}
              variant="primary"
              size="medium"
            />
          </View>
        </View>

        {/* Family Members List */}
        {familyMembers.length > 0 ? (
          <View className="space-y-4">
            {familyMembers.map((member) => {
              const props: any = {
                key: member.id,
                member,
                onEdit: () => handleEditMember(member),
                isActive: false,
              };
              
              if (member.relationship !== 'self') {
                props.onRemove = () => handleRemoveMember(member);
              }
              
              return <FamilyMemberCard {...props} />;
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
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              About Family Profiles
            </Text>
            <View className="space-y-2">
              <Text className="text-sm text-gray-600">
                • Each family member gets their own secure profile
              </Text>
              <Text className="text-sm text-gray-600">
                • All data is stored locally on your device
              </Text>
              <Text className="text-sm text-gray-600">
                • Scan multiple passports for quick setup
              </Text>
              <Text className="text-sm text-gray-600">
                • Forms can be auto-filled for each family member
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}