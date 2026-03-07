import { View, Text, ViewProps } from 'react-native';

export interface CountryFlagProps extends ViewProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}

const COUNTRY_FLAGS = {
  JPN: { flag: '🇯🇵', name: 'Japan' },
  MYS: { flag: '🇲🇾', name: 'Malaysia' },
  SGP: { flag: '🇸🇬', name: 'Singapore' },
} as const;

export default function CountryFlag({
  countryCode,
  size = 'medium',
  showName = false,
  className,
  ...viewProps
}: CountryFlagProps) {
  const country = COUNTRY_FLAGS[countryCode as keyof typeof COUNTRY_FLAGS];
  
  if (!country) {
    return null;
  }

  const sizeStyles = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-3xl',
  };

  return (
    <View className={`flex-row items-center ${className || ''}`} {...viewProps}>
      <Text className={sizeStyles[size]}>{country.flag}</Text>
      {showName && (
        <Text className="ml-2 text-sm font-medium text-gray-700">
          {country.name}
        </Text>
      )}
    </View>
  );
}