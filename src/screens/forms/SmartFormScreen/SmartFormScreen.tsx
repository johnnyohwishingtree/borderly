import { useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button, ScreenContainer, ProgressBar } from '@/components/ui';
import { DynamicForm } from '@/components/forms';
import { useSmartForm } from '@/hooks/useSmartForm';
import { getCountryName } from '@/constants/countries';
import type { FormsStackParamList } from '@/app/navigation/types';
import { SMART_FORM_IDS } from './testIDs';

type Nav = NativeStackNavigationProp<FormsStackParamList, 'SmartForm'>;
type Route = RouteProp<FormsStackParamList, 'SmartForm'>;

export default function SmartFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { countryCodes, travelerIds } = route.params;

  const {
    countrySections,
    handleFieldChange,
    overallProgress,
    isAllComplete,
    tripId,
  } = useSmartForm({ countryCodes, travelerIds });

  const handleDone = useCallback(() => {
    navigation.navigate('PortalLinks', { tripId, countryCodes });
  }, [navigation, tripId, countryCodes]);

  return (
    <ScreenContainer className="bg-surface-secondary">
      <View className="bg-surface px-4 py-4 border-b border-border-default">
        <Text
          className="text-xl font-bold text-primary mb-2"
          accessibilityRole="header"
        >
          Fill your forms
        </Text>
        <ProgressBar progress={Math.round(overallProgress * 100)} />
        <Text className="text-sm text-tertiary mt-1">
          {Math.round(overallProgress * 100)}% complete
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View className="p-4" testID={SMART_FORM_IDS.dynamicForm.id}>
          {countrySections.map(section => (
            <View
              key={section.countryCode}
              className="mb-6"
              testID={`${SMART_FORM_IDS.countrySection.id}-${section.countryCode}`}
            >
              <View className="flex-row items-center mb-3">
                <Text className="text-lg font-bold text-primary">
                  {getCountryName(section.countryCode)}
                </Text>
                <Text className="text-sm text-tertiary ml-2">
                  — {section.remainingFields} {section.remainingFields === 1 ? 'field' : 'fields'} needed
                </Text>
              </View>
              {section.form ? (
                <DynamicForm
                  form={section.form}
                  onFormDataChange={handleFieldChange}
                  showOnlyCountrySpecific={false}
                />
              ) : (
                <Text className="text-success font-medium">
                  All fields complete
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed footer CTA */}
      <View className="bg-surface border-t border-border-default px-4 py-3 pb-8">
        <Button
          title={isAllComplete ? 'Done' : `Continue — ${Math.round(overallProgress * 100)}% complete`}
          onPress={handleDone}
          variant="primary"
          size="large"
          fullWidth
          testID={SMART_FORM_IDS.doneButton.id}
        />
      </View>
    </ScreenContainer>
  );
}
