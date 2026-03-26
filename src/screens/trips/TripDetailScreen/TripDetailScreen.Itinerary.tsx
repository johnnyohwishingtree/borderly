import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Map } from 'lucide-react-native';
import { LegCard } from '@/components/trips';
import { Button } from '@/components/ui';
import type { FamilyMember } from '@/types/profile';
import type { TripLeg } from '@/types/trip';
import type { LegDeadline } from '@/services/deadline/deadlineService';

interface ItineraryProps {
  legs: TripLeg[];
  familyMembers: FamilyMember[];
  deadlineMap: Record<string, LegDeadline>;
  addTriggerRef: React.RefObject<View | null>;
  onAddDestination: () => void;
  onLegPress: (leg: TripLeg) => void;
  onMarkAsSubmitted: (legId: string) => void;
}

export function Itinerary({
  legs,
  familyMembers,
  deadlineMap,
  addTriggerRef,
  onAddDestination,
  onLegPress,
  onMarkAsSubmitted,
}: ItineraryProps) {
  return (
    <View className="px-4 py-6">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">Itinerary</Text>
        <TouchableOpacity
          ref={addTriggerRef as React.RefObject<View>}
          onPress={onAddDestination}
          className="bg-blue-50 dark:bg-blue-950 px-3 py-2 rounded-lg"
          activeOpacity={0.7}
          testID="add-destination-button"
          accessibilityLabel="Add destination"
          accessibilityRole="button"
        >
          <Text className="text-blue-600 dark:text-blue-400 font-medium text-sm">+ Add Destination</Text>
        </TouchableOpacity>
      </View>

      {legs.length === 0 ? (
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 items-center">
          <Map size={40} color="#6b7280" style={{ marginBottom: 12 }} />
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No destinations yet</Text>
          <Text className="text-base text-gray-600 dark:text-gray-400 text-center mb-4">
            Add your first destination to start planning your forms
          </Text>
          <Button
            title="Add Destination"
            onPress={onAddDestination}
            variant="primary"
            testID="add-destination-empty-button"
          />
        </View>
      ) : (
        <View>
          {legs
            .sort((a, b) => a.order - b.order)
            .map((leg, index) => (
              <View key={leg.id} className="relative">
                <LegCard
                  leg={leg}
                  onPress={() => onLegPress(leg)}
                  showFormStatus
                  familyMembers={familyMembers}
                  showTravelerDetails
                  deadline={deadlineMap[leg.id]}
                  onMarkAsSubmitted={() => onMarkAsSubmitted(leg.id)}
                />
                {index < legs.length - 1 && (
                  <View className="absolute left-8 top-20 w-0.5 h-4 bg-gray-300 dark:bg-gray-600 z-10" />
                )}
              </View>
            ))}
        </View>
      )}
    </View>
  );
}
