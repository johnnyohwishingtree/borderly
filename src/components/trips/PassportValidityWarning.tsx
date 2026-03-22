import { View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import type { PassportValidityStatus } from '../../types/document';

export interface PassportValidityWarningProps {
  /** Result from `checkPassportValidity` — the component renders nothing when `status.isValid` is true. */
  status: PassportValidityStatus;
  /** Human-readable name of the destination country, e.g. "Japan". */
  countryName: string;
  /** Number of months beyond the departure date the country requires passport validity. */
  requiredMonths: number;
  /** ISO 8601 passport expiry date string, e.g. "2025-03-31". */
  passportExpiry: string;
  testID?: string;
}

/**
 * Inline warning banner shown when a traveler's passport does not meet the
 * validity requirements for a destination country.
 *
 * Non-blocking — the user can still proceed but is clearly informed of the
 * potential entry issue. Returns null when `status.isValid` is true.
 *
 * Accessibility: the container uses `accessibilityRole="alert"` and
 * `accessibilityLiveRegion="polite"` so that screen readers announce the
 * warning when it appears.
 */
export default function PassportValidityWarning({
  status,
  countryName,
  requiredMonths,
  passportExpiry,
  testID,
}: PassportValidityWarningProps) {
  if (status.isValid) return null;

  const expiryDisplay = new Date(passportExpiry).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const monthLabel = requiredMonths === 1 ? 'month' : 'months';
  const dayLabel = status.shortfallDays === 1 ? 'day' : 'days';

  const accessibilityLabel = [
    `Passport validity warning for ${countryName}.`,
    `${countryName} requires your passport to be valid for at least ${requiredMonths} ${monthLabel} beyond your departure date.`,
    `Your passport expires ${expiryDisplay},`,
    `which is ${status.shortfallDays} ${dayLabel} short of the requirement.`,
    `You may still proceed, but entry could be denied.`,
  ].join(' ');

  return (
    <View
      testID={testID ?? `passport-validity-warning-${countryName}`}
      className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-3"
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={accessibilityLabel}
    >
      <View className="flex-row items-start">
        <AlertTriangle
          size={18}
          color="#d97706"
          style={{ marginTop: 2, marginRight: 8 }}
          accessibilityElementsHidden
        />
        <View className="flex-1">
          <Text
            className="text-amber-800 font-semibold text-sm mb-1"
            accessibilityElementsHidden
          >
            Passport Validity Warning
          </Text>
          <Text className="text-amber-700 text-sm" accessibilityElementsHidden>
            <Text className="font-semibold">{countryName}</Text> requires your passport to be
            valid for at least{' '}
            <Text className="font-semibold">
              {requiredMonths} {monthLabel}
            </Text>{' '}
            beyond your departure date.
          </Text>
          <Text className="text-amber-700 text-sm mt-1" accessibilityElementsHidden>
            Your passport expires{' '}
            <Text className="font-semibold">{expiryDisplay}</Text>, which is{' '}
            <Text className="font-semibold">
              {status.shortfallDays} {dayLabel} short
            </Text>{' '}
            of the requirement.
          </Text>
          <Text className="text-amber-600 text-xs mt-2" accessibilityElementsHidden>
            You may still proceed, but entry could be denied.
          </Text>
        </View>
      </View>
    </View>
  );
}
