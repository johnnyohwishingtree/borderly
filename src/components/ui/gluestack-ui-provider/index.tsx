import React from 'react';
import { View, ViewProps, ColorSchemeName, useColorScheme } from 'react-native';

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

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colorMode === 'dark' ? '#000' : '#fff',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
