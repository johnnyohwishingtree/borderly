import { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { User } from 'lucide-react-native';
import { Card, StatusBadge, Button } from '../ui';
import { FamilyMember, FamilyRelationship } from '../../types/profile';

export interface FamilyMemberCardProps {
  member: FamilyMember;
  onPress?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  isActive?: boolean;
}

const FamilyMemberCard = memo<FamilyMemberCardProps>(({ 
  member, 
  onPress,
  onEdit,
  onRemove,
  isActive = false
}) => {
  const memberMetrics = useMemo(() => {
    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return dateStr;
      }
    };

    const isPassportExpiringSoon = (expiryDate: string) => {
      const expiry = new Date(expiryDate);
      const now = new Date();
      const sixMonths = new Date();
      sixMonths.setMonth(now.getMonth() + 6);
      return expiry <= sixMonths;
    };

    const getRelationshipDisplay = (relationship: FamilyRelationship) => {
      switch (relationship) {
        case 'self':
          return 'Primary Traveler';
        case 'spouse':
          return 'Spouse';
        case 'child':
          return 'Child';
        case 'parent':
          return 'Parent';
        case 'other':
          return 'Other Family';
        default:
          return 'Family Member';
      }
    };

    const getStatusColor = (): 'error' | 'success' | 'warning' | 'info' | 'neutral' => {
      if (isPassportExpiringSoon(member.passportExpiry)) {
        return 'warning';
      }
      return 'success';
    };

    const getStatusText = () => {
      if (isPassportExpiringSoon(member.passportExpiry)) {
        return 'Passport Expiring';
      }
      return 'Valid';
    };

    return {
      formattedExpiry: formatDate(member.passportExpiry),
      relationshipDisplay: getRelationshipDisplay(member.relationship),
      statusColor: getStatusColor(),
      statusText: getStatusText(),
      isExpiringSoon: isPassportExpiringSoon(member.passportExpiry),
      lastScanned: formatDate(member.updatedAt),
    };
  }, [member]);
  
  const { 
    formattedExpiry, 
    relationshipDisplay, 
    statusColor, 
    statusText, 
    isExpiringSoon,
    lastScanned
  } = memberMetrics;

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Card 
        variant={isActive ? "outlined" : "elevated"} 
        className={`mb-4 ${isActive ? 'border-blue-500 bg-blue-50' : ''}`}
      >
        <View className="p-5">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center mr-3">
                <User size={24} color="#6b7280" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900">
                  {member.givenNames} {member.surname}
                </Text>
                <Text className="text-sm text-gray-600">
                  {relationshipDisplay}
                </Text>
                <Text className="text-xs text-gray-500">
                  {member.nationality} • Born {new Date(member.dateOfBirth).getFullYear()}
                </Text>
              </View>
            </View>
            <StatusBadge 
              status={statusColor}
              text={statusText}
              size="small"
            />
          </View>

          {/* Passport Information */}
          <View className="bg-gray-50 p-3 rounded-lg mb-4">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Passport
              </Text>
              <Text className="text-xs text-gray-500">
                Last scanned: {lastScanned}
              </Text>
            </View>
            <Text className="text-sm font-mono text-gray-900 mb-1">
              {member.passportNumber}
            </Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-600">
                Expires: {formattedExpiry}
              </Text>
              {isExpiringSoon && (
                <Text className="text-xs text-orange-600 font-medium">
                  ⚠ Expiring Soon
                </Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row space-x-2">
            {onEdit && (
              <View className="flex-1">
                <Button
                  title="Edit"
                  onPress={onEdit}
                  variant="outline"
                  size="small"
                />
              </View>
            )}
            {onRemove && member.relationship !== 'self' && (
              <View className="flex-1">
                <Button
                  title="Remove"
                  onPress={onRemove}
                  variant="outline"
                  size="small"
                />
              </View>
            )}
          </View>
        </View>
      </Card>
    </CardComponent>
  );
});

FamilyMemberCard.displayName = 'FamilyMemberCard';

export default FamilyMemberCard;