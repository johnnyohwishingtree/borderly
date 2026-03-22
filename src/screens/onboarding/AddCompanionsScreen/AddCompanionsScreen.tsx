import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Users, UserPlus, ChevronRight, CheckCircle, X } from 'lucide-react-native';

import { OnboardingStackParamList } from '@/app/navigation/types';
import { Button, Card, ProgressBar } from '@/components/ui';
import { useProfileStore } from '@/stores/useProfileStore';
import { FamilyMember, FamilyRelationship } from '@/types/profile';

type AddCompanionsScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'AddCompanions'>;

const RELATIONSHIP_LABELS: Record<string, string> = {
  self: 'Primary',
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  sibling: 'Sibling',
  other: 'Other',
};

const RELATIONSHIP_COLORS: Record<string, { bg: string; text: string }> = {
  self: { bg: 'bg-blue-100', text: 'text-blue-700' },
  spouse: { bg: 'bg-pink-100', text: 'text-pink-700' },
  child: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  parent: { bg: 'bg-green-100', text: 'text-green-700' },
  sibling: { bg: 'bg-purple-100', text: 'text-purple-700' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

const RELATIONSHIP_OPTIONS: { value: FamilyRelationship; label: string; emoji: string }[] = [
  { value: 'spouse', label: 'Spouse', emoji: '💑' },
  { value: 'child', label: 'Child', emoji: '👶' },
  { value: 'parent', label: 'Parent', emoji: '👨‍👩‍👦' },
  { value: 'sibling', label: 'Sibling', emoji: '👫' },
  { value: 'other', label: 'Other', emoji: '👤' },
];

export default function AddCompanionsScreen() {
  const navigation = useNavigation<AddCompanionsScreenNavigationProp>();
  const { getAllFamilyProfiles, familyProfiles } = useProfileStore();
  const [companions, setCompanions] = useState<FamilyMember[]>([]);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(false);

  useEffect(() => {
    loadCompanions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyProfiles]);

  const loadCompanions = async () => {
    const allProfiles = await getAllFamilyProfiles();
    // Show only non-primary profiles (travel companions)
    const nonPrimary = allProfiles.filter(p => p.relationship !== 'self');
    setCompanions(nonPrimary);
  };

  const handleAddCompanion = () => {
    setShowRelationshipPicker(true);
  };

  const handleRelationshipSelect = (relationship: FamilyRelationship) => {
    setShowRelationshipPicker(false);
    navigation.navigate('PassportScan', {
      familyMode: true,
      relationship,
      returnTo: 'AddCompanions',
    });
  };

  const handleContinue = () => {
    navigation.navigate('BiometricSetup');
  };

  const hasCompanions = companions.length > 0;
  const continueLabel = hasCompanions
    ? `Continue with ${companions.length + 1} traveler${companions.length + 1 > 1 ? 's' : ''}`
    : 'Continue — just me';

  return (
    <>
      <ScrollView className="flex-1 bg-gradient-to-b from-indigo-50 to-white">
        <View className="px-6 py-8">
          {/* Progress indicator */}
          <ProgressBar progress={88} className="mb-6" />

          {/* Header */}
          <View className="mb-8 items-center">
            <View className="w-20 h-20 bg-indigo-100 rounded-full items-center justify-center mb-4">
              <Users size={40} color="#4f46e5" />
            </View>
            <Text
              className="text-2xl font-bold text-gray-900 mb-2 text-center"
              testID="add-companions-title"
            >
              Traveling with family?
            </Text>
            <Text className="text-base text-gray-600 text-center">
              Scan their passports now so forms auto-fill for everyone
            </Text>
          </View>

          {/* Companion list */}
          {hasCompanions && (
            <Card variant="elevated" className="mb-6 bg-white shadow-xl border-0">
              <View className="bg-gradient-to-r from-indigo-500 to-indigo-600 -m-6 mb-6 p-6 rounded-t-xl">
                <Text className="text-lg font-bold text-white mb-1">
                  Travel Companions Added
                </Text>
                <Text className="text-indigo-100 text-sm">
                  {companions.length} companion{companions.length !== 1 ? 's' : ''} ready for auto-fill
                </Text>
              </View>

              <View className="space-y-3">
                {companions.map((companion) => {
                  const rel = companion.relationship || 'other';
                  const colors = RELATIONSHIP_COLORS[rel] || RELATIONSHIP_COLORS.other;
                  const label = RELATIONSHIP_LABELS[rel] || 'Other';

                  return (
                    <View
                      key={companion.id}
                      className="flex-row items-center py-3 border-b border-gray-100 last:border-b-0"
                      testID={`companion-item-${companion.id}`}
                    >
                      <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-3">
                        <CheckCircle size={20} color="#4f46e5" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-900 font-semibold">
                          {companion.givenNames} {companion.surname}
                        </Text>
                        <Text className="text-gray-500 text-sm">
                          {companion.nationality} · Passport {companion.passportNumber}
                        </Text>
                      </View>
                      <View className={`px-3 py-1 rounded-full ${colors.bg}`}>
                        <Text className={`text-xs font-medium ${colors.text}`}>{label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          )}

          {/* Add companion button */}
          <TouchableOpacity
            onPress={handleAddCompanion}
            className="flex-row items-center p-4 border-2 border-dashed border-indigo-300 rounded-xl mb-6 bg-indigo-50/50"
            testID="add-companion-button"
          >
            <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-3">
              <UserPlus size={20} color="#4f46e5" />
            </View>
            <View className="flex-1">
              <Text className="text-indigo-700 font-semibold">
                {hasCompanions ? 'Add another companion' : 'Add a travel companion'}
              </Text>
              <Text className="text-indigo-500 text-sm">
                Scan passport or enter manually
              </Text>
            </View>
            <ChevronRight size={20} color="#4f46e5" />
          </TouchableOpacity>

          {/* Info card */}
          <Card variant="outlined" className="mb-8 border-2 border-indigo-200 bg-indigo-50/50">
            <View className="flex-row items-start">
              <Users size={24} color="#4f46e5" style={{ marginRight: 12, marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  Smart auto-fill for everyone
                </Text>
                <Text className="text-sm text-gray-600">
                  Each companion's passport data is stored securely on your device. Declaration
                  forms will be auto-filled for all travelers at once.
                </Text>
              </View>
            </View>
          </Card>

          {/* Continue button */}
          <Button
            title={continueLabel}
            onPress={handleContinue}
            size="large"
            fullWidth
            testID="companions-continue-button"
          />
        </View>
      </ScrollView>

      {/* Relationship Picker Modal */}
      <Modal
        visible={showRelationshipPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRelationshipPicker(false)}
        testID="relationship-picker-modal"
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowRelationshipPicker(false)}
          testID="relationship-picker-backdrop"
        >
          <Pressable
            className="bg-white rounded-t-3xl px-6 pt-6 pb-10"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />

            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900" testID="relationship-picker-title">
                Who are you adding?
              </Text>
              <TouchableOpacity
                onPress={() => setShowRelationshipPicker(false)}
                testID="relationship-picker-close"
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Relationship options */}
            <View className="gap-3">
              {RELATIONSHIP_OPTIONS.map(({ value, label, emoji }) => {
                const colors = RELATIONSHIP_COLORS[value];
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => handleRelationshipSelect(value)}
                    className="flex-row items-center p-4 rounded-xl border border-gray-200"
                    testID={`relationship-option-${value}`}
                  >
                    <Text className="text-2xl mr-4">{emoji}</Text>
                    <Text className="text-gray-900 font-medium text-base flex-1">{label}</Text>
                    <View className={`px-3 py-1 rounded-full ${colors.bg}`}>
                      <Text className={`text-xs font-medium ${colors.text}`}>{label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
