import { ReactNode } from 'react';
import { RefreshControl, ScrollView, ScrollViewProps, FlatListProps, FlatList } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';
import { colors } from '../../utils/colors';

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
  colors: refreshColors = [colors.blue[500]],
  tintColor = colors.blue[500],
  title,
  titleColor = colors.gray[600],
  enabled = true,
  progressViewOffset,
  progressBackgroundColor = colors.white,
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
      colors={refreshColors}
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
  colors: refreshColors = [colors.blue[500]],
  tintColor = colors.blue[500],
  title,
  titleColor = colors.gray[600],
  enabled = true,
  progressViewOffset,
  progressBackgroundColor = colors.white,
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
      colors={refreshColors}
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