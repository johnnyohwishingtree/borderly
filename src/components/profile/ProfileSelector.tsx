import { memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { User, Check } from 'lucide-react-native';
import { Card } from '../ui';
import { FamilyMember } from '../../types/profile';

export interface ProfileSelectorProps {
  profiles: FamilyMember[];
  activeProfileId?: string;
  onSelectProfile: (profileId: string) => void;
  title?: string;
  showCompact?: boolean;
}

const ProfileSelector = memo<ProfileSelectorProps>(({ 
  profiles,
  activeProfileId,
  onSelectProfile,
  title = "Select Traveler",
  showCompact = false
}) => {
  const getRelationshipDisplay = (relationship: string) => {
    switch (relationship) {
      case 'self':
        return 'Primary';
      case 'spouse':
        return 'Spouse';
      case 'child':
        return 'Child';
      case 'parent':
        return 'Parent';
      case 'other':
        return 'Other';
      default:
        return 'Family';
    }
  };

  if (profiles.length === 0) {
    return (
      <Card className="p-4">
        <View className="items-center py-4">
          <User size={32} color="#9ca3af" />
          <Text className="text-gray-500 text-center mt-2">
            No family members added yet
          </Text>
        </View>
      </Card>
    );
  }

  if (showCompact) {
    return (
      <Card className="mb-4">
        <View className="p-3">
          <Text className="text-sm font-medium text-gray-700 mb-3">{title}</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="space-x-2"
          >
            {profiles.map((profile) => {
              const isSelected = profile.id === activeProfileId;
              
              return (
                <TouchableOpacity
                  key={profile.id}
                  onPress={() => onSelectProfile(profile.id)}
                  className={`
                    px-3 py-2 rounded-lg border mr-2 min-w-0
                    ${isSelected 
                      ? 'bg-blue-50 border-blue-500' 
                      : 'bg-white border-gray-200'
                    }
                  `}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <View className={`
                      w-6 h-6 rounded-full items-center justify-center mr-2
                      ${isSelected ? 'bg-blue-500' : 'bg-gray-300'}
                    `}>
                      {isSelected ? (
                        <Check size={12} color="white" />
                      ) : (
                        <User size={12} color="#6b7280" />
                      )}
                    </View>
                    <View>
                      <Text className={`text-sm font-medium ${
                        isSelected ? 'text-blue-700' : 'text-gray-900'
                      }`}>
                        {profile.givenNames.split(' ')[0]}
                      </Text>
                      <Text className={`text-xs ${
                        isSelected ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {getRelationshipDisplay(profile.relationship)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <View className="p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-4">{title}</Text>
        <View className="space-y-2">
          {profiles.map((profile) => {
            const isSelected = profile.id === activeProfileId;
            
            return (
              <TouchableOpacity
                key={profile.id}
                onPress={() => onSelectProfile(profile.id)}
                className={`
                  p-4 rounded-lg border
                  ${isSelected 
                    ? 'bg-blue-50 border-blue-500' 
                    : 'bg-gray-50 border-gray-200'
                  }
                `}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <View className={`
                    w-10 h-10 rounded-full items-center justify-center mr-3
                    ${isSelected ? 'bg-blue-500' : 'bg-gray-300'}
                  `}>
                    {isSelected ? (
                      <Check size={20} color="white" />
                    ) : (
                      <User size={20} color="#6b7280" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className={`text-base font-medium ${
                      isSelected ? 'text-blue-700' : 'text-gray-900'
                    }`}>
                      {profile.givenNames} {profile.surname}
                    </Text>
                    <View className="flex-row items-center space-x-2 mt-1">
                      <Text className={`text-sm ${
                        isSelected ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {getRelationshipDisplay(profile.relationship)}
                      </Text>
                      <Text className={`text-sm ${
                        isSelected ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        • {profile.nationality}
                      </Text>
                      <Text className={`text-sm ${
                        isSelected ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        • Born {new Date(profile.dateOfBirth).getFullYear()}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View className="ml-2">
                      <View className="w-6 h-6 bg-blue-500 rounded-full items-center justify-center">
                        <Check size={16} color="white" />
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Card>
  );
});

ProfileSelector.displayName = 'ProfileSelector';

export default ProfileSelector;