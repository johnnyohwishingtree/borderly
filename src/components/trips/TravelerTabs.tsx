import { memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { TRAVELER_TABS_IDS } from './testIDs';

export interface TravelerTab {
  id: string;
  name: string;
  completionPercentage: number;
  formStatus: 'not_started' | 'in_progress' | 'ready' | 'submitted';
}

export interface TravelerTabsProps {
  tabs: TravelerTab[];
  activeTabId: string;
  onTabPress: (travelerId: string) => void;
  testID?: string;
}

const TravelerTabs = memo<TravelerTabsProps>(({ tabs, activeTabId, onTabPress, testID }) => {
  if (tabs.length <= 1) {
    return null;
  }

  return (
    <View
      className="bg-surface border-b border-border-default"
      testID={testID ?? TRAVELER_TABS_IDS.container.id}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isReady =
            tab.formStatus === 'ready' || tab.formStatus === 'submitted';

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onTabPress(tab.id)}
              testID={TRAVELER_TABS_IDS.tab(tab.id).id}
              activeOpacity={0.7}
              className={`
                mr-2 px-4 py-2 rounded-lg border flex-row items-center
                ${
                  isActive
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-surface-secondary border-border-default'
                }
              `}
            >
              {/* Completion indicator */}
              <View
                className={`
                  w-6 h-6 rounded-full items-center justify-center mr-2
                  ${
                    isReady
                      ? 'bg-green-500'
                      : tab.completionPercentage > 0
                      ? 'bg-yellow-400'
                      : 'bg-gray-300'
                  }
                `}
                testID={TRAVELER_TABS_IDS.tabIndicator(tab.id).id}
              >
                {isReady ? (
                  <Check size={12} color="white" />
                ) : (
                  <Text className="text-white text-xs font-bold">
                    {tab.completionPercentage > 0
                      ? `${Math.round(tab.completionPercentage)}`
                      : ''}
                  </Text>
                )}
              </View>

              {/* Traveler name */}
              <View>
                <Text
                  className={`text-sm font-medium ${
                    isActive ? 'text-blue-700' : 'text-secondary'
                  }`}
                  numberOfLines={1}
                >
                  {tab.name}
                </Text>
                {!isReady && tab.completionPercentage > 0 && (
                  <Text
                    className={`text-xs ${
                      isActive ? 'text-blue-500' : 'text-tertiary'
                    }`}
                  >
                    {tab.completionPercentage}% done
                  </Text>
                )}
                {isReady && (
                  <Text
                    className={`text-xs ${
                      isActive ? 'text-blue-500' : 'text-green-600'
                    }`}
                  >
                    Ready
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

TravelerTabs.displayName = 'TravelerTabs';

export default TravelerTabs;
