import React from 'react';
import { ScrollView, View, Text, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { 
  Globe, 
  Plane, 
  Lock, 
  Smartphone, 
  Zap, 
  ShieldCheck, 
  HelpCircle 
} from 'lucide-react-native';

import { OnboardingStackParamList } from '../../app/navigation/types';
import { Button } from '../../components/ui/gluestack/button';
import { Card } from '../../components/ui/gluestack/card';
import { Icon } from '../../components/ui/gluestack/icon';
import { ProgressBar } from '../../components/ui';
import CountryFlag from '../../components/trips/CountryFlag';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  const handleTutorial = () => {
    navigation.navigate('Tutorial');
  };

  const handleSkipTutorial = () => {
    navigation.navigate('PassportScan');
  };

  const { height } = Dimensions.get('window');

  return (
    <ScrollView 
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ minHeight: height }}
    >
      <View className="flex-1 px-6 pt-16 pb-12">
        {/* Progress indicator */}
        <ProgressBar 
          progress={25} 
          className="mb-8" 
        />
        
        {/* Hero section */}
        <View className="items-center mb-12">
          <View 
            className="w-24 h-24 bg-primary-600 rounded-3xl items-center justify-center mb-6 shadow-lg"
          >
            <Icon as={Globe} size={40} color="white" />
          </View>
          
          <Text className="text-4xl font-bold text-gray-900 text-center mb-2">
            Welcome to
          </Text>
          <Text className="text-4xl font-bold text-primary-600 text-center mb-4">
            Borderly
          </Text>
          <Text className="text-lg text-gray-600 text-center max-w-sm">
            Your universal travel declaration companion. Fill once, travel everywhere.
          </Text>
        </View>

        {/* Features section */}
        <Card variant="elevated" className="mb-8 p-0 overflow-hidden">
          <View className="bg-primary-600 p-6">
            <View className="flex-row items-center mb-2">
              <Icon as={Plane} size={20} color="white" className="mr-2" />
              <Text className="text-xl font-bold text-white">
                Fill Once, Travel Everywhere
              </Text>
            </View>
            <Text className="text-blue-100">
              Store your travel profile securely and auto-generate customs forms for any destination.
            </Text>
          </View>

          <View className="p-6 space-y-6">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-4">
                <Icon as={Lock} size={20} color="#16a34a" />
              </View>
              <View>
                <Text className="text-gray-900 font-semibold">Private & Secure</Text>
                <Text className="text-gray-600 text-sm">Data stays on your device</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-4">
                <Icon as={Smartphone} size={20} color="#2563eb" />
              </View>
              <View>
                <Text className="text-gray-900 font-semibold">Works Offline</Text>
                <Text className="text-gray-600 text-sm">No internet required</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-4">
                <Icon as={Zap} size={20} color="#9333ea" />
              </View>
              <View>
                <Text className="text-gray-900 font-semibold">Lightning Fast</Text>
                <Text className="text-gray-600 text-sm">Fill forms in seconds</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Countries supported section */}
        <Card variant="outlined" className="mb-8 bg-blue-50/30 border-blue-100">
          <View className="flex-row items-center mb-4">
            <Icon as={Globe} size={20} color="#374151" className="mr-2" />
            <Text className="text-lg font-semibold text-gray-900">
              Supported Countries
            </Text>
          </View>
          <View className="flex-row justify-around">
            <View className="items-center">
              <CountryFlag countryCode="JPN" size="medium" className="mb-2" />
              <Text className="text-xs text-gray-600">Japan</Text>
            </View>
            <View className="items-center">
              <CountryFlag countryCode="MYS" size="medium" className="mb-2" />
              <Text className="text-xs text-gray-600">Malaysia</Text>
            </View>
            <View className="items-center">
              <CountryFlag countryCode="SGP" size="medium" className="mb-2" />
              <Text className="text-xs text-gray-600">Singapore</Text>
            </View>
          </View>
        </Card>

        {/* Privacy notice */}
        <Card variant="outlined" className="mb-8 border-green-200 bg-green-50/30">
          <View className="flex-row items-start">
            <Icon as={ShieldCheck} size={24} color="#16a34a" className="mr-3" />
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 mb-1">
                Privacy First
              </Text>
              <Text className="text-sm text-gray-600 leading-5">
                Your passport data is encrypted and stored only in your device's secure keychain.
              </Text>
            </View>
          </View>
        </Card>

        {/* CTA section */}
        <View className="mt-auto pt-4">
          <Button
            title="Take Quick Tutorial"
            onPress={handleTutorial}
            size="lg"
            className="mb-4"
          />
          
          <View className="flex-row items-center justify-center">
            <Button
              title="Skip Tutorial"
              onPress={handleSkipTutorial}
              variant="outline"
              size="md"
              className="border-0"
            />
            <Icon as={HelpCircle} size={18} color="#9ca3af" className="ml-1" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
