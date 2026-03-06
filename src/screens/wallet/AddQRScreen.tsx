import { View, Text } from 'react-native';

export default function AddQRScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="text-2xl font-bold text-gray-900">Add QR Code</Text>
      <Text className="text-base text-gray-600 mt-2">Add a new QR code to your wallet</Text>
    </View>
  );
}
