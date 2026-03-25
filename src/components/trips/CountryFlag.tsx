import { View, Text, ViewProps } from 'react-native';
import { cssInterop } from 'react-native-css-interop';
import { getCountryByCode } from '../../constants/countries';

export interface CountryFlagProps extends ViewProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}


export default function CountryFlag({
  countryCode,
  size = 'medium',
  showName = false,
  className,
  ...viewProps
}: CountryFlagProps) {
  const country = getCountryByCode(countryCode);
  
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

  // Common base styles for all flags
  const baseFlagStyle = {
    width: flagSize.width,
    height: flagSize.height,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden' as const,
  };

  const renderFlag = () => {
    switch (countryCode) {
      case 'JPN':
        return (
          <View
            style={{
              ...baseFlagStyle,
              backgroundColor: '#FFF',
              justifyContent: 'center',
              alignItems: 'center',
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
              ...baseFlagStyle,
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
          <View style={baseFlagStyle}>
            <View style={{ flex: 1, backgroundColor: '#EE2436', justifyContent: 'center' }}>
               {/* Simplified white crescent and 5 stars */}
               <View style={{ marginLeft: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' }} />
            </View>
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
          </View>
        );
      case 'THA':
        return (
          <View style={baseFlagStyle}>
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
              ...baseFlagStyle,
              backgroundColor: '#DA251D',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: flagSize.height * 0.6, color: '#FFCD00' }}>⭐</Text>
          </View>
        );
      case 'GBR':
        return (
          <View
            style={{
              ...baseFlagStyle,
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
          <View style={baseFlagStyle}>
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
              ...baseFlagStyle,
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
      case 'AUS':
        return (
          <View
            style={{
              ...baseFlagStyle,
              backgroundColor: '#00008B',
            }}
          >
            {/* Union Jack canton (simplified) */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: flagSize.width * 0.5,
                height: flagSize.height * 0.5,
                backgroundColor: '#012169',
              }}
            >
              <View style={{ position: 'absolute', top: flagSize.height * 0.25 - 1, left: 0, right: 0, height: 2, backgroundColor: '#FFFFFF' }} />
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: flagSize.width * 0.25 - 1, width: 2, backgroundColor: '#FFFFFF' }} />
              <View style={{ position: 'absolute', top: flagSize.height * 0.25 - 0.5, left: 0, right: 0, height: 1, backgroundColor: '#C8102E' }} />
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: flagSize.width * 0.25 - 0.5, width: 1, backgroundColor: '#C8102E' }} />
            </View>
            {/* Commonwealth Star (below canton) */}
            <View style={{ position: 'absolute', bottom: flagSize.height * 0.1, left: flagSize.width * 0.18, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFFFFF' }} />
            {/* Southern Cross stars */}
            <View style={{ position: 'absolute', top: flagSize.height * 0.2, right: flagSize.width * 0.15, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFFFFF' }} />
            <View style={{ position: 'absolute', top: flagSize.height * 0.45, right: flagSize.width * 0.08, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFFFFF' }} />
            <View style={{ position: 'absolute', top: flagSize.height * 0.7, right: flagSize.width * 0.15, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFFFFF' }} />
            <View style={{ position: 'absolute', top: flagSize.height * 0.45, right: flagSize.width * 0.28, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFFFFF' }} />
          </View>
        );
      case 'NZL':
        return (
          <View
            style={{
              ...baseFlagStyle,
              backgroundColor: '#00247D',
            }}
          >
            {/* Union Jack canton (simplified) */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: flagSize.width * 0.5,
                height: flagSize.height * 0.5,
                backgroundColor: '#012169',
              }}
            >
              <View style={{ position: 'absolute', top: flagSize.height * 0.25 - 1, left: 0, right: 0, height: 2, backgroundColor: '#FFFFFF' }} />
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: flagSize.width * 0.25 - 1, width: 2, backgroundColor: '#FFFFFF' }} />
              <View style={{ position: 'absolute', top: flagSize.height * 0.25 - 0.5, left: 0, right: 0, height: 1, backgroundColor: '#C8102E' }} />
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: flagSize.width * 0.25 - 0.5, width: 1, backgroundColor: '#C8102E' }} />
            </View>
            {/* 4 red stars with white border (Southern Cross) */}
            <View style={{ position: 'absolute', top: flagSize.height * 0.15, right: flagSize.width * 0.2, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFFFFF' }}>
              <View style={{ position: 'absolute', top: 1, left: 1, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CC142B' }} />
            </View>
            <View style={{ position: 'absolute', top: flagSize.height * 0.4, right: flagSize.width * 0.08, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFFFFF' }}>
              <View style={{ position: 'absolute', top: 1, left: 1, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CC142B' }} />
            </View>
            <View style={{ position: 'absolute', top: flagSize.height * 0.65, right: flagSize.width * 0.15, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFFFFF' }}>
              <View style={{ position: 'absolute', top: 1, left: 1, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CC142B' }} />
            </View>
            <View style={{ position: 'absolute', top: flagSize.height * 0.35, right: flagSize.width * 0.3, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFFFFF' }}>
              <View style={{ position: 'absolute', top: 1, left: 1, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CC142B' }} />
            </View>
          </View>
        );
      case 'KOR':
        return (
          <View
            style={{
              ...baseFlagStyle,
              backgroundColor: '#FFFFFF',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Taegeuk (yin-yang) — simplified as two half-circles */}
            <View style={{ width: flagSize.height * 0.5, height: flagSize.height * 0.5, borderRadius: flagSize.height * 0.25, overflow: 'hidden', flexDirection: 'row' }}>
              <View style={{ flex: 1, backgroundColor: '#CD2E3A' }} />
              <View style={{ flex: 1, backgroundColor: '#003478' }} />
            </View>
          </View>
        );
      case 'IND':
        return (
          <View style={baseFlagStyle}>
            {/* Three horizontal stripes: saffron, white, green */}
            <View style={{ flex: 1, backgroundColor: '#FF9933' }} />
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
              {/* Simplified Ashoka Chakra */}
              <View style={{ width: flagSize.height * 0.25, height: flagSize.height * 0.25, borderRadius: flagSize.height * 0.125, borderWidth: 1, borderColor: '#000080' }} />
            </View>
            <View style={{ flex: 1, backgroundColor: '#138808' }} />
          </View>
        );
      case 'IDN':
        return (
          <View style={baseFlagStyle}>
            {/* Two horizontal stripes: red on top, white on bottom */}
            <View style={{ flex: 1, backgroundColor: '#FF0000' }} />
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
          </View>
        );
      case 'PHL':
        return (
          <View style={{ ...baseFlagStyle, flexDirection: 'row' }}>
            {/* White triangle on left with sun */}
            <View style={{ width: flagSize.width * 0.35, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: flagSize.height * 0.25, height: flagSize.height * 0.25, borderRadius: flagSize.height * 0.125, backgroundColor: '#FCD116' }} />
            </View>
            {/* Two horizontal stripes: blue on top, red on bottom */}
            <View style={{ flex: 1 }}>
              <View style={{ flex: 1, backgroundColor: '#0038A8' }} />
              <View style={{ flex: 1, backgroundColor: '#CE1126' }} />
            </View>
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
          {country.fullName}
        </Text>
      )}
    </View>
  );
}

cssInterop(CountryFlag, { className: true });
