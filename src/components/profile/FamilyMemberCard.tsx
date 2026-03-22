import { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, ViewProps } from 'react-native';
import { User } from 'lucide-react-native';
import { Card, StatusBadge, Button } from '../ui';
import { FamilyMember, FamilyRelationship } from '../../types/profile';

export interface FamilyMemberCardProps extends Pick<ViewProps, 'testID' | 'accessibilityLabel'> {
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
  isActive = false,
  ...viewProps
}) => {
  const memberMetrics = useMemo(() => {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return null;
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
        case 'sibling':
          return 'Sibling';
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
      formattedExpiry: formatDate(member.passportExpiry) || member.passportExpiry,
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
  const memberFullName = `${member.givenNames} ${member.surname}`;

  return (
    <CardComponent
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? memberFullName : undefined}
      accessibilityHint={onPress ? 'Opens family member details' : undefined}
      {...viewProps}
    >
      <Card
        variant={isActive ? "outlined" : "elevated"}
        className={`mb-4 ${isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
      >
        <View className="p-5">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full items-center justify-center mr-3" accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
                <User size={24} color="#6b7280" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  {member.givenNames} {member.surname}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {relationshipDisplay}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
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
          <View className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-4">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Passport
              </Text>
              {lastScanned && (
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  Last scanned: {lastScanned}
                </Text>
              )}
            </View>
            <Text className="text-sm font-mono text-gray-900 dark:text-white mb-1">
              {member.passportNumber}
            </Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-600 dark:text-gray-400">
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
                  accessibilityLabel={`Edit ${memberFullName}`}
                  accessibilityHint="Opens edit form for this family member"
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
                  accessibilityLabel={`Remove ${memberFullName}`}
                  accessibilityHint="Removes this family member from your profile"
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