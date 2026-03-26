import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Plane, Trash2, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { ScreenContainer, Button } from '@/components/ui';
import LoadingStates from '@/components/ui/LoadingStates';
import { useReviewImport } from '@/hooks/useReviewImport';
import { getCountryName } from '@/constants/countries';
import type { TripLeg } from '@/types/trip';

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { icon: <CheckCircle size={14} color="#16a34a" />, label: 'High confidence', className: 'bg-green-50 dark:bg-green-900/20' },
    medium: { icon: <AlertTriangle size={14} color="#ca8a04" />, label: 'Medium confidence', className: 'bg-yellow-50 dark:bg-yellow-900/20' },
    low: { icon: <AlertCircle size={14} color="#dc2626" />, label: 'Low confidence', className: 'bg-red-50 dark:bg-red-900/20' },
  };

  const { icon, label, className } = config[level];

  return (
    <View className={`flex-row items-center px-3 py-1.5 rounded-full ${className}`} testID="confidence-badge">
      {icon}
      <Text className="ml-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}
      </Text>
    </View>
  );
}

function LegCard({
  leg,
  index,
  onUpdate,
  onRemove,
}: {
  leg: TripLeg;
  index: number;
  onUpdate: (index: number, updates: Partial<TripLeg>) => void;
  onRemove: (index: number) => void;
}) {
  const countryName = getCountryName(leg.destinationCountry) || leg.destinationCountry;
  const hasMissingCountry = !leg.destinationCountry;

  return (
    <View
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700"
      testID={`review-leg-${index}`}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Plane size={16} color="#2563eb" />
          <Text className="ml-2 text-base font-semibold text-gray-900 dark:text-white">
            Leg {index + 1}
          </Text>
          {leg.flightNumber && (
            <Text className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              {leg.flightNumber}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => onRemove(index)}
          className="min-h-[44px] min-w-[44px] items-center justify-center"
          testID={`remove-leg-${index}`}
          accessibilityRole="button"
          accessibilityLabel={`Remove leg ${index + 1}`}
        >
          <Trash2 size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Destination */}
      <View className="mb-3">
        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Destination
        </Text>
        <Text className={`text-sm ${hasMissingCountry ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
          {hasMissingCountry ? 'Missing destination' : countryName}
        </Text>
      </View>

      {/* Arrival Date */}
      <View className="mb-3">
        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Arrival date
        </Text>
        <TextInput
          value={leg.arrivalDate}
          onChangeText={text => onUpdate(index, { arrivalDate: text })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9CA3AF"
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
          testID={`leg-arrival-date-${index}`}
          accessibilityLabel={`Arrival date for leg ${index + 1}`}
        />
      </View>

      {/* Airport */}
      {leg.arrivalAirport && (
        <View className="mb-1">
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Airport
          </Text>
          <Text className="text-sm text-gray-900 dark:text-gray-100">
            {leg.arrivalAirport}
          </Text>
        </View>
      )}

      {/* Accommodation */}
      {leg.accommodation.name !== '' && (
        <View className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Accommodation
          </Text>
          <Text className="text-sm text-gray-900 dark:text-gray-100">
            {leg.accommodation.name}
          </Text>
          {leg.accommodation.address.city && (
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {leg.accommodation.address.city}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function ReviewImportScreen() {
  const {
    draftTrip,
    confidenceLevel,
    isSaving,
    saveError,
    updateTripName,
    updateLeg,
    removeLeg,
    handleConfirm,
    handleCancel,
    hasMissingFields,
  } = useReviewImport();

  if (isSaving) {
    return (
      <LoadingStates
        state="loading"
        variant="spinner"
        size="medium"
        text="Creating your trip..."
        fullScreen={true}
      />
    );
  }

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      <ScrollView className="flex-1" keyboardDismissMode="on-drag">
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              Review import
            </Text>
            <ConfidenceBadge level={confidenceLevel} />
          </View>

          {/* Trip Name */}
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Trip name
          </Text>
          <TextInput
            value={draftTrip.name}
            onChangeText={updateTripName}
            placeholder="Enter trip name"
            placeholderTextColor="#9CA3AF"
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            testID="review-trip-name"
            accessibilityLabel="Trip name"
          />
        </View>

        {/* Legs */}
        <View className="p-4">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {draftTrip.legs.length} destination{draftTrip.legs.length !== 1 ? 's' : ''}
          </Text>

          {draftTrip.legs.map((leg, index) => (
            <LegCard
              key={leg.id}
              leg={leg}
              index={index}
              onUpdate={updateLeg}
              onRemove={removeLeg}
            />
          ))}

          {draftTrip.legs.length === 0 && (
            <View className="py-8 items-center">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                No destinations. Go back and try a different confirmation.
              </Text>
            </View>
          )}
        </View>

        {/* Missing fields warning */}
        {hasMissingFields && (
          <View
            className="mx-4 mb-4 flex-row items-start bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg"
            accessibilityLiveRegion="polite"
            testID="missing-fields-warning"
          >
            <AlertTriangle size={16} color="#ca8a04" />
            <Text className="ml-2 text-xs text-yellow-800 dark:text-yellow-300 flex-1">
              Some required fields are missing. You can still create the trip and
              fill them in later.
            </Text>
          </View>
        )}

        {/* Save error */}
        {saveError !== '' && (
          <View
            className="mx-4 mb-4 flex-row items-start bg-red-50 dark:bg-red-900/20 p-3 rounded-lg"
            accessibilityLiveRegion="polite"
            testID="save-error-message"
          >
            <AlertCircle size={16} color="#dc2626" />
            <Text className="ml-2 text-xs text-red-800 dark:text-red-300 flex-1">
              {saveError}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View className="px-4 pb-8">
          <Button
            title="Create trip"
            onPress={handleConfirm}
            variant="primary"
            fullWidth
            disabled={draftTrip.legs.length === 0}
            testID="review-create-trip-button"
          />
          <TouchableOpacity
            onPress={handleCancel}
            className="mt-3 py-3 items-center min-h-[44px]"
            testID="review-cancel-button"
            accessibilityRole="button"
            accessibilityLabel="Discard and go back"
          >
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Discard
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
