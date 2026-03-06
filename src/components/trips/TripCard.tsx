import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card, StatusBadge, ProgressBar } from '../ui';
import { Trip } from '../../types/trip';
import CountryFlag from './CountryFlag';

export interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
  showProgress?: boolean;
}

export default function TripCard({ 
  trip, 
  onPress,
  showProgress = true 
}: TripCardProps) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getTripProgress = () => {
    if (trip.legs.length === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = trip.legs.filter(leg => 
      leg.formStatus === 'submitted' || leg.formStatus === 'ready'
    ).length;
    
    const total = trip.legs.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, percentage };
  };

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'upcoming':
        return 'blue';
      case 'active':
        return 'green';
      case 'completed':
        return 'gray';
      default:
        return 'gray';
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

  const progress = getTripProgress();
  const firstLeg = trip.legs[0];
  const lastLeg = trip.legs[trip.legs.length - 1];

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Card variant="elevated" className="mb-4">
        <View className="p-5">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900 mb-1">
                {trip.name}
              </Text>
              <Text className="text-sm text-gray-600">
                {trip.legs.length} destination{trip.legs.length > 1 ? 's' : ''}
                {firstLeg && ` • ${formatDate(firstLeg.arrivalDate)}`}
                {lastLeg && lastLeg.departureDate && ` - ${formatDate(lastLeg.departureDate)}`}
              </Text>
            </View>
            <StatusBadge 
              status={getStatusColor(trip.status)}
              text={getStatusText(trip.status)}
              size="medium"
            />
          </View>

          {/* Countries */}
          {trip.legs.length > 0 && (
            <View className="mb-4">
              <View className="flex-row items-center space-x-1">
                {trip.legs.slice(0, 4).map((leg, index) => (
                  <View key={leg.id} className="flex-row items-center">
                    <CountryFlag countryCode={leg.destinationCountry} size="small" />
                    {index < Math.min(trip.legs.length - 1, 3) && (
                      <Text className="mx-1 text-gray-400">→</Text>
                    )}
                  </View>
                ))}
                {trip.legs.length > 4 && (
                  <Text className="ml-2 text-sm text-gray-500">
                    +{trip.legs.length - 4} more
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Progress */}
          {showProgress && progress.total > 0 && (
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-gray-700">
                  Form Progress
                </Text>
                <Text className="text-sm text-gray-600">
                  {progress.completed}/{progress.total} completed
                </Text>
              </View>
              <ProgressBar 
                progress={progress.percentage} 
                height="small"
                color="blue"
              />
            </View>
          )}

          {/* Empty state */}
          {trip.legs.length === 0 && (
            <View className="py-4 items-center">
              <Text className="text-gray-500 text-center">
                No destinations added yet
              </Text>
            </View>
          )}
        </View>
      </Card>
    </CardComponent>
  );
}