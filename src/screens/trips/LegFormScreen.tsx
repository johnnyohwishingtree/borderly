import React from 'react';
import { View, Text } from 'react-native';

export default function LegFormScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="text-2xl font-bold text-gray-900">Trip Leg Form</Text>
      <Text className="text-base text-gray-600 mt-2">Fill out your travel details</Text>
    </View>
  );
}