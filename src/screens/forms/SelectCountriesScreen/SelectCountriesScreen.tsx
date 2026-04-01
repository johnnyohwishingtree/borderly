import { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { ScanLine, X, Check, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, ScreenContainer } from '@/components/ui';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';
import type { SupportedCountry } from '@/constants/countries';
import type { FormsStackParamList } from '@/app/navigation/types';
import { SELECT_COUNTRIES_IDS } from './testIDs';

type Nav = NativeStackNavigationProp<FormsStackParamList, 'SelectCountries'>;

export default function SelectCountriesScreen() {
  const navigation = useNavigation<Nav>();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');

  const toggleCountry = useCallback((code: string) => {
    setSelectedCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code],
    );
  }, []);

  const filteredCountries = useMemo(() => {
    if (!searchText.trim()) return SUPPORTED_COUNTRIES;
    const q = searchText.toLowerCase();
    return SUPPORTED_COUNTRIES.filter(
      c => c.name.toLowerCase().includes(q) || c.fullName.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [searchText]);

  const handleNext = useCallback(() => {
    navigation.navigate('SelectTravelers', { countryCodes: selectedCountries });
  }, [navigation, selectedCountries]);

  const renderCountryRow = (item: SupportedCountry) => {
    const isSelected = selectedCountries.includes(item.code);
    return (
      <TouchableOpacity
        key={item.code}
        onPress={() => toggleCountry(item.code)}
        className={`flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 ${
          isSelected ? 'bg-blue-50 dark:bg-blue-950' : 'bg-white dark:bg-gray-900'
        }`}
        activeOpacity={0.6}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}${isSelected ? ', selected' : ''}`}
        testID={`${SELECT_COUNTRIES_IDS.countryRow.id}-${item.code}`}
      >
        <View
          className="w-8 h-5 rounded-sm mr-3 overflow-hidden flex-row"
          accessibilityElementsHidden
        >
          {item.colors.slice(0, 3).map((color, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: color }} />
          ))}
        </View>
        <Text className="text-base text-gray-900 dark:text-white flex-1">
          {item.name}
        </Text>
        {isSelected && <Check size={20} color="#3b82f6" />}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer className="bg-white dark:bg-gray-900">
      {/* Pinned header: title + search + chips */}
      <View className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <View className="px-4 pt-4 pb-2">
          {/* Search bar */}
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 mt-2">
            <Search size={18} color="#9ca3af" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search countries"
              placeholderTextColor="#9ca3af"
              className="flex-1 ml-2 text-base text-gray-900 dark:text-white"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="while-editing"
              testID={SELECT_COUNTRIES_IDS.searchField.id}
              accessibilityLabel="Search countries"
            />
          </View>
        </View>

        {/* Selected chips — horizontal scroll */}
        {selectedCountries.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 pb-2"
            testID={SELECT_COUNTRIES_IDS.chipRow.id}
          >
            {selectedCountries.map(code => {
              const country = SUPPORTED_COUNTRIES.find(c => c.code === code);
              if (!country) return null;
              return (
                <TouchableOpacity
                  key={code}
                  onPress={() => toggleCountry(code)}
                  className="flex-row items-center bg-blue-500 rounded-full px-3 py-1 mr-2"
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${country.name}`}
                  testID={`${SELECT_COUNTRIES_IDS.countryChip.id}-${code}`}
                >
                  <Text className="text-white text-sm font-medium mr-1">
                    {country.name}
                  </Text>
                  <X size={12} color="#ffffff" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Boarding pass scan — subtle secondary action */}
        <TouchableOpacity
          onPress={() => {/* TODO: boarding pass scanner */}}
          className="flex-row items-center justify-center px-4 py-2 border-t border-gray-100 dark:border-gray-800"
          activeOpacity={0.7}
          testID={SELECT_COUNTRIES_IDS.scanBoardingPassButton.id}
          accessibilityRole="button"
          accessibilityLabel="Scan boarding pass to auto-detect country"
        >
          <ScanLine size={16} color="#6366f1" />
          <Text className="text-indigo-600 dark:text-indigo-400 text-sm font-medium ml-2">
            Scan boarding pass
          </Text>
        </TouchableOpacity>
      </View>

      {/* Country list */}
      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {filteredCountries.length > 0 ? (
          filteredCountries.map(renderCountryRow)
        ) : (
          <View className="items-center py-12">
            <Text className="text-gray-400 dark:text-gray-500 text-base">
              No countries match "{searchText}"
            </Text>
          </View>
        )}
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
