import { memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { User, Check, Users } from 'lucide-react-native';
import { Card } from '../ui';
import { FamilyMember } from '../../types/profile';

export interface TravelerSelectorProps {
  travelers: FamilyMember[];
  selectedTravelerIds: string[];
  onToggleTraveler: (travelerId: string) => void;
  title?: string;
  subtitle?: string;
  showCompact?: boolean;
  minSelection?: number;
  maxSelection?: number;
}

const TravelerSelector = memo<TravelerSelectorProps>(({ 
  travelers,
  selectedTravelerIds,
  onToggleTraveler,
  title = "Select Travelers",
  subtitle,
  showCompact = false,
  minSelection = 1,
  maxSelection
}) => {
  const getRelationshipDisplay = (relationship: string) => {
    switch (relationship) {
      case 'self':
        return 'Primary';
      case 'spouse':
        return 'Spouse';
      case 'child':
        return 'Child';
      case 'parent':
        return 'Parent';
      case 'other':
        return 'Other';
      default:
        return 'Family';
    }
  };

  const canSelectMore = !maxSelection || selectedTravelerIds.length < maxSelection;
  const canDeselectMore = selectedTravelerIds.length > minSelection;

  const handleToggleTraveler = (travelerId: string) => {
    const isSelected = selectedTravelerIds.includes(travelerId);
    
    if (isSelected && !canDeselectMore) {
      // Cannot deselect if it would go below minimum
      return;
    }
    
    if (!isSelected && !canSelectMore) {
      // Cannot select if it would exceed maximum
      return;
    }

    onToggleTraveler(travelerId);
  };

  if (travelers.length === 0) {
    return (
      <Card className="p-4">
        <View className="items-center py-4">
          <Users size={32} color="#9ca3af" />
          <Text className="text-tertiary text-center mt-2">
            No family members available
          </Text>
        </View>
      </Card>
    );
  }

  if (showCompact) {
    return (
      <Card className="mb-4">
        <View className="p-3">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-medium text-secondary">{title}</Text>
            <Text className="text-xs text-tertiary">
              {selectedTravelerIds.length} selected
            </Text>
          </View>
          
          {subtitle && (
            <Text className="text-xs text-tertiary mb-3">{subtitle}</Text>
          )}

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="gap-2"
          >
            {travelers.map((traveler) => {
              const isSelected = selectedTravelerIds.includes(traveler.id);
              const canToggle = isSelected ? canDeselectMore : canSelectMore;
              
              return (
                <TouchableOpacity
                  key={traveler.id}
                  onPress={() => handleToggleTraveler(traveler.id)}
                  disabled={!canToggle}
                  className={`
                    px-3 py-2 rounded-lg border mr-2 min-w-0
                    ${isSelected 
                      ? 'bg-green-50 border-green-500' 
                      : canToggle 
                        ? 'bg-surface border-border-default' 
                        : 'bg-surface-tertiary border-border-default'
                    }
                  `}
                  activeOpacity={canToggle ? 0.7 : 1}
                >
                  <View className="flex-row items-center">
                    <View className={`
                      w-6 h-6 rounded-full items-center justify-center mr-2
                      ${isSelected 
                        ? 'bg-green-500' 
                        : canToggle 
                          ? 'bg-gray-300' 
                          : 'bg-gray-200'
                      }
                    `}>
                      {isSelected ? (
                        <Check size={12} color="white" />
                      ) : (
                        <User size={12} color={canToggle ? "#6b7280" : "#d1d5db"} />
                      )}
                    </View>
                    <View>
                      <Text className={`text-sm font-medium ${
                        isSelected 
                          ? 'text-green-700' 
                          : canToggle 
                            ? 'text-primary' 
                            : 'text-muted'
                      }`}>
                        {traveler.givenNames.split(' ')[0]}
                      </Text>
                      <Text className={`text-xs ${
                        isSelected 
                          ? 'text-green-600' 
                          : canToggle 
                            ? 'text-tertiary' 
                            : 'text-muted'
                      }`}>
                        {getRelationshipDisplay(traveler.relationship)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {(minSelection > 0 || maxSelection) && (
            <Text className="text-xs text-tertiary mt-2">
              {minSelection > 0 && maxSelection 
                ? `Select ${minSelection}-${maxSelection} travelers`
                : minSelection > 0 
                  ? `Minimum ${minSelection} traveler${minSelection > 1 ? 's' : ''}`
                  : `Maximum ${maxSelection} traveler${maxSelection! > 1 ? 's' : ''}`
              }
            </Text>
          )}
        </View>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <View className="p-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-primary">{title}</Text>
          <Text className="text-sm text-tertiary">
            {selectedTravelerIds.length} of {travelers.length} selected
          </Text>
        </View>

        {subtitle && (
          <Text className="text-sm text-secondary mb-4">{subtitle}</Text>
        )}
        
        <View className="space-y-2">
          {travelers.map((traveler) => {
            const isSelected = selectedTravelerIds.includes(traveler.id);
            const canToggle = isSelected ? canDeselectMore : canSelectMore;
            
            return (
              <TouchableOpacity
                key={traveler.id}
                onPress={() => handleToggleTraveler(traveler.id)}
                disabled={!canToggle}
                className={`
                  p-4 rounded-lg border
                  ${isSelected 
                    ? 'bg-green-50 border-green-500' 
                    : canToggle 
                      ? 'bg-surface-secondary border-border-default' 
                      : 'bg-surface-tertiary border-border-default'
                  }
                `}
                activeOpacity={canToggle ? 0.7 : 1}
              >
                <View className="flex-row items-center">
                  <View className={`
                    w-10 h-10 rounded-full items-center justify-center mr-3
                    ${isSelected 
                      ? 'bg-green-500' 
                      : canToggle 
                        ? 'bg-gray-300' 
                        : 'bg-gray-200'
                    }
                  `}>
                    {isSelected ? (
                      <Check size={20} color="white" />
                    ) : (
                      <User size={20} color={canToggle ? "#6b7280" : "#d1d5db"} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className={`text-base font-medium ${
                      isSelected 
                        ? 'text-green-700' 
                        : canToggle 
                          ? 'text-primary' 
                          : 'text-muted'
                    }`}>
                      {traveler.givenNames} {traveler.surname}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className={`text-sm ${
                        isSelected 
                          ? 'text-green-600' 
                          : canToggle 
                            ? 'text-tertiary' 
                            : 'text-muted'
                      }`}>
                        {getRelationshipDisplay(traveler.relationship)}
                      </Text>
                      <Text className={`text-sm ${
                        isSelected 
                          ? 'text-green-600' 
                          : canToggle 
                            ? 'text-tertiary' 
                            : 'text-muted'
                      }`}>
                        • {traveler.nationality}
                      </Text>
                      <Text className={`text-sm ${
                        isSelected 
                          ? 'text-green-600' 
                          : canToggle 
                            ? 'text-tertiary' 
                            : 'text-muted'
                      }`}>
                        • Born {new Date(traveler.dateOfBirth).getFullYear()}
                      </Text>
                    </View>
                  </View>
                  <View className={`
                    w-6 h-6 rounded-full items-center justify-center border-2
                    ${isSelected 
                      ? 'bg-green-500 border-green-500' 
                      : canToggle 
                        ? 'border-border-default' 
                        : 'border-border-default bg-surface-tertiary'
                    }
                  `}>
                    {isSelected && <Check size={16} color="white" />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {(minSelection > 0 || maxSelection) && (
          <View className="mt-4 p-3 bg-blue-50 rounded-lg">
            <Text className="text-sm text-blue-700">
              {minSelection > 0 && maxSelection 
                ? `Please select ${minSelection}-${maxSelection} travelers for this destination.`
                : minSelection > 0 
                  ? `At least ${minSelection} traveler${minSelection > 1 ? 's are' : ' is'} required.`
                  : `Maximum ${maxSelection} traveler${maxSelection! > 1 ? 's can' : ' can'} be selected.`
              }
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
});

TravelerSelector.displayName = 'TravelerSelector';

export default TravelerSelector;