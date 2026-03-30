import { View, Text } from 'react-native';
import { MapPin, Globe } from 'lucide-react-native';
import { Button, Card } from '@/components/ui';
import { CreateTripLegCard } from './CreateTripScreen.LegCard';
import { CREATE_TRIP_IDS } from './testIDs';
import type { LegFormData } from '@/hooks/useTripCreation';
import type { FamilyMember } from '@/types/profile';

interface DestinationsProps {
  legs: LegFormData[];
  errors: Record<string, string>;
  familyMembers: FamilyMember[];
  applyToAllLegs: boolean;
  addLeg: () => void;
  removeLeg: (index: number) => void;
  updateLeg: (index: number, field: string, value: unknown) => void;
  handleTravelerToggle: (legIndex: number, travelerId: string) => void;
  onShowScanner: () => void;
  onShowSmartImport: () => void;
}

export function Destinations({
  legs,
  errors,
  familyMembers,
  applyToAllLegs,
  addLeg,
  removeLeg,
  updateLeg,
  handleTravelerToggle,
  onShowScanner,
  onShowSmartImport,
}: DestinationsProps) {
  return (
    <View className="mb-6">
      <View className="flex-row flex-wrap items-center justify-between mb-4 gap-2">
        <View className="flex-row items-center">
          <MapPin size={32} color="#374151" style={{ marginRight: 12 }} />
          <Text className="text-xl font-bold text-gray-900 dark:text-white">Destinations</Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Button
            title="Import"
            onPress={onShowSmartImport}
            variant="secondary"
            size="small"
            testID={CREATE_TRIP_IDS.smartImportButton.id}
          />
          <Button
            title="Scan"
            onPress={onShowScanner}
            variant="secondary"
            size="small"
            testID={CREATE_TRIP_IDS.scanDestinationButton.id}
          />
          <Button
            title="+ Add"
            onPress={addLeg}
            variant="primary"
            size="small"
            testID={CREATE_TRIP_IDS.addDestinationButton.id}
          />
        </View>
      </View>

      {errors.legs && (
        <Text className="text-red-500 text-sm mb-3">{errors.legs}</Text>
      )}

      {legs.length === 0 ? (
        <Card variant="outlined">
          <View className="p-6 items-center">
            <Globe size={64} color="#9ca3af" style={{ marginBottom: 16 }} />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No destinations added yet</Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
              Add your travel destinations to plan your customs declarations
            </Text>
            <View className="flex-row flex-wrap gap-3 justify-center">
              <Button
                title="Scan Boarding Pass"
                onPress={onShowScanner}
                variant="secondary"
                testID={CREATE_TRIP_IDS.emptyStateScanButton.id}
              />
              <Button
                title="Add Manually"
                onPress={addLeg}
                variant="secondary"
                testID={CREATE_TRIP_IDS.emptyStateAddButton.id}
              />
            </View>
          </View>
        </Card>
      ) : (
        legs.map((leg, index) => (
          <CreateTripLegCard
            key={index}
            leg={leg}
            index={index}
            errors={errors}
            familyMembers={familyMembers}
            applyToAllLegs={applyToAllLegs}
            removeLeg={removeLeg}
            updateLeg={updateLeg}
            handleTravelerToggle={handleTravelerToggle}
          />
        ))
      )}
    </View>
  );
}
