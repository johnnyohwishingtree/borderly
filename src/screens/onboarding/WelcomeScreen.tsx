import { View, Text } from 'react-native';

export default function WelcomeScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="text-2xl font-bold text-gray-900">Welcome</Text>
      <Text className="text-base text-gray-600 mt-2">Start your journey with Borderly</Text>
    </View>
  );
}