import { View, Text, ViewProps } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { cssInterop } from 'react-native-css-interop';
import { getCountryByCode } from '../../constants/countries';
import { FLAG_SVG } from './flagData';

export interface CountryFlagProps extends ViewProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}


/** Map ISO 3166-1 alpha-3 (our format) to alpha-2 (for flag lookup) */
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  JPN: 'JP', MYS: 'MY', SGP: 'SG', THA: 'TH', VNM: 'VN',
  GBR: 'GB', USA: 'US', CAN: 'CA', AUS: 'AU', NZL: 'NZ',
  KOR: 'KR', IND: 'IN', IDN: 'ID', PHL: 'PH',
};

/**
 * CountryFlag — renders real country flags using bundled SVGs.
 *
 * Uses SVGs from country-flag-icons, rendered via react-native-svg's
 * SvgXml. No network needed, no emoji, works on all devices.
 */
export default function CountryFlag({
  countryCode,
  size = 'medium',
  showName = false,
  className,
  ...viewProps
}: CountryFlagProps) {
  const country = getCountryByCode(countryCode);
  const alpha2 = ALPHA3_TO_ALPHA2[countryCode];
  const svg = alpha2 ? FLAG_SVG[alpha2] : null;

  const flagSize = { small: { w: 24, h: 16 }, medium: { w: 32, h: 22 }, large: { w: 48, h: 32 } }[size];

  if (!country || !svg) {
    return (
      <View className={`flex-row items-center ${className || ''}`} {...viewProps}>
        <View className="w-8 h-5 bg-gray-200 rounded justify-center items-center">
          <Text className="text-[8px] text-gray-500">??</Text>
        </View>
        {showName && (
          <Text className="ml-2 text-sm font-medium text-gray-700">Unknown</Text>
        )}
      </View>
    );
  }

  return (
    <View className={`flex-row items-center ${className || ''}`} {...viewProps}>
      <View
        style={{ width: flagSize.w, height: flagSize.h, borderRadius: 2, overflow: 'hidden', borderWidth: 0.5, borderColor: '#E5E7EB' }}
        accessibilityLabel={`${country.fullName} flag`}
      >
        <SvgXml xml={svg} width={flagSize.w} height={flagSize.h} />
      </View>
      {showName && (
        <Text className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {country.fullName}
        </Text>
      )}
    </View>
  );
}

cssInterop(CountryFlag, { className: true });
