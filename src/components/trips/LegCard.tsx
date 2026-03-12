import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from '../ui';
import { StatusBadge } from '../ui';
import { TripLeg } from '../../types/trip';
import { FamilyMember } from '../../types/profile';
import { getCountryName } from '../../constants/countries';
import CountryFlag from './CountryFlag';
import { 
  getTravelerFormStatus, 
  getOverallLegFormStatus 
} from '../../services/forms/formEngine';

export interface LegCardProps {
  leg: TripLeg;
  onPress?: () => void;
  showFormStatus?: boolean;
  familyMembers?: FamilyMember[];
  showTravelerDetails?: boolean;
}

export default function LegCard({ 
  leg, 
  onPress, 
  showFormStatus = true,
  familyMembers = [],
  showTravelerDetails = false
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
        return 'neutral';
      case 'in_progress':
        return 'warning';
      case 'ready':
        return 'info';
      case 'submitted':
        return 'success';
      default:
        return 'neutral';
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

  // Use overall status if we have assigned travelers, otherwise use legacy status
  const displayStatus = leg.assignedTravelers && leg.assignedTravelers.length > 0 
    ? getOverallLegFormStatus(leg)
    : leg.formStatus;

  const getAssignedTravelers = () => {
    if (!leg.assignedTravelers || leg.assignedTravelers.length === 0) {
      return [];
    }
    
    return leg.assignedTravelers.map(travelerId => {
      const member = familyMembers.find(m => m.id === travelerId);
      if (!member) return null;
      
      return {
        member,
        status: getTravelerFormStatus(travelerId, leg)
      };
    }).filter(Boolean);
  };

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent onPress={onPress} activeOpacity={onPress ? 0.7 : 1} testID={`leg-card-${leg.destinationCountry}`} accessibilityLabel={getCountryName(leg.destinationCountry)}>
      <Card variant="outlined" className="mb-3">
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <CountryFlag countryCode={leg.destinationCountry} size="medium" />
              <View className="ml-3">
                <Text className="text-lg font-semibold text-gray-900">
                  {getCountryName(leg.destinationCountry)}
                </Text>
                <Text className="text-sm text-gray-600">
                  {formatDate(leg.arrivalDate)}
                  {leg.departureDate && ` - ${formatDate(leg.departureDate)}`}
                </Text>
              </View>
            </View>
            {showFormStatus && (
              <StatusBadge 
                status={getStatusColor(displayStatus)}
                text={getStatusText(displayStatus)}
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

          {/* Multi-traveler details */}
          {showTravelerDetails && leg.assignedTravelers && leg.assignedTravelers.length > 0 && (
            <View className="mt-3 pt-3 border-t border-gray-200">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Travelers ({leg.assignedTravelers.length})
              </Text>
              <View className="space-y-1">
                {getAssignedTravelers().map((travelerInfo) => {
                  if (!travelerInfo) return null;
                  const { member, status } = travelerInfo;
                  
                  return (
                    <View key={member.id} className="flex-row items-center justify-between">
                      <Text className="text-sm text-gray-600 flex-1">
                        {member.givenNames.split(' ')[0]} {member.surname}
                      </Text>
                      <StatusBadge 
                        status={getStatusColor(status)}
                        text={getStatusText(status)}
                        size="small"
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Show traveler count even when details are hidden */}
          {!showTravelerDetails && leg.assignedTravelers && leg.assignedTravelers.length > 1 && (
            <View className="mt-2">
              <Text className="text-xs text-gray-500">
                {leg.assignedTravelers.length} travelers assigned
              </Text>
            </View>
          )}

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

