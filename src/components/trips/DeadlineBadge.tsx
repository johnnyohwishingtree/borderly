import { View, Text } from 'react-native';
import {
  LegDeadline,
  getUrgencyLevel,
} from '../../services/deadline/deadlineService';

export interface DeadlineBadgeProps {
  deadline: LegDeadline;
  testID?: string;
}

interface BadgeConfig {
  label: string;
  bgClass: string;
  textClass: string;
}

/**
 * Returns the countdown label for the badge footer.
 * - > 24 h remaining: "X days left"  (rounded to nearest day)
 * - 0–24 h remaining: "Xh left"
 * - <= 0 h remaining: empty string (status label already says "Overdue")
 */
function countdownLabel(hoursRemaining: number): string {
  if (hoursRemaining <= 0) {
    return '';
  }
  if (hoursRemaining > 24) {
    const days = Math.round(hoursRemaining / 24);
    return `${days} day${days !== 1 ? 's' : ''} left`;
  }
  const hours = Math.ceil(hoursRemaining);
  return `${hours}h left`;
}

/**
 * Maps the effective deadline state to display config.
 *
 * Priority (high → low):
 *  1. ready   → Ready (green)
 *  2. overdue urgency or status → Overdue (red)
 *  3. critical urgency → Act Now (orange)
 *  4. warning urgency  → Due Soon (amber)
 *  5. in-progress → In Progress (blue)
 *  6. default → Not Started (gray)
 */
function resolveBadgeConfig(deadline: LegDeadline): BadgeConfig {
  const urgency = getUrgencyLevel(deadline);

  if (deadline.status === 'ready') {
    return {
      label: 'Ready',
      bgClass: 'bg-green-100',
      textClass: 'text-green-800',
    };
  }

  if (deadline.status === 'overdue' || urgency === 'overdue') {
    return {
      label: 'Overdue',
      bgClass: 'bg-red-100',
      textClass: 'text-red-800',
    };
  }

  if (urgency === 'critical') {
    return {
      label: 'Act Now',
      bgClass: 'bg-orange-100',
      textClass: 'text-orange-800',
    };
  }

  if (urgency === 'warning') {
    return {
      label: 'Due Soon',
      bgClass: 'bg-amber-100',
      textClass: 'text-amber-800',
    };
  }

  if (deadline.status === 'in-progress') {
    return {
      label: 'In Progress',
      bgClass: 'bg-blue-100',
      textClass: 'text-blue-800',
    };
  }

  // not-started or no-deadline without urgency
  return {
    label: 'Not Started',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
  };
}

/**
 * A compact pill badge that shows deadline status and urgency for a trip leg.
 *
 * Returns null for legs with no deadline and no urgency ('no-deadline' status
 * with urgency 'normal') — there is nothing actionable to show.
 */
export default function DeadlineBadge({ deadline, testID }: DeadlineBadgeProps) {
  // No badge for truly no-deadline legs
  if (deadline.status === 'no-deadline' && getUrgencyLevel(deadline) === 'normal') {
    return null;
  }

  const config = resolveBadgeConfig(deadline);
  const countdown = deadline.status === 'ready' ? '' : countdownLabel(deadline.hoursRemaining);

  return (
    <View
      testID={testID ?? `deadline-badge-${deadline.legId}`}
      className={`flex-row items-center rounded-full px-2 py-1 ${config.bgClass}`}
      accessibilityLabel={`${config.label}${countdown ? `, ${countdown}` : ''}`}
    >
      <Text className={`text-xs font-semibold ${config.textClass}`}>
        {config.label}
      </Text>
      {countdown ? (
        <Text className={`text-xs ml-1 ${config.textClass}`}>
          · {countdown}
        </Text>
      ) : null}
    </View>
  );
}
