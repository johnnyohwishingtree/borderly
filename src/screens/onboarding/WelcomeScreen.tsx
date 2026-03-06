import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Card } from '../../components/ui';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  const handleContinue = () => {
    navigation.navigate('PassportScan');
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="flex-1 justify-center px-6 py-12">
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-gray-900 text-center mb-2">
            Welcome to Borderly
          </Text>
          <Text className="text-lg text-gray-600 text-center">
            Your universal travel declaration companion
          </Text>
        </View>

        <Card variant="elevated" className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Fill Once, Travel Everywhere
          </Text>
          <Text className="text-base text-gray-700 mb-4">
            Store your travel profile securely on your device and auto-generate customs forms for any destination.
          </Text>

          <View className="space-y-3">
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-blue-600 rounded-full mr-3" />
              <Text className="text-gray-700">Passport data stays on your device</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-blue-600 rounded-full mr-3" />
              <Text className="text-gray-700">No server stores your personal info</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-blue-600 rounded-full mr-3" />
              <Text className="text-gray-700">Works offline and secure</Text>
            </View>
          </View>
        </Card>

        <Card variant="outlined" className="mb-8">
          <Text className="text-base font-medium text-gray-900 mb-2">
            Privacy First
          </Text>
          <Text className="text-sm text-gray-600">
            Your passport data is encrypted and stored only in your device's secure keychain.
            We never transmit your personal information to our servers.
          </Text>
        </Card>

        <View className="space-y-4">
          <Button
            title="Get Started"
            onPress={handleContinue}
            size="large"
            fullWidth
          />
        </View>
      </View>
    </ScrollView>
  );
}
