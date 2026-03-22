import { View, Text } from 'react-native';

export type ExpiryStatus = 'valid' | 'expiring-soon' | 'expired';

export interface PassportExpiryBadgeProps {
  expiryDate: string; // ISO 8601 date string
  /** Override "today" for testing. Defaults to new Date(). */
  today?: Date;
  testID?: string;
}

interface BadgeConfig {
  label: string;
  bgClass: string;
  textClass: string;
}

/**
 * Compute the number of whole days remaining until the expiry date.
 * Returns a negative number if already expired.
 */
export function computeDaysRemaining(expiryDate: string, today: Date = new Date()): number {
  const expiry = new Date(expiryDate);
  // Compare calendar dates only (midnight-to-midnight)
  const todayMidnight = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const expiryMidnight = new Date(
    Date.UTC(expiry.getFullYear(), expiry.getMonth(), expiry.getDate()),
  );
  const msRemaining = expiryMidnight.getTime() - todayMidnight.getTime();
  return Math.floor(msRemaining / (1000 * 60 * 60 * 24));
}

/**
 * Classify a passport into one of three expiry states.
 *
 * | State          | Condition           | Color  |
 * |----------------|---------------------|--------|
 * | valid          | 180+ days remaining | green  |
 * | expiring-soon  | 30–179 days         | amber  |
 * | expired        | < 30 days (or past) | red    |
 */
export function computeExpiryStatus(daysRemaining: number): ExpiryStatus {
  if (daysRemaining >= 180) {
    return 'valid';
  }
  if (daysRemaining >= 30) {
    return 'expiring-soon';
  }
  return 'expired';
}

const BADGE_CONFIG: Record<ExpiryStatus, BadgeConfig> = {
  valid: {
    label: 'Valid',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
  },
  'expiring-soon': {
    label: 'Expiring Soon',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
  },
  expired: {
    label: 'Expired',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
  },
};

/**
 * A colour-coded pill badge showing passport expiry status.
 *
 * - Green  (valid):         180 or more days remaining
 * - Amber  (expiring-soon): 30–179 days remaining
 * - Red    (expired):       fewer than 30 days remaining, or already expired
 */
export default function PassportExpiryBadge({
  expiryDate,
  today,
  testID = 'passport-expiry-badge',
}: PassportExpiryBadgeProps) {
  const daysRemaining = computeDaysRemaining(expiryDate, today);
  const status = computeExpiryStatus(daysRemaining);
  const config = BADGE_CONFIG[status];

  const daysLabel =
    daysRemaining < 0
      ? `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} ago`
      : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;

  const accessibilityLabel = `${config.label}, ${daysLabel}`;

  return (
    <View
      testID={testID}
      className={`flex-row items-center rounded-full px-2 py-1 ${config.bgClass}`}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <Text className={`text-xs font-semibold ${config.textClass}`}>{config.label}</Text>
      <Text className={`text-xs ml-1 ${config.textClass}`}>· {daysLabel}</Text>
    </View>
  );
}
