import { View, Text } from 'react-native';
import type { LegSubmissionStatus } from '../../types/trip';

export interface SubmissionStatusBadgeProps {
  status?: LegSubmissionStatus;
  testID?: string;
}

interface BadgeConfig {
  label: string;
  accessibilityLabel: string;
  bgClass: string;
  textClass: string;
}

const BADGE_CONFIGS: Record<LegSubmissionStatus, BadgeConfig> = {
  not_started: {
    label: 'Not Started',
    accessibilityLabel: 'Submission not started',
    bgClass: 'bg-gray-100 dark:bg-gray-700',
    textClass: 'text-gray-700 dark:text-gray-300',
  },
  in_progress: {
    label: 'In Progress',
    accessibilityLabel: 'Submission in progress',
    bgClass: 'bg-amber-100 dark:bg-amber-900',
    textClass: 'text-amber-800 dark:text-amber-200',
  },
  submitted: {
    label: 'Submitted',
    accessibilityLabel: 'Submission complete',
    bgClass: 'bg-green-100 dark:bg-green-900',
    textClass: 'text-green-800 dark:text-green-200',
  },
};

/**
 * A compact pill badge showing the submission status of a trip leg.
 *
 * - `not_started` → grey pill
 * - `in_progress` → amber pill
 * - `submitted`   → green pill
 *
 * Returns null when `status` is undefined — nothing to display yet.
 *
 * Accessibility: the container carries a combined `accessibilityLabel`
 * and the inner Text node is hidden from screen readers to prevent
 * double-announcement.
 */
export default function SubmissionStatusBadge({
  status,
  testID,
}: SubmissionStatusBadgeProps) {
  if (status === undefined) {
    return null;
  }

  const config = BADGE_CONFIGS[status];

  return (
    <View
      testID={testID ?? `submission-status-badge-${status}`}
      className={`flex-row items-center rounded-full px-2 py-1 ${config.bgClass}`}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={config.accessibilityLabel}
    >
      <Text
        className={`text-xs font-semibold ${config.textClass}`}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      >
        {config.label}
      </Text>
    </View>
  );
}
