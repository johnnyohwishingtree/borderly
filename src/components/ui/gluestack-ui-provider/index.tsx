import React, { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import { useColorScheme } from 'nativewind';

interface GluestackUIProviderProps extends ViewProps {
  mode?: 'light' | 'dark' | 'system';
  children: React.ReactNode;
}

export function GluestackUIProvider({
  mode = 'light',
  children,
  style,
  ...props
}: GluestackUIProviderProps) {
  const { setColorScheme } = useColorScheme();

  // Sync app theme preference → NativeWind color scheme
  useEffect(() => {
    setColorScheme(mode === 'system' ? 'system' : mode);
  }, [mode, setColorScheme]);

  return (
    <View
      style={[{ flex: 1 }, style]}
      {...props}
    >
      {children}
    </View>
  );
}
