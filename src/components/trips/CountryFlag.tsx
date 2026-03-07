import { View, Text, ViewProps } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export interface CountryFlagProps extends ViewProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}

const COUNTRY_FLAGS = {
  JPN: { name: 'Japan', colors: ['#FFFFFF', '#E60012'] }, // White and red
  MYS: { name: 'Malaysia', colors: ['#CE1126', '#FFFFFF', '#010E96', '#FFCC00'] }, // Red, white, blue, yellow  
  SGP: { name: 'Singapore', colors: ['#EE2436', '#FFFFFF'] }, // Red and white
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
    return (
      <View className={`flex-row items-center ${className || ''}`} {...viewProps}>
        <MaterialIcons name="flag" size={24} color="#666" />
        {showName && (
          <Text className="ml-2 text-sm font-medium text-gray-700">
            Unknown
          </Text>
        )}
      </View>
    );
  }

  const sizeMap = {
    small: { width: 24, height: 16 },
    medium: { width: 32, height: 22 },
    large: { width: 48, height: 32 },
  };

  const flagSize = sizeMap[size];

  // Create simple flag representation with country colors
  const renderFlag = () => {
    switch (countryCode) {
      case 'JPN':
        // Japan: White background with red circle
        return (
          <View
            style={{
              width: flagSize.width,
              height: flagSize.height,
              backgroundColor: country.colors[0],
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 2,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: flagSize.width * 0.6,
                height: flagSize.width * 0.6,
                backgroundColor: country.colors[1],
                borderRadius: flagSize.width * 0.3,
              }}
            />
          </View>
        );
      case 'MYS':
        // Malaysia: Red and white stripes
        return (
          <View
            style={{
              width: flagSize.width,
              height: flagSize.height,
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 2,
              flexDirection: 'column',
            }}
          >
            <View style={{ flex: 1, backgroundColor: country.colors[0] }} />
            <View style={{ flex: 1, backgroundColor: country.colors[1] }} />
          </View>
        );
      case 'SGP':
        // Singapore: Red and white horizontal stripes
        return (
          <View
            style={{
              width: flagSize.width,
              height: flagSize.height,
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 2,
              flexDirection: 'column',
            }}
          >
            <View style={{ flex: 1, backgroundColor: country.colors[0] }} />
            <View style={{ flex: 1, backgroundColor: country.colors[1] }} />
          </View>
        );
      default:
        return (
          <View
            style={{
              width: flagSize.width,
              height: flagSize.height,
              backgroundColor: '#f3f4f6',
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 2,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcons name="flag" size={flagSize.width * 0.6} color="#666" />
          </View>
        );
    }
  };

  return (
    <View className={`flex-row items-center ${className || ''}`} {...viewProps}>
      {renderFlag()}
      {showName && (
        <Text className="ml-2 text-sm font-medium text-gray-700">
          {country.name}
        </Text>
      )}
    </View>
  );
}