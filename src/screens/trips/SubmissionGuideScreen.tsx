import React from 'react';
import { View, Text } from 'react-native';

export default function SubmissionGuideScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="text-2xl font-bold text-gray-900">Submission Guide</Text>
      <Text className="text-base text-gray-600 mt-2">Follow the step-by-step guide</Text>
    </View>
  );
}