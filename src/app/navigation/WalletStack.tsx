import { lazy, Suspense } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingStates from '@/components/ui/LoadingStates';
import { WalletStackParamList } from './types';

const QRWalletScreen = lazy(() => import('@/screens/wallet').then(m => ({ default: m.QRWalletScreen })));
const QRDetailScreen = lazy(() => import('@/screens/wallet').then(m => ({ default: m.QRDetailScreen })));
const AddQRScreen = lazy(() => import('@/screens/wallet').then(m => ({ default: m.AddQRScreen })));

const ScreenLoader = () => (
  <LoadingStates state="loading" variant="spinner" size="medium" text="Loading..." fullScreen={false} />
);

const Stack = createNativeStackNavigator<WalletStackParamList>();

export default function WalletNavigator() {
  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <LoadingStates
          state="error"
          fullScreen={true}
          errorMessage="Failed to load wallet screens. Please try again."
          onRetry={resetError}
          showRetryButton={true}
        />
      )}
    >
      <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="QRWallet" options={{ title: 'QR Wallet' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><QRWalletScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="QRDetail" options={{ title: 'QR Details' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><QRDetailScreen /></Suspense>)}
        </Stack.Screen>
        <Stack.Screen name="AddQR" options={{ title: 'Add QR Code' }}>
          {() => (<Suspense fallback={<ScreenLoader />}><AddQRScreen /></Suspense>)}
        </Stack.Screen>
      </Stack.Navigator>
    </ErrorBoundary>
  );
}
