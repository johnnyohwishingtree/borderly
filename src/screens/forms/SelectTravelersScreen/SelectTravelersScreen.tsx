import { useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { AlertTriangle, Check } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button, ScreenContainer } from '@/components/ui';
import { useSelectTravelers } from '@/hooks/useSelectTravelers';
import type { FormsStackParamList } from '@/app/navigation/types';
import { SELECT_TRAVELERS_IDS } from './testIDs';

type Nav = NativeStackNavigationProp<FormsStackParamList, 'SelectTravelers'>;
type Route = RouteProp<FormsStackParamList, 'SelectTravelers'>;

export default function SelectTravelersScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { countryCodes, boardingPassData } = route.params;

  const {
    profiles,
    selectedIds,
    toggleProfile,
    passportWarnings,
    isSoloTraveler,
  } = useSelectTravelers();

  // Skip this screen for solo travelers — go straight to SmartForm
  useEffect(() => {
    if (isSoloTraveler) {
      navigation.replace('SmartForm', {
        countryCodes,
        travelerIds: selectedIds,
        boardingPassData,
      });
    }
  }, [isSoloTraveler, navigation, countryCodes, selectedIds, boardingPassData]);

  const handleNext = useCallback(() => {
    navigation.navigate('SmartForm', {
      countryCodes,
      travelerIds: selectedIds,
      boardingPassData,
    });
  }, [navigation, countryCodes, selectedIds, boardingPassData]);

  // Don't render UI if solo — the useEffect will navigate away
  if (isSoloTraveler) return null;

  return (
    <ScreenContainer className="bg-surface-secondary">
      <View className="bg-surface px-4 py-6 border-b border-border-default">
        <Text className="text-base text-secondary">
          Select travelers who need forms filled
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {profiles.map(profile => {
            const isSelected = selectedIds.includes(profile.id);
            const warning = passportWarnings.get(profile.id);
            return (
              <TouchableOpacity
                key={profile.id}
                onPress={() => toggleProfile(profile.id)}
                className={`p-4 mb-3 rounded-xl border-2 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-border-default bg-surface'
                }`}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${profile.givenNames} ${profile.surname}${isSelected ? ', selected' : ''}`}
                testID={`${SELECT_TRAVELERS_IDS.travelerCard.id}-${profile.id}`}
              >
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-primary">
                      {profile.givenNames} {profile.surname}
                    </Text>
                    <Text className="text-sm text-tertiary">
                      {profile.nationality || 'Nationality not set'}
                    </Text>
                    {profile.passportExpiry && (
                      <Text className="text-sm text-tertiary">
                        Passport expires: {profile.passportExpiry}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center">
                      <Check size={14} color="#ffffff" />
                    </View>
                  )}
                </View>
                {warning && (
                  <View
                    className="flex-row items-center mt-2 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-lg"
                    testID={`${SELECT_TRAVELERS_IDS.passportWarningBadge.id}-${profile.id}`}
                  >
                    <AlertTriangle size={16} color="#d97706" />
                    <Text className="text-warning text-sm ml-2 flex-1">
                      {warning}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

        </View>
      </ScrollView>

      {/* Fixed footer CTA */}
      <View className="bg-surface border-t border-border-default px-4 py-3 pb-8">
        <Button
          title={`Next — ${selectedIds.length} ${selectedIds.length === 1 ? 'traveler' : 'travelers'}`}
          onPress={handleNext}
          variant="primary"
          size="large"
          fullWidth
          disabled={selectedIds.length === 0}
          testID={SELECT_TRAVELERS_IDS.nextButton.id}
        />
      </View>
    </ScreenContainer>
  );
}
