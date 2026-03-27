import { View, Text, TouchableOpacity } from 'react-native';
import { AccountSetupChecklist, ReadinessChecklist, TravelerProgressList } from '@/components/trips';
import { StatusBadge } from '@/components/ui';
import { useAccountSetup } from '@/hooks/useAccountSetup';
import type { UseTripChecklistResult } from '@/hooks/useTripChecklist';
import type { FamilyMember } from '@/types/profile';
import type { TripLeg } from '@/types/trip';
import type { TripReadiness } from '@/services/readiness/readinessTypes';
import type { TravelerProgress } from '@/services/readiness/travelerProgress';

interface ChecklistsProps {
  legs: TripLeg[];
  currentProfileId: string | null;
  familyMembers: FamilyMember[];
  isReadinessLoading: boolean;
  tripReadiness: TripReadiness | null;
  tripChecklist: UseTripChecklistResult['checklist'];
  travelerProgressData: TravelerProgress[];
  onReadinessNavigate: (target: string) => void;
  onChecklistPress: () => void;
}

export function Checklists({
  legs,
  currentProfileId,
  familyMembers,
  isReadinessLoading,
  tripReadiness,
  tripChecklist,
  travelerProgressData,
  onReadinessNavigate,
  onChecklistPress,
}: ChecklistsProps) {
  const accountSetup = useAccountSetup(currentProfileId ?? '');

  return (
    <>
      {/* Per-traveler Progress */}
      {travelerProgressData.length > 0 && (
        <View className="px-4 pt-4">
          <TravelerProgressList
            travelers={travelerProgressData}
            testID="trip-detail-traveler-progress"
          />
        </View>
      )}

      {/* Trip Readiness Checklist */}
      {legs.length > 0 && (
        <View className="px-4 pt-4">
          {isReadinessLoading ? (
            <View
              testID="readiness-checklist-loading"
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
              accessible={true}
              accessibilityLabel="Loading trip readiness"
              accessibilityRole="progressbar"
            >
              <View className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3" />
            </View>
          ) : tripReadiness ? (
            <ReadinessChecklist
              tripReadiness={tripReadiness}
              onNavigate={onReadinessNavigate}
              testID="readiness-checklist"
            />
          ) : null}
        </View>
      )}

      {/* Pre-trip Account Setup */}
      {legs.length > 0 && currentProfileId && (
        <View className="pt-4">
          <AccountSetupChecklist
            legs={legs}
            accountSetup={accountSetup}
            familyProfileIds={familyMembers
              .filter(m => m.id !== currentProfileId)
              .map(m => m.id)}
            testID="trip-detail-account-checklist"
          />
        </View>
      )}

      {/* Pre-Departure Checklist Card */}
      {tripChecklist && tripChecklist.items.length > 0 && (
        <View className="px-4 pt-4">
          <TouchableOpacity
            testID="checklist-card"
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
            activeOpacity={0.7}
            onPress={onChecklistPress}
            accessibilityRole="button"
            accessibilityLabel={`Pre-Departure Checklist, ${tripChecklist.completedCount} of ${tripChecklist.totalCount} items complete${tripChecklist.overallStatus === 'action-needed' || tripChecklist.overallStatus === 'warning' ? ', attention needed' : ''}`}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">Pre-Departure Checklist</Text>
              {(tripChecklist.overallStatus === 'action-needed' || tripChecklist.overallStatus === 'warning') && (
                <StatusBadge
                  status={tripChecklist.overallStatus === 'action-needed' ? 'error' : 'warning'}
                  text={tripChecklist.overallStatus === 'action-needed' ? 'Action Needed' : 'Warning'}
                  size="small"
                />
              )}
            </View>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {tripChecklist.completedCount} of {tripChecklist.totalCount} items complete
            </Text>
            <View className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <View
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${tripChecklist.totalCount > 0 ? Math.round((tripChecklist.completedCount / tripChecklist.totalCount) * 100) : 0}%` }}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
