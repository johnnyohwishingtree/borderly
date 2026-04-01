/**
 * TravelerProgressList — shows per-traveler form progress rows.
 *
 * Props-only component (no store imports). Renders a progress bar and
 * "X/N legs ready" label for each traveler.
 */

import { memo } from 'react';
import { View, Text } from 'react-native';
import { ProgressBar } from '../ui';
import type { TravelerProgress } from '../../services/readiness/travelerProgress';
import { TRAVELER_PROGRESS_LIST_IDS } from './testIDs';

export interface TravelerProgressListProps {
  travelers: TravelerProgress[];
  testID?: string;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  self: 'Primary',
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  sibling: 'Sibling',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  not_started: 'text-tertiary',
  in_progress: 'text-amber-600',
  ready: 'text-blue-600',
  submitted: 'text-green-600',
};

const TravelerProgressList = memo<TravelerProgressListProps>(({
  travelers,
  testID = TRAVELER_PROGRESS_LIST_IDS.container.id,
}) => {
  if (travelers.length === 0) {
    return null;
  }

  return (
    <View
      testID={testID}
      accessibilityRole="summary"
    >
      <Text className="text-sm font-semibold text-primary mb-3">
        Traveler Progress
      </Text>
      {travelers.map((traveler) => {
        const percentage = traveler.legsTotal > 0
          ? (traveler.legsReady / traveler.legsTotal) * 100
          : 0;
        const relationLabel = RELATIONSHIP_LABELS[traveler.relationship] ?? 'Family';
        const statusColor = STATUS_COLORS[traveler.overallStatus] ?? 'text-tertiary';
        const a11yLabel = `${traveler.name}, ${relationLabel.toLowerCase()}: ${traveler.legsReady} of ${traveler.legsTotal} legs ready`;

        return (
          <View
            key={traveler.profileId}
            className="mb-3"
            testID={TRAVELER_PROGRESS_LIST_IDS.travelerRow(traveler.profileId).id}
            accessible={true}
            accessibilityLabel={a11yLabel}
            accessibilityRole="text"
          >
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center flex-1">
                <Text className="text-sm font-medium text-gray-800 mr-2">
                  {traveler.name}
                </Text>
                <Text className="text-xs text-tertiary">
                  {relationLabel}
                </Text>
              </View>
              <Text className={`text-xs font-medium ${statusColor}`}>
                {traveler.legsReady}/{traveler.legsTotal} ready
              </Text>
            </View>
            <ProgressBar
              progress={percentage}
              size="small"
              color={traveler.overallStatus === 'submitted' ? 'green' : 'blue'}
            />
          </View>
        );
      })}
    </View>
  );
});

TravelerProgressList.displayName = 'TravelerProgressList';

export default TravelerProgressList;
