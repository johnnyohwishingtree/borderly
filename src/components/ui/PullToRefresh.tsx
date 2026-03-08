import { ReactNode } from 'react';
import { RefreshControl, ScrollView, ScrollViewProps, FlatListProps, FlatList } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';

export interface PullToRefreshScrollViewProps extends Omit<ScrollViewProps, 'refreshControl'> {
  children: ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  colors?: string[];
  tintColor?: string;
  title?: string;
  titleColor?: string;
  enabled?: boolean;
  progressViewOffset?: number;
  progressBackgroundColor?: string;
  size?: 'default' | 'large';
  hapticFeedback?: boolean;
}

export interface PullToRefreshFlatListProps extends Omit<FlatListProps<any>, 'refreshControl'> {
  refreshing: boolean;
  onRefresh: () => void;
  colors?: string[];
  tintColor?: string;
  title?: string;
  titleColor?: string;
  enabled?: boolean;
  progressViewOffset?: number;
  progressBackgroundColor?: string;
  size?: 'default' | 'large';
  hapticFeedback?: boolean;
}

export function PullToRefreshScrollView({
  children,
  refreshing,
  onRefresh,
  colors = ['#3B82F6'],
  tintColor = '#3B82F6',
  title,
  titleColor = '#666666',
  enabled = true,
  progressViewOffset,
  progressBackgroundColor = '#ffffff',
  size = 'default',
  hapticFeedback = true,
  ...scrollViewProps
}: PullToRefreshScrollViewProps) {
  
  const handleRefresh = () => {
    if (hapticFeedback) {
      trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }
    onRefresh();
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={colors}
      tintColor={tintColor}
      title={title}
      titleColor={titleColor}
      enabled={enabled}
      progressViewOffset={progressViewOffset}
      progressBackgroundColor={progressBackgroundColor}
      size={size}
    />
  );

  return (
    <ScrollView
      {...scrollViewProps}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function PullToRefreshFlatList({
  refreshing,
  onRefresh,
  colors = ['#3B82F6'],
  tintColor = '#3B82F6',
  title,
  titleColor = '#666666',
  enabled = true,
  progressViewOffset,
  progressBackgroundColor = '#ffffff',
  size = 'default',
  hapticFeedback = true,
  ...flatListProps
}: PullToRefreshFlatListProps) {
  
  const handleRefresh = () => {
    if (hapticFeedback) {
      trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }
    onRefresh();
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={colors}
      tintColor={tintColor}
      title={title}
      titleColor={titleColor}
      enabled={enabled}
      progressViewOffset={progressViewOffset}
      progressBackgroundColor={progressBackgroundColor}
      size={size}
    />
  );

  return (
    <FlatList
      {...flatListProps}
      refreshControl={refreshControl}
    />
  );
}

// Export default for backwards compatibility
export default PullToRefreshScrollView;