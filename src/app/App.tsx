// import './global.css'; // Temporarily disabled for build testing

import React from 'react';
import { StatusBar } from 'react-native';

import RootNavigator from './navigation/RootNavigator';

function App(): React.JSX.Element {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <RootNavigator />
    </>
  );
}

export default App;
