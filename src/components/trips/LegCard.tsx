import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from '../ui';
import { StatusBadge } from '../ui';
import { TripLeg } from '../../types/trip';
import CountryFlag from './CountryFlag';

export interface LegCardProps {
  leg: TripLeg;
  onPress?: () => void;
  showFormStatus?: boolean;
}

export default function LegCard({ 
  leg, 
  onPress, 
  showFormStatus = true 
}: LegCardProps) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: TripLeg['formStatus']) => {
    switch (status) {
      case 'not_started':
        return 'gray';
      case 'in_progress':
        return 'yellow';
      case 'ready':
        return 'blue';
      case 'submitted':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status: TripLeg['formStatus']) => {
    switch (status) {
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'ready':
        return 'Ready to Submit';
      case 'submitted':
        return 'Submitted';
      default:
        return 'Unknown';
    }
  };

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Card variant="outlined" className="mb-3">
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <CountryFlag countryCode={leg.destinationCountry} size="medium" />
              <View className="ml-3">
                <Text className="text-lg font-semibold text-gray-900">
                  {COUNTRY_FLAGS[leg.destinationCountry as keyof typeof COUNTRY_FLAGS]?.name || 'Unknown'}
                </Text>
                <Text className="text-sm text-gray-600">
                  {formatDate(leg.arrivalDate)}
                  {leg.departureDate && ` - ${formatDate(leg.departureDate)}`}
                </Text>
              </View>
            </View>
            {showFormStatus && (
              <StatusBadge 
                status={getStatusColor(leg.formStatus)}
                text={getStatusText(leg.formStatus)}
                size="small"
              />
            )}
          </View>

          {leg.flightNumber && (
            <View className="mb-2">
              <Text className="text-sm text-gray-600">
                Flight: {leg.flightNumber}
                {leg.arrivalAirport && ` → ${leg.arrivalAirport}`}
              </Text>
            </View>
          )}

          <View>
            <Text className="text-sm font-medium text-gray-700">
              {leg.accommodation.name}
            </Text>
            <Text className="text-sm text-gray-600">
              {leg.accommodation.address.city}
            </Text>
          </View>

          {leg.qrCodes && leg.qrCodes.length > 0 && (
            <View className="mt-3 pt-3 border-t border-gray-200">
              <Text className="text-sm text-gray-600">
                {leg.qrCodes.length} QR code{leg.qrCodes.length > 1 ? 's' : ''} saved
              </Text>
            </View>
          )}
        </View>
      </Card>
    </CardComponent>
  );
}

// Re-export the country flags constant for use in other components
const COUNTRY_FLAGS = {
  JPN: { flag: '🇯🇵', name: 'Japan' },
  MYS: { flag: '🇲🇾', name: 'Malaysia' },
  SGP: { flag: '🇸🇬', name: 'Singapore' },
} as const;