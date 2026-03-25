import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react-native';
import CountryFlag from './CountryFlag';
import type { DeadlineSummaryItem } from '../../hooks/useDeadlineSummary';
import type { UrgencyLevel } from '../../services/deadline/deadlineService';

export interface DeadlineSummaryProps {
  items: DeadlineSummaryItem[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onGoToForm: (tripId: string, legId: string) => void;
  testID?: string;
}

const MAX_VISIBLE_ITEMS = 5;

function getUrgencyAccentColor(urgency: UrgencyLevel): string {
  switch (urgency) {
    case 'overdue': return '#DC2626';
    case 'critical': return '#EA580C';
    case 'warning': return '#D97706';
    default: return '#6B7280';
  }
}

function getUrgencyBgClass(urgency: UrgencyLevel): string {
  switch (urgency) {
    case 'overdue': return 'bg-red-50 dark:bg-red-950';
    case 'critical': return 'bg-orange-50 dark:bg-orange-950';
    case 'warning': return 'bg-amber-50 dark:bg-amber-950';
    default: return 'bg-gray-50 dark:bg-gray-800';
  }
}

function getUrgencyTextClass(urgency: UrgencyLevel): string {
  switch (urgency) {
    case 'overdue': return 'text-red-700 dark:text-red-300';
    case 'critical': return 'text-orange-700 dark:text-orange-300';
    case 'warning': return 'text-amber-700 dark:text-amber-300';
    default: return 'text-gray-700 dark:text-gray-300';
  }
}

function DeadlineItemRow({
  item,
  onGoToForm,
  testID,
}: {
  item: DeadlineSummaryItem;
  onGoToForm: (tripId: string, legId: string) => void;
  testID?: string;
}) {
  return (
    <View
      className={`flex-row items-center justify-between px-3 py-2.5 ${getUrgencyBgClass(item.urgency)} rounded-lg mb-1.5`}
      testID={testID}
      accessible={true}
      accessibilityLabel={`${item.tripName}, ${item.countryCode}, ${item.label}`}
    >
      <View className="flex-row items-center flex-1 mr-2">
        <CountryFlag countryCode={item.countryCode} size="small" />
        <View className="ml-2 flex-1">
          <Text
            className="text-sm font-medium text-gray-900 dark:text-gray-100"
            numberOfLines={1}
          >
            {item.tripName}
          </Text>
          <Text className={`text-xs font-semibold ${getUrgencyTextClass(item.urgency)}`}>
            {item.label}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => onGoToForm(item.tripId, item.legId)}
        className="bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg min-h-[32px] items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={`Go to ${item.tripName} form`}
        accessibilityHint="Navigate to the form for this trip leg"
        testID={testID ? `${testID}-go-button` : undefined}
      >
        <View className="flex-row items-center">
          <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400 mr-1">Go</Text>
          <ArrowRight size={12} color="#3B82F6" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function DeadlineSummary({
  items,
  isExpanded,
  onToggleExpanded,
  onGoToForm,
  testID = 'deadline-summary',
}: DeadlineSummaryProps) {
  const [showAll, setShowAll] = useState(false);

  if (items.length === 0) return null;

  const highestUrgency = items[0].urgency;
  const accentColor = getUrgencyAccentColor(highestUrgency);
  const showMoreCount = items.length > MAX_VISIBLE_ITEMS ? items.length - MAX_VISIBLE_ITEMS : 0;
  const visibleItems = showAll ? items : items.slice(0, MAX_VISIBLE_ITEMS);
  const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <View
      className="mx-4 mt-3 mb-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      testID={testID}
      accessibilityRole="summary"
    >
      {/* Header */}
      <TouchableOpacity
        onPress={onToggleExpanded}
        className="flex-row items-center justify-between px-4 py-3"
        accessibilityRole="button"
        accessibilityLabel={`${items.length} deadline${items.length !== 1 ? 's' : ''} need attention. ${isExpanded ? 'Collapse' : 'Expand'} details.`}
        accessibilityState={{ expanded: isExpanded }}
        testID={`${testID}-header`}
      >
        <View className="flex-row items-center flex-1">
          <View
            style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: accentColor, marginRight: 10 }}
          />
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {items.length} {items.length === 1 ? 'deadline needs' : 'deadlines need'} attention
          </Text>
        </View>
        <ChevronIcon size={18} color="#6B7280" />
      </TouchableOpacity>

      {/* Collapsible item list */}
      {isExpanded && (
        <View className="px-3 pb-3" testID={`${testID}-items`}>
          {visibleItems.map((item, index) => (
            <DeadlineItemRow
              key={`${item.tripId}-${item.legId}`}
              item={item}
              onGoToForm={onGoToForm}
              testID={`${testID}-item-${index}`}
            />
          ))}
          {showMoreCount > 0 && !showAll && (
            <TouchableOpacity
              onPress={() => setShowAll(true)}
              className="items-center py-2"
              accessibilityRole="button"
              accessibilityLabel={`Show ${showMoreCount} more deadlines`}
              testID={`${testID}-show-more`}
            >
              <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">
                +{showMoreCount} more
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
