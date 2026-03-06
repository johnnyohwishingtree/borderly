import './global.css';

import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  Text,
  View,
} from 'react-native';

function App(): React.JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View className="flex-1 justify-center items-center">
        <Text className="text-2xl font-bold text-gray-900">
          Welcome to Borderly
        </Text>
        <Text className="text-base text-gray-600 mt-2 text-center px-4">
          Your universal travel declaration app
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default App;
