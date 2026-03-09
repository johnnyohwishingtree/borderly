import { View, Text, ViewProps } from 'react-native';
import { cssInterop } from 'react-native-css-interop';

export interface CountryFlagProps extends ViewProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}

const COUNTRY_FLAGS = {
  JPN: { name: 'Japan', colors: ['#FFFFFF', '#E60012'] },
  MYS: { name: 'Malaysia', colors: ['#CE1126', '#FFFFFF', '#010E96', '#FFCC00'] },
  SGP: { name: 'Singapore', colors: ['#EE2436', '#FFFFFF'] },
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

  const sizeMap = {
    small: { width: 24, height: 16 },
    medium: { width: 32, height: 22 },
    large: { width: 48, height: 32 },
  };

  const flagSize = sizeMap[size];

  const renderFlag = () => {
    switch (countryCode) {
      case 'JPN':
        return (
          <View
            style={{
              width: flagSize.width,
              height: flagSize.height,
              backgroundColor: '#FFF',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 2,
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: flagSize.height * 0.6,
                height: flagSize.height * 0.6,
                backgroundColor: '#E60012',
                borderRadius: flagSize.height * 0.3,
              }}
            />
          </View>
        );
      case 'MYS':
        return (
          <View
            style={{
              width: flagSize.width,
              height: flagSize.height,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#FFF',
            }}
          >
            {/* 14 alternating stripes */}
            {[...Array(14)].map((_, i) => (
              <View 
                key={i} 
                style={{ 
                  height: flagSize.height / 14, 
                  backgroundColor: i % 2 === 0 ? '#CE1126' : '#FFFFFF' 
                }} 
              />
            ))}
            {/* Blue canton */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: flagSize.width * 0.5,
                height: (flagSize.height / 14) * 8,
                backgroundColor: '#010E96',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {/* Simplified yellow crescent and star */}
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFCC00' }} />
            </View>
          </View>
        );
      case 'SGP':
        return (
          <View
            style={{
              width: flagSize.width,
              height: flagSize.height,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <View style={{ flex: 1, backgroundColor: '#EE2436', justifyContent: 'center' }}>
               {/* Simplified white crescent and 5 stars */}
               <View style={{ marginLeft: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' }} />
            </View>
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
          </View>
        );
    }
    
    return null;
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

cssInterop(CountryFlag, { className: true });
