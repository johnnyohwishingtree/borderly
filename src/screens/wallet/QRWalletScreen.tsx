import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { EmptyState } from '../../components/ui';

export default function QRWalletScreen() {
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading QR codes
    setTimeout(() => {
      setQrCodes([]); // Empty for now - will be populated when QR functionality is implemented
      setIsLoading(false);
    }, 1000);
  }, []);

  if (qrCodes.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">QR Wallet</Text>
          <Text className="text-base text-gray-600 mt-1">
            Your saved entry codes
          </Text>
        </View>

        <EmptyState
          icon={<Text className="text-4xl">📱</Text>}
          title="No QR codes saved"
          description="Complete trip submissions to collect QR codes for faster border crossings"
          variant="illustration"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">QR Wallet</Text>
        <Text className="text-base text-gray-600 mt-1">
          {qrCodes.length} saved code{qrCodes.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* QR Code list will be implemented here */}
    </View>
  );
}
