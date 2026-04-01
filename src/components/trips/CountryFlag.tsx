import { View, Text, ViewProps } from 'react-native';
import { cssInterop } from 'react-native-css-interop';
import { getCountryByCode } from '../../constants/countries';

export interface CountryFlagProps extends ViewProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}

/**
 * Convert ISO 3166-1 alpha-2 code to flag emoji.
 * Regional indicator symbols (U+1F1E6..U+1F1FF) combine into flag emoji
 * on all iOS versions. This is NOT a regular emoji — it's a platform-native
 * flag image rendered by the OS.
 */
function isoToFlagEmoji(iso2: string): string {
  return [...iso2.toUpperCase()]
    .map(c => String.fromCodePoint(0x1f1e5 + c.charCodeAt(0) - 64))
    .join('');
}

/** Map ISO 3166-1 alpha-3 (our format) to alpha-2 (for flag emoji) */
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  JPN: 'JP', MYS: 'MY', SGP: 'SG', THA: 'TH', VNM: 'VN',
  GBR: 'GB', USA: 'US', CAN: 'CA', AUS: 'AU', NZL: 'NZ',
  KOR: 'KR', IND: 'IN', IDN: 'ID', PHL: 'PH',
};

export default function CountryFlag({
  countryCode,
  size = 'medium',
  showName = false,
  className,
  ...viewProps
}: CountryFlagProps) {
  const country = getCountryByCode(countryCode);
  const alpha2 = ALPHA3_TO_ALPHA2[countryCode];
  const flag = alpha2 ? isoToFlagEmoji(alpha2) : null;

  const fontSize = { small: 16, medium: 22, large: 32 }[size];

  if (!country || !flag) {
    return (
      <View className={`flex-row items-center ${className || ''}`} {...viewProps}>
        <View className="w-8 h-5 bg-gray-200 rounded justify-center items-center">
          <Text className="text-[8px] text-gray-500">??</Text>
        </View>
        {showName && (
          <Text className="ml-2 text-sm font-medium text-gray-700">
            Unknown
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className={`flex-row items-center ${className || ''}`} {...viewProps}>
      <Text style={{ fontSize }} accessibilityLabel={`${country.fullName} flag`}>
        {flag}
      </Text>
      {showName && (
        <Text className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {country.fullName}
        </Text>
      )}
    </View>
  );
}

cssInterop(CountryFlag, { className: true });
