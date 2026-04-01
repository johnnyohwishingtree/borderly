import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Modal, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button, ScreenContainer, ProgressBar } from '@/components/ui';
import { DynamicForm } from '@/components/forms';
import { BoardingPassScanner } from '@/components/boarding';
import { importBoardingPassFromImage } from '@/services/boarding/boardingPassImageImport';
import { useSmartForm } from '@/hooks/useSmartForm';
import { getCountryName } from '@/constants/countries';
import { getAirportLabel } from '@/constants/airports';
import type { FormsStackParamList } from '@/app/navigation/types';
import type { ParsedBoardingPass } from '@/types/boarding';
import { SMART_FORM_IDS } from './testIDs';

type Nav = NativeStackNavigationProp<FormsStackParamList, 'SmartForm'>;
type Route = RouteProp<FormsStackParamList, 'SmartForm'>;

export default function SmartFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { countryCodes, travelerIds, boardingPassData } = route.params;
  const [showScanner, setShowScanner] = useState(false);

  const {
    countrySections,
    handleFieldChange,
    overallProgress,
    isAllComplete,
    tripId,
  } = useSmartForm({ countryCodes, travelerIds, boardingPassData });

  const handleDone = useCallback(() => {
    navigation.navigate('PortalLinks', { tripId, countryCodes });
  }, [navigation, tripId, countryCodes]);

  const handleScanResult = useCallback((result: ParsedBoardingPass) => {
    setShowScanner(false);
    const updates: Record<string, unknown> = {};
    if (result.flightNumber) updates.flightNumber = result.flightNumber;
    if (result.airlineCode) updates.airlineCode = result.airlineCode;
    if (result.arrivalAirport) updates.arrivalAirport = result.arrivalAirport;
    if (result.departureAirport) {
      const label = getAirportLabel(result.departureAirport);
      const cityMatch = label.match(/^(.+?)\s*\(/);
      updates.departureCity = cityMatch ? cityMatch[1].trim() : result.departureAirport;
    }
    handleFieldChange(updates);
  }, [handleFieldChange]);

  const handleImportFromPhoto = useCallback(async () => {
    try {
      const result = await importBoardingPassFromImage();
      if (result.success && result.boardingPass) {
        handleScanResult(result.boardingPass);
      } else {
        Alert.alert('Import Failed', result.error || 'Could not read barcode from photo.');
      }
    } catch {
      Alert.alert('Import Failed', 'Something went wrong. Please try again.');
    }
  }, [handleScanResult]);

  const handleScanBoardingPass = useCallback(() => {
    Alert.alert(
      'Scan Boarding Pass',
      'How would you like to scan?',
      [
        { text: 'Camera Scan', onPress: () => setShowScanner(true) },
        { text: 'Import from Photo', onPress: handleImportFromPhoto },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [handleImportFromPhoto]);

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
                  onScanBoardingPass={handleScanBoardingPass}
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

      {/* Boarding pass scanner modal — owned by screen (has navigation context) */}
      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowScanner(false)}
      >
        <BoardingPassScanner
          onScanSuccess={handleScanResult}
          onScanCancel={() => setShowScanner(false)}
          onManualEntry={() => setShowScanner(false)}
        />
      </Modal>
    </ScreenContainer>
  );
}
