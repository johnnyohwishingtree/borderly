import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ScanLine, X, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, ScreenContainer } from '@/components/ui';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';
import type { FormsStackParamList } from '@/app/navigation/types';
import { SELECT_COUNTRIES_IDS } from './testIDs';

type Nav = NativeStackNavigationProp<FormsStackParamList, 'SelectCountries'>;

export default function SelectCountriesScreen() {
  const navigation = useNavigation<Nav>();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const toggleCountry = useCallback((code: string) => {
    setSelectedCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code],
    );
  }, []);

  const handleNext = useCallback(() => {
    navigation.navigate('SelectTravelers', { countryCodes: selectedCountries });
  }, [navigation, selectedCountries]);

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-100 dark:border-gray-700">
        <Text
          className="text-2xl font-bold text-gray-900 dark:text-white"
          testID={SELECT_COUNTRIES_IDS.screenTitle.id}
          accessibilityRole="header"
        >
          Where are you going?
        </Text>
        <Text className="text-base text-gray-600 dark:text-gray-400 mt-1">
          Select all countries you need forms for
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <View className="p-4" testID={SELECT_COUNTRIES_IDS.countryList.id}>
          {/* Selected chips */}
          {selectedCountries.length > 0 && (
            <View className="flex-row flex-wrap mb-4">
              {selectedCountries.map(code => {
                const country = SUPPORTED_COUNTRIES.find(c => c.code === code);
                if (!country) return null;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => toggleCountry(code)}
                    className="flex-row items-center bg-blue-100 dark:bg-blue-900 rounded-full px-3 py-2 mr-2 mb-2"
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${country.name}`}
                    testID={`${SELECT_COUNTRIES_IDS.countryChip.id}-${code}`}
                  >
                    <Text className="text-blue-800 dark:text-blue-200 font-medium mr-1">
                      {country.name}
                    </Text>
                    <X size={14} color="#1e40af" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Boarding pass scan shortcut */}
          <TouchableOpacity
            onPress={() => {/* TODO: boarding pass scanner */}}
            className="flex-row items-center bg-indigo-50 dark:bg-indigo-950 px-4 py-3 rounded-lg mb-4"
            activeOpacity={0.7}
            testID={SELECT_COUNTRIES_IDS.scanBoardingPassButton.id}
            accessibilityRole="button"
            accessibilityLabel="Scan boarding pass to auto-detect country"
          >
            <ScanLine size={20} color="#6366f1" />
            <Text className="text-indigo-700 dark:text-indigo-300 font-medium ml-2">
              Scan boarding pass
            </Text>
          </TouchableOpacity>

          {/* Country grid */}
          {SUPPORTED_COUNTRIES.map(country => {
            const isSelected = selectedCountries.includes(country.code);
            return (
              <TouchableOpacity
                key={country.code}
                onPress={() => toggleCountry(country.code)}
                className={`flex-row items-center p-4 mb-2 rounded-xl border-2 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${country.name}${isSelected ? ', selected' : ''}`}
              >
                <View
                  className="w-8 h-6 rounded mr-3 overflow-hidden flex-row"
                  accessibilityElementsHidden
                >
                  {country.colors.slice(0, 3).map((color, i) => (
                    <View key={i} style={{ flex: 1, backgroundColor: color }} />
                  ))}
                </View>
                <Text className={`text-lg font-medium flex-1 ${
                  isSelected
                    ? 'text-blue-900 dark:text-blue-100'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {country.name}
                </Text>
                {isSelected && (
                  <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center">
                    <Check size={14} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Fixed footer CTA */}
      <View className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 pb-8">
        <Button
          title={selectedCountries.length === 0
            ? 'Select countries to continue'
            : `Next — ${selectedCountries.length} ${selectedCountries.length === 1 ? 'country' : 'countries'}`
          }
          onPress={handleNext}
          variant="primary"
          size="large"
          fullWidth
          disabled={selectedCountries.length === 0}
          testID={SELECT_COUNTRIES_IDS.nextButton.id}
        />
      </View>
    </ScreenContainer>
  );
}
