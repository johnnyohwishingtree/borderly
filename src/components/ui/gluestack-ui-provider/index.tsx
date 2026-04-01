import React from 'react';
import { View, ViewProps, useColorScheme } from 'react-native';

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
  const systemColorScheme = useColorScheme();
  const colorMode = mode === 'system' ? systemColorScheme : mode;

  const isDark = colorMode === 'dark';

  return (
    <View
      className={isDark ? 'dark' : ''}
      style={[{ flex: 1 }, style]}
      {...props}
    >
      {children}
    </View>
  );
}
