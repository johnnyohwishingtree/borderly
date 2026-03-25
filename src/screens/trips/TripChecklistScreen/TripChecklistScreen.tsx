import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import { ScreenContainer, StatusBadge } from '@/components/ui';
import LoadingStates from '@/components/ui/LoadingStates';
import { useTripChecklist } from '@/hooks/useTripChecklist';
import { ChecklistItem, ChecklistItemStatus } from '@/services/checklist/checklistTypes';

interface RouteParams {
  tripId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  form: 'Forms',
  passport: 'Passport',
  qr: 'QR Codes',
  deadline: 'Deadlines',
};

const CATEGORY_ORDER = ['form', 'passport', 'qr', 'deadline'];

function statusToBadge(status: ChecklistItemStatus): {
  badgeStatus: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  badgeText: string;
} {
  switch (status) {
    case 'complete':
      return { badgeStatus: 'success', badgeText: 'Complete' };
    case 'in-progress':
      return { badgeStatus: 'info', badgeText: 'In Progress' };
    case 'action-needed':
      return { badgeStatus: 'error', badgeText: 'Action Needed' };
    case 'warning':
      return { badgeStatus: 'warning', badgeText: 'Warning' };
    case 'not-started':
      return { badgeStatus: 'neutral', badgeText: 'Not Started' };
  }
}

function ChecklistItemRow({
  item,
  onPress,
}: {
  item: ChecklistItem;
  onPress: () => void;
}) {
  const { badgeStatus, badgeText } = statusToBadge(item.status);

  return (
    <TouchableOpacity
      testID={`checklist-item-${item.id}`}
      className="flex-row items-center px-4 py-3"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}, ${badgeText}`}
      accessibilityHint="Tap to view details"
    >
      <View className="flex-1 mr-3">
        <View className="flex-row items-center mb-1">
          <StatusBadge status={badgeStatus} text={badgeText} size="small" className="mr-2" />
          <Text className="text-base font-medium text-gray-900 dark:text-gray-100 flex-shrink" numberOfLines={1}>
            {item.label}
          </Text>
        </View>
        <Text className="text-sm text-gray-500 dark:text-gray-400" numberOfLines={1}>
          {item.detail}
        </Text>
      </View>
      <ChevronRight size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}

function ProgressHeader({
  completedCount,
  totalCount,
}: {
  completedCount: number;
  totalCount: number;
}) {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <View className="px-4 py-4" testID="checklist-progress">
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {completedCount} of {totalCount} items complete
      </Text>
      <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <View
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${percent}%` }}
          accessibilityLabel={`${percent}% complete`}
        />
      </View>
    </View>
  );
}

export default function TripChecklistScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tripId } = route.params as RouteParams;

  const { checklist, isLoading } = useTripChecklist(tripId);

  const groupedItems = useMemo(() => {
    if (!checklist) return [];
    const groups: { category: string; label: string; items: ChecklistItem[] }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = checklist.items.filter(i => i.category === cat);
      if (items.length > 0) {
        groups.push({ category: cat, label: CATEGORY_LABELS[cat], items });
      }
    }
    return groups;
  }, [checklist]);

  const handleItemPress = (item: ChecklistItem) => {
    const { screen, params } = item.deepLink;
    (navigation as { navigate: (screen: string, params?: Record<string, string>) => void }).navigate(
      screen,
      params,
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <LoadingStates
          state="loading"
          variant="spinner"
          size="medium"
          text="Computing checklist..."
          fullScreen={false}
        />
      </ScreenContainer>
    );
  }

  if (!checklist || checklist.items.length === 0) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center px-4">
          <Text
            className="text-lg text-gray-500 dark:text-gray-400 text-center"
            testID="checklist-empty"
          >
            No checklist items. Add destinations to your trip to see your pre-departure checklist.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView testID="checklist-scroll">
        <ProgressHeader
          completedCount={checklist.completedCount}
          totalCount={checklist.totalCount}
        />

        {groupedItems.map(group => (
          <View key={group.category} className="mb-4">
            <Text className="px-4 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800">
              {group.label}
            </Text>
            {group.items.map(item => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onPress={() => handleItemPress(item)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
