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
  THA: { name: 'Thailand', colors: ['#A51931', '#F4F5F8', '#2D2A4A'] },
  VNM: { name: 'Vietnam', colors: ['#DA251D', '#FFCD00'] },
  GBR: { name: 'United Kingdom', colors: ['#012169', '#C8102E', '#FFFFFF'] },
  USA: { name: 'United States', colors: ['#B22234', '#FFFFFF', '#3C3B6E'] },
  CAN: { name: 'Canada', colors: ['#FF0000', '#FFFFFF'] },
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
      case 'THA':
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
            {/* 5 horizontal stripes: red, white, blue (2x), white, red */}
            <View style={{ flex: 1, backgroundColor: '#A51931' }} />
            <View style={{ flex: 1, backgroundColor: '#F4F5F8' }} />
            <View style={{ flex: 2, backgroundColor: '#2D2A4A' }} />
            <View style={{ flex: 1, backgroundColor: '#F4F5F8' }} />
            <View style={{ flex: 1, backgroundColor: '#A51931' }} />
          </View>
        );
      case 'VNM':
        return (
          <View
            style={{
              width: flagSize.width,
              height: flagSize.height,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#DA251D',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ width: flagSize.height * 0.5, height: flagSize.height * 0.5, backgroundColor: '#FFCD00', transform: [{ rotate: '35deg' }] }} />
          </View>
        );
      case 'GBR':
        return (
          <View
            style={{
              width: flagSize.width,
              height: flagSize.height,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#012169',
            }}
          >
            {/* Simplified Union Jack — white + red cross */}
            <View style={{ position: 'absolute', top: flagSize.height / 2 - 2, left: 0, right: 0, height: 4, backgroundColor: '#FFFFFF' }} />
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: flagSize.width / 2 - 2, width: 4, backgroundColor: '#FFFFFF' }} />
            <View style={{ position: 'absolute', top: flagSize.height / 2 - 1, left: 0, right: 0, height: 2, backgroundColor: '#C8102E' }} />
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: flagSize.width / 2 - 1, width: 2, backgroundColor: '#C8102E' }} />
          </View>
        );
      case 'USA':
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
            {/* 13 alternating stripes */}
            {[...Array(13)].map((_, i) => (
              <View key={i} style={{ height: flagSize.height / 13, backgroundColor: i % 2 === 0 ? '#B22234' : '#FFFFFF' }} />
            ))}
            {/* Blue canton */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: flagSize.width * 0.4,
                height: (flagSize.height / 13) * 7,
                backgroundColor: '#3C3B6E',
              }}
            />
          </View>
        );
      case 'CAN':
        return (
          <View
            style={{
              width: flagSize.width,
              height: flagSize.height,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 2,
              overflow: 'hidden',
              flexDirection: 'row',
            }}
          >
            <View style={{ flex: 1, backgroundColor: '#FF0000' }} />
            <View style={{ flex: 2, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: flagSize.height * 0.5, color: '#FF0000' }}>🍁</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#FF0000' }} />
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
