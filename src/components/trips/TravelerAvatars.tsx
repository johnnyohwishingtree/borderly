import { memo, useMemo } from 'react';
import { View, Text } from 'react-native';
import type { FamilyMember, FamilyRelationship } from '../../types/profile';

export interface TravelerAvatarsProps {
  travelers: FamilyMember[];
  maxVisible?: number;
  size?: 'small' | 'medium';
  showCount?: boolean;
  testID?: string;
}

const RELATIONSHIP_COLORS: Record<FamilyRelationship, { bg: string; text: string }> = {
  self: { bg: 'bg-blue-100', text: 'text-blue-700' },
  spouse: { bg: 'bg-pink-100', text: 'text-pink-700' },
  child: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  parent: { bg: 'bg-green-100', text: 'text-green-700' },
  sibling: { bg: 'bg-purple-100', text: 'text-purple-700' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

function getInitials(member: FamilyMember): string {
  const first = member.givenNames?.charAt(0) ?? '';
  const last = member.surname?.charAt(0) ?? '';
  return `${first}${last}`.toUpperCase();
}

function getRelationshipLabel(relationship: FamilyRelationship): string {
  switch (relationship) {
    case 'self': return 'Primary';
    case 'spouse': return 'Spouse';
    case 'child': return 'Child';
    case 'parent': return 'Parent';
    case 'sibling': return 'Sibling';
    case 'other': return 'Other';
    default: return 'Family';
  }
}

const TravelerAvatars = memo<TravelerAvatarsProps>(({
  travelers,
  maxVisible = 3,
  size = 'small',
  showCount = true,
  testID = 'traveler-avatars',
}) => {
  const visible = useMemo(() => travelers.slice(0, maxVisible), [travelers, maxVisible]);
  const overflow = travelers.length - maxVisible;

  if (travelers.length <= 1) {
    return null;
  }

  const sizeClasses = size === 'small'
    ? { pill: 'w-7 h-7', text: 'text-xs' }
    : { pill: 'w-9 h-9', text: 'text-sm' };

  return (
    <View
      className="flex-row items-center"
      testID={testID}
      accessible={true}
      accessibilityLabel={`${travelers.length} travelers`}
      accessibilityRole="text"
    >
      {visible.map((member) => {
        const colors = RELATIONSHIP_COLORS[member.relationship] ?? RELATIONSHIP_COLORS.other;
        const fullName = `${member.givenNames} ${member.surname}`;
        const relationLabel = getRelationshipLabel(member.relationship);

        return (
          <View
            key={member.id}
            className={`${sizeClasses.pill} ${colors.bg} rounded-full items-center justify-center mr-1`}
            accessibilityLabel={`${fullName}, ${relationLabel}`}
            testID={`traveler-avatar-${member.id}`}
          >
            <Text className={`${sizeClasses.text} font-semibold ${colors.text}`}>
              {getInitials(member)}
            </Text>
          </View>
        );
      })}
      {overflow > 0 && (
        <View
          className={`${sizeClasses.pill} bg-gray-100 rounded-full items-center justify-center mr-1`}
          testID="traveler-avatar-overflow"
        >
          <Text className={`${sizeClasses.text} font-semibold text-gray-600`}>
            +{overflow}
          </Text>
        </View>
      )}
      {showCount && (
        <Text
          className="text-xs text-gray-500 dark:text-gray-400 ml-1"
          testID="traveler-count"
        >
          {travelers.length} travelers
        </Text>
      )}
    </View>
  );
});

TravelerAvatars.displayName = 'TravelerAvatars';

export default TravelerAvatars;
