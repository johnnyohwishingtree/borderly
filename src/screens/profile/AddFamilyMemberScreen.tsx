import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { UserPlus, Camera, Pencil } from 'lucide-react-native';
import { ProfileStackParamList } from '@/app/navigation/types';
import { Button, Card, Select } from '@/components/ui';
import { FamilyRelationship } from '@/types/profile';

type AddFamilyMemberScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'AddFamilyMember'>;
type AddFamilyMemberScreenRouteProp = RouteProp<ProfileStackParamList, 'AddFamilyMember'>;

const relationshipOptions = [
  { label: 'Spouse', value: 'spouse' },
  { label: 'Child', value: 'child' },
  { label: 'Parent', value: 'parent' },
  { label: 'Other Family', value: 'other' },
];

export default function AddFamilyMemberScreen() {
  const navigation = useNavigation<AddFamilyMemberScreenNavigationProp>();
  const route = useRoute<AddFamilyMemberScreenRouteProp>();
  
  const [selectedRelationship, setSelectedRelationship] = useState<FamilyRelationship>(
    (route.params?.relationship as FamilyRelationship) || 'spouse'
  );

  const handleScanPassport = () => {
    // Navigate to passport scan with family mode enabled
    navigation.navigate('PassportScan' as any, {
      familyMode: true,
      relationship: selectedRelationship
    });
  };

  const handleManualEntry = () => {
    // For now, redirect to passport scan with manual mode
    // In a full implementation, this would go to a dedicated manual entry form
    navigation.navigate('PassportScan' as any, {
      familyMode: true,
      relationship: selectedRelationship
    });
  };

  const getRelationshipDescription = (relationship: FamilyRelationship) => {
    switch (relationship) {
      case 'spouse':
        return 'Add your spouse or partner to your family profile';
      case 'child':
        return 'Add your child to your family profile';
      case 'parent':
        return 'Add your parent to your family profile';
      case 'other':
        return 'Add another family member to your profile';
      default:
        return 'Add a family member to your profile';
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row items-center mb-4">
            <UserPlus size={24} color="#111827" style={{ marginRight: 8 }} />
            <View>
              <Text className="text-2xl font-bold text-gray-900">
                Add Family Member
              </Text>
              <Text className="text-base text-gray-600">
                Create a new family travel profile
              </Text>
            </View>
          </View>
        </View>

        {/* Relationship Selection */}
        <Card className="mb-6">
          <View className="p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Relationship
            </Text>
            <Select
              label="Family Relationship"
              value={selectedRelationship}
              onValueChange={(value) => setSelectedRelationship(value as FamilyRelationship)}
              options={relationshipOptions}
              placeholder="Select relationship"
              testID="relationship-select"
            />
            <Text className="text-sm text-gray-600 mt-2">
              {getRelationshipDescription(selectedRelationship)}
            </Text>
          </View>
        </Card>

        {/* Input Methods */}
        <View className="space-y-4">
          {/* Passport Scanning */}
          <Card variant="elevated" className="bg-gradient-to-br from-blue-50 to-indigo-50">
            <View className="items-center py-8 px-4">
              <View className="w-32 h-32 border-4 border-dashed border-blue-300 rounded-lg mb-4 items-center justify-center">
                <Camera size={40} color="#3b82f6" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Scan Passport
              </Text>
              <Text className="text-sm text-gray-600 text-center mb-4">
                Quickly add {selectedRelationship === 'spouse' ? 'your spouse' : 
                           selectedRelationship === 'child' ? 'your child' : 
                           selectedRelationship === 'parent' ? 'your parent' : 
                           'your family member'} by scanning their passport
              </Text>
              <Button
                title="Start Camera Scan"
                onPress={handleScanPassport}
                variant="primary"
                size="large"
                testID="start-camera-scan-button"
              />
            </View>
          </Card>

          {/* Manual Entry */}
          <Card variant="elevated" className="bg-white shadow-lg">
            <View className="items-center py-6 px-4">
              <View className="w-20 h-20 border-4 border-dashed border-gray-300 rounded-lg mb-4 items-center justify-center">
                <Pencil size={28} color="#6b7280" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Manual Entry
              </Text>
              <Text className="text-sm text-gray-600 text-center mb-4">
                Enter passport information manually if scanning isn't available
              </Text>
              <Button
                title="Enter Manually"
                onPress={handleManualEntry}
                variant="outline"
                size="medium"
                testID="enter-manually-family-button"
              />
            </View>
          </Card>
        </View>

        {/* Information */}
        <Card className="mt-6">
          <View className="p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Privacy & Security
            </Text>
            <View className="space-y-2">
              <Text className="text-sm text-gray-600">
                • All family member data is encrypted and stored locally
              </Text>
              <Text className="text-sm text-gray-600">
                • No passport information is sent to external servers
              </Text>
              <Text className="text-sm text-gray-600">
                • Each family member can have their own biometric protection
              </Text>
              <Text className="text-sm text-gray-600">
                • You can remove family members at any time
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}