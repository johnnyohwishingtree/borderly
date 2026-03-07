import React from 'react';
import { StatusBar } from 'react-native';

import RootNavigator from './navigation/RootNavigator';
import { ErrorBoundary } from '../components/ui';

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <RootNavigator />
    </ErrorBoundary>
  );
}

export default App;
