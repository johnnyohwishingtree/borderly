import { View, Text, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { OnboardingStackParamList } from '../../app/navigation/types';
import { HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { Button, Card, ProgressBar } from '../../components/ui';
import CountryFlag from '../../components/trips/CountryFlag';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  const handleContinue = () => {
    navigation.navigate('PassportScan');
  };

  const { height } = Dimensions?.get?.('window') ?? { height: 800 };

  return (
    <ScrollView 
      className="flex-1 bg-gradient-to-b from-blue-50 to-white"
      accessibilityLabel="Welcome to Borderly screen"
      accessibilityHint="Swipe up to read about features and get started"
    >
      <View className="flex-1 px-6 pt-16 pb-12" style={{ minHeight: height * 0.9 }}>
        {/* Progress indicator */}
        <ProgressBar 
          progress={25} 
          className="mb-8" 
          accessibilityLabel="Setup progress: Step 1 of 4"
        />
        
        {/* Hero section */}
        <View className="items-center mb-12" accessibilityRole="header">
          {/* App icon placeholder - would be replaced with actual app icon */}
          <View 
            className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl items-center justify-center mb-6 shadow-lg"
            accessibilityLabel="Borderly app icon"
            accessibilityRole="image"
          >
            <View className="w-12 h-12 bg-white rounded-full items-center justify-center">
              <MaterialIcons name="public" size={24} color="#2563eb" />
            </View>
          </View>
          
          <Text 
            className="text-4xl font-bold text-gray-900 text-center mb-3"
            accessibilityRole="header"
          >
            Welcome to
          </Text>
          <Text 
            className="text-4xl font-bold text-blue-600 text-center mb-4"
            accessibilityRole="header"
          >
            Borderly
          </Text>
          <Text 
            className="text-lg text-gray-600 text-center max-w-sm"
            accessibilityLabel="Your universal travel declaration companion. Fill once, travel everywhere."
          >
            Your universal travel declaration companion. Fill once, travel everywhere.
          </Text>
        </View>

        {/* Features section */}
        <Card variant="elevated" className="mb-8 bg-white shadow-xl border-0">
          <View className="bg-gradient-to-r from-blue-500 to-blue-600 -m-6 mb-4 p-6 rounded-t-xl">
            <View className="flex-row items-center mb-2">
              <Ionicons name="airplane" size={20} color="white" style={{ marginRight: 8 }} />
              <Text className="text-xl font-bold text-white">
                Fill Once, Travel Everywhere
              </Text>
            </View>
            <Text className="text-blue-100">
              Store your travel profile securely and auto-generate customs forms for any destination.
            </Text>
          </View>

          <View className="space-y-4 px-1">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-4">
                <MaterialIcons name="lock" size={20} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Private & Secure</Text>
                <Text className="text-gray-600 text-sm">Data stays on your device</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-4">
                <MaterialIcons name="smartphone" size={20} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Works Offline</Text>
                <Text className="text-gray-600 text-sm">No internet required</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-4">
                <MaterialIcons name="flash-on" size={20} color="#9333ea" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Lightning Fast</Text>
                <Text className="text-gray-600 text-sm">Fill forms in seconds</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Countries supported section */}
        <Card variant="outlined" className="mb-8 border-2 border-blue-100 bg-blue-50/50">
          <View className="flex-row items-center mb-3">
            <MaterialIcons name="public" size={20} color="#374151" style={{ marginRight: 8 }} />
            <Text className="text-lg font-semibold text-gray-900">
              Supported Countries
            </Text>
          </View>
          <Text className="text-sm text-gray-600 mb-4">
            Currently supporting the Asia travel corridor with more countries coming soon:
          </Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <CountryFlag countryCode="JPN" size="medium" className="mb-1" />
              <Text className="text-xs text-gray-600">Japan</Text>
            </View>
            <View className="items-center">
              <CountryFlag countryCode="MYS" size="medium" className="mb-1" />
              <Text className="text-xs text-gray-600">Malaysia</Text>
            </View>
            <View className="items-center">
              <CountryFlag countryCode="SGP" size="medium" className="mb-1" />
              <Text className="text-xs text-gray-600">Singapore</Text>
            </View>
          </View>
        </Card>

        {/* Privacy notice */}
        <Card variant="outlined" className="mb-8 border-green-200 bg-green-50/50">
          <View className="flex-row items-start">
            <MaterialIcons name="security" size={24} color="#16a34a" style={{ marginRight: 12 }} />
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 mb-2">
                Privacy First
              </Text>
              <Text className="text-sm text-gray-600">
                Your passport data is encrypted and stored only in your device's secure keychain.
                We never transmit your personal information to our servers.
              </Text>
            </View>
          </View>
        </Card>

        {/* CTA section */}
        <View className="space-y-4 mt-auto">
          <Button
            title="Get Started"
            onPress={handleContinue}
            size="large"
            fullWidth
            accessibilityLabel="Get started with Borderly"
            accessibilityHint="Navigate to passport scanning screen to begin setup"
            hapticType={HapticFeedbackTypes.impactMedium}
          />
          <Text className="text-center text-sm text-gray-500">
            Takes less than 2 minutes to set up
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
