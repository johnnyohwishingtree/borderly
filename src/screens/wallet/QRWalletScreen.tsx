import { View, Text } from 'react-native';

export default function QRWalletScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="text-2xl font-bold text-gray-900">QR Wallet</Text>
      <Text className="text-base text-gray-600 mt-2">Your stored QR codes</Text>
    </View>
  );
}
