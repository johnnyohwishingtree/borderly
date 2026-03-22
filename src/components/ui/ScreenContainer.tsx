import { View, ViewProps, Platform } from 'react-native';

export interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  /** Additional classes for the outer full-screen wrapper */
  className?: string;
  /** Max-width constraint class. Default: 'max-w-lg' (512px) */
  maxWidth?: string;
}

/**
 * Responsive screen wrapper. On mobile, this is a plain full-width container.
 * On web/tablet, it centers content with a max-width so forms and lists don't
 * stretch absurdly wide.
 *
 * Usage:
 *   <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
 *     <ScrollView>...</ScrollView>
 *   </ScreenContainer>
 */
export default function ScreenContainer({
  children,
  className = '',
  maxWidth = 'max-w-lg',
  ...viewProps
}: ScreenContainerProps) {
  // On native, skip the centering wrapper — it's always full-screen
  if (Platform.OS !== 'web') {
    return (
      <View className={`flex-1 ${className}`} {...viewProps}>
        {children}
      </View>
    );
  }

  return (
    <View className={`flex-1 ${className}`} {...viewProps}>
      <View className={`flex-1 w-full ${maxWidth} mx-auto`}>
        {children}
      </View>
    </View>
  );
}
