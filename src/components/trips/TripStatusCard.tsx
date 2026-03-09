import { memo, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Users, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { Card, ProgressBar } from '../ui';
import type { Trip, TravelerFormData } from '../../types/trip';
import type { TravelerProfile } from '../../types/profile';

export interface TripStatusCardProps {
  trip: Trip;
  travelers: Map<string, TravelerProfile>;
  showDetailedProgress?: boolean;
  compact?: boolean;
}

interface FamilyProgressMetrics {
  totalTravelers: number;
  totalForms: number; // total forms across all travelers and legs
  completedForms: number;
  inProgressForms: number;
  notStartedForms: number;
  completionPercentage: number;
  travelerProgress: Array<{
    traveler: TravelerProfile;
    completed: number;
    total: number;
    percentage: number;
  }>;
}

const TripStatusCard = memo<TripStatusCardProps>(({ 
  trip, 
  travelers,
  showDetailedProgress = true,
  compact = false
}) => {
  const familyMetrics = useMemo((): FamilyProgressMetrics => {
    const travelerProgress: FamilyProgressMetrics['travelerProgress'] = [];
    let totalForms = 0;
    let completedForms = 0;
    let inProgressForms = 0;
    let notStartedForms = 0;

    // Get all assigned travelers across all legs
    const allAssignedTravelerIds = new Set<string>();
    trip.legs.forEach(leg => {
      leg.assignedTravelers?.forEach(id => allAssignedTravelerIds.add(id));
    });

    // Calculate progress for each assigned traveler
    allAssignedTravelerIds.forEach(travelerId => {
      const traveler = travelers.get(travelerId);
      if (!traveler) return;

      let travelerCompleted = 0;
      let travelerTotal = 0;

      // Check each leg where this traveler is assigned
      trip.legs.forEach(leg => {
        if (leg.assignedTravelers?.includes(travelerId)) {
          travelerTotal++;
          totalForms++;

          // Check traveler's form status for this leg
          const travelerFormData = leg.travelerFormsData?.find(
            (form: TravelerFormData) => form.travelerId === travelerId
          );

          const formStatus = travelerFormData?.formStatus || 'not_started';

          switch (formStatus) {
            case 'submitted':
            case 'ready':
              travelerCompleted++;
              completedForms++;
              break;
            case 'in_progress':
              inProgressForms++;
              break;
            case 'not_started':
            default:
              notStartedForms++;
              break;
          }
        }
      });

      if (travelerTotal > 0) {
        travelerProgress.push({
          traveler,
          completed: travelerCompleted,
          total: travelerTotal,
          percentage: (travelerCompleted / travelerTotal) * 100,
        });
      }
    });

    const completionPercentage = totalForms > 0 ? (completedForms / totalForms) * 100 : 0;

    return {
      totalTravelers: allAssignedTravelerIds.size,
      totalForms,
      completedForms,
      inProgressForms,
      notStartedForms,
      completionPercentage,
      travelerProgress: travelerProgress.sort((a, b) => b.percentage - a.percentage),
    };
  }, [trip.legs, travelers]);

  const getStatusIcon = (percentage: number) => {
    if (percentage === 100) {
      return <CheckCircle size={16} color="#10B981" />;
    } else if (percentage > 0) {
      return <Clock size={16} color="#F59E0B" />;
    } else {
      return <AlertCircle size={16} color="#EF4444" />;
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage === 100) return 'text-green-600';
    if (percentage > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (compact) {
    return (
      <Card className="mb-3">
        <View className="p-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Users size={16} color="#6B7280" />
              <Text className="text-sm font-medium text-gray-700 ml-2">
                Family Progress
              </Text>
            </View>
            <Text className={`text-sm font-bold ${getStatusColor(familyMetrics.completionPercentage)}`}>
              {Math.round(familyMetrics.completionPercentage)}%
            </Text>
          </View>
          <View className="mt-2">
            <ProgressBar 
              progress={familyMetrics.completionPercentage} 
              size="small"
              color={familyMetrics.completionPercentage === 100 ? "green" : familyMetrics.completionPercentage > 0 ? "yellow" : "red"}
            />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <Users size={20} color="#3B82F6" />
            <Text className="text-lg font-semibold text-gray-900 ml-3">
              Family Progress
            </Text>
          </View>
          <View className="items-end">
            <Text className={`text-lg font-bold ${getStatusColor(familyMetrics.completionPercentage)}`}>
              {Math.round(familyMetrics.completionPercentage)}%
            </Text>
            <Text className="text-xs text-gray-500">
              {familyMetrics.completedForms}/{familyMetrics.totalForms} forms
            </Text>
          </View>
        </View>

        {/* Overall Progress Bar */}
        <View className="mb-4">
          <ProgressBar 
            progress={familyMetrics.completionPercentage} 
            size="medium"
            color={familyMetrics.completionPercentage === 100 ? "green" : familyMetrics.completionPercentage > 0 ? "yellow" : "red"}
          />
        </View>

        {/* Summary Stats */}
        <View className="flex-row justify-between mb-4 p-3 bg-gray-50 rounded-lg">
          <View className="items-center">
            <Text className="text-sm font-bold text-gray-900">{familyMetrics.totalTravelers}</Text>
            <Text className="text-xs text-gray-600">Travelers</Text>
          </View>
          <View className="items-center">
            <Text className="text-sm font-bold text-green-600">{familyMetrics.completedForms}</Text>
            <Text className="text-xs text-gray-600">Ready</Text>
          </View>
          <View className="items-center">
            <Text className="text-sm font-bold text-yellow-600">{familyMetrics.inProgressForms}</Text>
            <Text className="text-xs text-gray-600">In Progress</Text>
          </View>
          <View className="items-center">
            <Text className="text-sm font-bold text-red-600">{familyMetrics.notStartedForms}</Text>
            <Text className="text-xs text-gray-600">Not Started</Text>
          </View>
        </View>

        {/* Individual Traveler Progress */}
        {showDetailedProgress && familyMetrics.travelerProgress.length > 0 && (
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Individual Progress
            </Text>
            <View className="space-y-3">
              {familyMetrics.travelerProgress.map((progress) => (
                <View key={progress.traveler.id} className="flex-row items-center">
                  {/* Avatar */}
                  <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <Text className="text-sm font-bold text-blue-700">
                      {progress.traveler.givenNames.charAt(0)}
                    </Text>
                  </View>

                  {/* Name & Progress */}
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-sm font-medium text-gray-900">
                        {progress.traveler.givenNames} {progress.traveler.surname}
                      </Text>
                      <View className="flex-row items-center">
                        {getStatusIcon(progress.percentage)}
                        <Text className={`text-xs font-bold ml-1 ${getStatusColor(progress.percentage)}`}>
                          {Math.round(progress.percentage)}%
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      <View className="flex-1 mr-2">
                        <ProgressBar 
                          progress={progress.percentage} 
                          size="small"
                          color={progress.percentage === 100 ? "green" : progress.percentage > 0 ? "yellow" : "red"}
                        />
                      </View>
                      <Text className="text-xs text-gray-500">
                        {progress.completed}/{progress.total}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 mt-1">
                      {progress.traveler.relationship === 'self' ? 'Primary' : progress.traveler.relationship}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* No travelers assigned */}
        {familyMetrics.totalTravelers === 0 && (
          <View className="py-4 items-center">
            <AlertCircle size={24} color="#9CA3AF" />
            <Text className="text-gray-500 text-center mt-2">
              No travelers assigned to this trip
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
});

TripStatusCard.displayName = 'TripStatusCard';

export default TripStatusCard;