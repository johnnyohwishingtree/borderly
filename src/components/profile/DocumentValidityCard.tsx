import { View, Text } from 'react-native';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { Card } from '@/components/ui';
import PassportExpiryBadge, {
  computeDaysRemaining,
  computeExpiryStatus,
} from './PassportExpiryBadge';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';
import JPN from '@/schemas/JPN.json';
import MYS from '@/schemas/MYS.json';
import SGP from '@/schemas/SGP.json';
import THA from '@/schemas/THA.json';
import VNM from '@/schemas/VNM.json';
import GBR from '@/schemas/GBR.json';
import USA from '@/schemas/USA.json';
import CAN from '@/schemas/CAN.json';
import AUS from '@/schemas/AUS.json';
import NZL from '@/schemas/NZL.json';
import KOR from '@/schemas/KOR.json';

export interface DocumentValidityCardProps {
  /** ISO 8601 passport expiry date string. Returns null when falsy. */
  passportExpiry: string | undefined | null;
  /** Override "today" for testing. Defaults to new Date(). */
  today?: Date;
  testID?: string;
}

/**
 * Number of months of passport validity that each supported country requires
 * beyond the hypothetical departure date.
 *
 * Derived directly from per-country JSON schemas (`passportValidityMonths`)
 * so this map stays in sync automatically when schemas are updated.
 */
const COUNTRY_VALIDITY_MONTHS: Record<string, number> = Object.fromEntries(
  [JPN, MYS, SGP, THA, VNM, GBR, USA, CAN, AUS, NZL, KOR].map(
    (s) => [s.countryCode, s.passportValidityMonths ?? 6],
  ),
);

/**
 * Check whether the passport is valid for a given destination country based on
 * a hypothetical "today" departure date.
 *
 * A passport is considered valid if it expires at least `validityMonths` months
 * after the departure date (today).
 */
function isValidForCountry(
  passportExpiry: string,
  countryCode: string,
  today: Date,
): boolean {
  const validityMonths = COUNTRY_VALIDITY_MONTHS[countryCode] ?? 6;
  const required = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + validityMonths, today.getUTCDate()),
  );
  const expiry = new Date(passportExpiry);
  const expiryUtc = new Date(
    Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate()),
  );
  return expiryUtc >= required;
}

function formatExpiryDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Document Validity card displayed on the ProfileScreen.
 *
 * Shows:
 * - Passport expiry date and days remaining
 * - Colour-coded status pill (PassportExpiryBadge)
 * - Per-country validity grid for all supported countries
 *
 * Returns null when `passportExpiry` is not available.
 */
export default function DocumentValidityCard({
  passportExpiry,
  today = new Date(),
  testID = 'document-validity-card',
}: DocumentValidityCardProps) {
  if (!passportExpiry) {
    return null;
  }

  const daysRemaining = computeDaysRemaining(passportExpiry, today);
  const status = computeExpiryStatus(daysRemaining);

  const daysLabel =
    daysRemaining < 0
      ? `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} ago`
      : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;

  return (
    <Card testID={testID}>
      {/* Section header */}
      <Text
        className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
        accessibilityRole="header"
      >
        Document Validity
      </Text>

      {/* Expiry date row */}
      <View
        className="flex-row items-center justify-between mb-3"
        accessible={true}
        accessibilityLabel={`Passport expires ${formatExpiryDate(passportExpiry)}, ${daysLabel}`}
      >
        <View>
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Passport Expires
          </Text>
          <Text
            className={`text-sm mt-1 ${
              status === 'expired'
                ? 'text-red-700 dark:text-red-400 font-medium'
                : status === 'expiring-soon'
                ? 'text-amber-700 dark:text-amber-400 font-medium'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {formatExpiryDate(passportExpiry)}
          </Text>
        </View>

        <PassportExpiryBadge
          expiryDate={passportExpiry}
          today={today}
          testID="expiry-badge"
        />
      </View>

      {/* Per-country validity grid */}
      <View
        className="mt-2"
        accessibilityLabel="Per-country passport validity"
        accessibilityRole="summary"
      >
        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Country Validity (today departure)
        </Text>

        <View className="flex-row flex-wrap">
          {SUPPORTED_COUNTRIES.map((country) => {
            const valid = isValidForCountry(passportExpiry, country.code, today);
            const countryLabel = `${country.name}: ${valid ? 'Valid' : 'Invalid'}`;

            return (
              <View
                key={country.code}
                testID={`country-validity-${country.code}`}
                className="w-1/2 flex-row items-center py-1.5 pr-2"
                accessible={true}
                accessibilityRole="text"
                accessibilityLabel={countryLabel}
              >
                {valid ? (
                  <CheckCircle
                    size={14}
                    color="#16a34a"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                ) : (
                  <XCircle
                    size={14}
                    color="#dc2626"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                )}
                <Text
                  className={`text-xs ml-1.5 ${valid ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}
                  accessible={false}
                >
                  {country.name}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
}
