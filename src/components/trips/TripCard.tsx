import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActionSheetIOS, Alert, Platform } from 'react-native';
import { Card, StatusBadge, ProgressBar } from '../ui';
import { Trip } from '../../types/trip';
import type { FamilyMember } from '../../types/profile';
import type { UrgencyLevel } from '../../services/deadline/deadlineService';
import CountryFlag from './CountryFlag';
import TravelerAvatars from './TravelerAvatars';
import { TRIP_CARD_IDS } from './testIDs';

export interface TripUrgency {
  level: UrgencyLevel;
  hoursRemaining: number;
  countryCode: string;
  label: string;
}

export interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  showProgress?: boolean;
  travelers?: FamilyMember[];
  urgency?: TripUrgency;
}

const URGENCY_STYLES: Record<string, { bg: string; text: string }> = {
  overdue: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200' },
  critical: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-200' },
  warning: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-200' },
};

const TripCard = memo<TripCardProps>(({
  trip,
  onPress,
  onDuplicate,
  onDelete,
  showProgress = true,
  travelers,
  urgency,
}) => {
  const formatDate = useMemo(() => (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, []);

  const tripMetrics = useMemo(() => {
    const progress = (() => {
      if (trip.legs.length === 0) return { completed: 0, total: 0, percentage: 0 };

      const completed = trip.legs.filter(leg =>
        leg.formStatus === 'submitted' || leg.formStatus === 'ready'
      ).length;

      const total = trip.legs.length;
      const percentage = total > 0 ? (completed / total) * 100 : 0;

      return { completed, total, percentage };
    })();

    const submittedCount = trip.legs.filter(
      leg => leg.submissionStatus === 'submitted'
    ).length;
    const submissionIndicator = {
      submitted: submittedCount,
      total: trip.legs.length,
      allSubmitted: trip.legs.length > 0 && submittedCount === trip.legs.length,
    };

    const getStatusColor = (status: Trip['status']): 'error' | 'success' | 'warning' | 'info' | 'neutral' => {
      switch (status) {
        case 'upcoming':
          return 'info';
        case 'active':
          return 'success';
        case 'completed':
          return 'neutral';
        default:
          return 'neutral';
      }
    };

    const getStatusText = (status: Trip['status']) => {
      switch (status) {
        case 'upcoming':
          return 'Upcoming';
        case 'active':
          return 'Active';
        case 'completed':
          return 'Completed';
        default:
          return 'Unknown';
      }
    };

    const firstLeg = trip.legs[0];
    const lastLeg = trip.legs[trip.legs.length - 1];

    return {
      progress,
      submissionIndicator,
      statusColor: getStatusColor(trip.status),
      statusText: getStatusText(trip.status),
      firstLeg,
      lastLeg,
    };
  }, [trip.legs, trip.status]);

  const { progress, submissionIndicator, statusColor, statusText, firstLeg, lastLeg } = tripMetrics;

  const hasContextMenu = onDuplicate !== undefined || onDelete !== undefined;

  const handleLongPress = () => {
    if (!hasContextMenu) {
      return;
    }

    const options: string[] = [];
    if (onDuplicate) {options.push('Duplicate');}
    if (onDelete) {options.push('Delete');}
    options.push('Cancel');

    const cancelButtonIndex = options.length - 1;
    const destructiveButtonIndex = onDelete ? options.indexOf('Delete') : undefined;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          title: trip.name,
        },
        buttonIndex => {
          if (onDuplicate && options[buttonIndex] === 'Duplicate') {
            onDuplicate();
          } else if (onDelete && options[buttonIndex] === 'Delete') {
            onDelete();
          }
        },
      );
    } else {
      const alertButtons: Parameters<typeof Alert.alert>[2] = [];
      if (onDuplicate) {
        alertButtons.push({ text: 'Duplicate', onPress: onDuplicate });
      }
      if (onDelete) {
        alertButtons.push({ text: 'Delete', style: 'destructive', onPress: onDelete });
      }
      alertButtons.push({ text: 'Cancel', style: 'cancel' });
      Alert.alert(trip.name, 'Choose an action', alertButtons);
    }
  };

  const CardComponent = onPress || hasContextMenu ? TouchableOpacity : View;

  return (
    <CardComponent
      onPress={onPress}
      onLongPress={hasContextMenu ? handleLongPress : undefined}
      activeOpacity={onPress || hasContextMenu ? 0.7 : 1}
      testID={TRIP_CARD_IDS.card(trip.name).id}
      accessibilityLabel={trip.name}
      accessibilityRole={onPress || hasContextMenu ? 'button' : undefined}
      accessibilityHint={
        onPress && hasContextMenu
          ? 'Opens trip details. Long press for more options'
          : onPress
          ? 'Opens trip details'
          : hasContextMenu
          ? 'Long press for more options'
          : undefined
      }
    >
      <Card variant="elevated" className="mb-4">
        <View className="p-5">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {trip.name}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {trip.legs.length} destination{trip.legs.length > 1 ? 's' : ''}
                {firstLeg && ` • ${formatDate(firstLeg.arrivalDate)}`}
                {lastLeg?.departureDate && ` - ${formatDate(lastLeg.departureDate)}`}
              </Text>
            </View>
            <StatusBadge
              status={statusColor}
              text={statusText}
              size="medium"
            />
          </View>

          {/* Countries - Optimized rendering for large leg lists */}
          {trip.legs.length > 0 && (
            <View className="mb-4" accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
              <View className="flex-row items-center gap-1">
                {trip.legs.slice(0, 4).map((leg, index) => (
                  <React.Fragment key={leg.id}>
                    <CountryFlag countryCode={leg.destinationCountry} size="medium" />
                    {index < Math.min(trip.legs.length - 1, 3) && (
                      <Text className="mx-1 text-gray-400 dark:text-gray-500">→</Text>
                    )}
                  </React.Fragment>
                ))}
                {trip.legs.length > 4 && (
                  <Text className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    +{trip.legs.length - 4} more
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Urgency badge */}
          {urgency && urgency.level !== 'normal' && trip.status !== 'completed' && (
            <View
              className="mb-4 flex-row items-center"
              testID={TRIP_CARD_IDS.urgency(trip.name).id}
            >
              <CountryFlag countryCode={urgency.countryCode} size="small" />
              <View
                className={`ml-2 flex-row items-center rounded-full px-2 py-1 ${URGENCY_STYLES[urgency.level]?.bg ?? ''}`}
                accessibilityLabel={`${urgency.countryCode} form ${urgency.label.toLowerCase()}`}
              >
                <Text className={`text-xs font-semibold ${URGENCY_STYLES[urgency.level]?.text ?? ''}`}>
                  {urgency.label}
                </Text>
              </View>
            </View>
          )}

          {/* Travelers */}
          {travelers && travelers.length > 1 && (
            <View className="mb-4">
              <TravelerAvatars
                travelers={travelers}
                maxVisible={3}
                size="small"
                testID={TRIP_CARD_IDS.travelers(trip.name).id}
              />
            </View>
          )}

          {/* Progress */}
          {showProgress && progress.total > 0 && (
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Form Progress
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {progress.completed}/{progress.total} completed
                </Text>
              </View>
              <ProgressBar
                progress={progress.percentage}
                size="small"
                color="blue"
              />
              {/* Submission indicator */}
              <View
                accessible={true}
                accessibilityLabel={
                  submissionIndicator.allSubmitted
                    ? 'All legs submitted'
                    : `${submissionIndicator.submitted} of ${submissionIndicator.total} legs submitted`
                }
                testID={TRIP_CARD_IDS.submissionIndicator.id}
                className="mt-2"
              >
                {submissionIndicator.allSubmitted ? (
                  <Text className="text-sm font-semibold text-green-600 dark:text-green-400">
                    ✓ All submitted
                  </Text>
                ) : (
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    {submissionIndicator.submitted}/{submissionIndicator.total} submitted
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Empty state */}
          {trip.legs.length === 0 && (
            <View className="py-4 items-center">
              <Text className="text-gray-500 dark:text-gray-400 text-center">
                No destinations added yet
              </Text>
            </View>
          )}
        </View>
      </Card>
    </CardComponent>
  );
});

TripCard.displayName = 'TripCard';

export default TripCard;
