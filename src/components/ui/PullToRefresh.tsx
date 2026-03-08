import React, { ReactNode } from 'react';
import { RefreshControl, ScrollView, FlatList, SectionList } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';

export interface PullToRefreshProps {
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
  containerComponent?: 'ScrollView' | 'FlatList' | 'SectionList';
  // Pass through props for FlatList/SectionList
  [key: string]: any;
}

export default function PullToRefresh({
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
  containerComponent = 'ScrollView',
  ...containerProps
}: PullToRefreshProps) {
  
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

  // Render based on container type
  switch (containerComponent) {
    case 'FlatList':
      return (
        <FlatList
          {...containerProps}
          refreshControl={refreshControl}
        />
      );
      
    case 'SectionList':
      return (
        <SectionList
          {...containerProps}
          refreshControl={refreshControl}
        />
      );
      
    case 'ScrollView':
    default:
      return (
        <ScrollView
          {...containerProps}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      );
  }
}

// Convenience wrapper components
export function PullToRefreshScrollView(props: Omit<PullToRefreshProps, 'containerComponent'>) {
  return <PullToRefresh {...props} containerComponent="ScrollView" />;
}

export function PullToRefreshFlatList(props: Omit<PullToRefreshProps, 'containerComponent'>) {
  return <PullToRefresh {...props} containerComponent="FlatList" />;
}

export function PullToRefreshSectionList(props: Omit<PullToRefreshProps, 'containerComponent'>) {
  return <PullToRefresh {...props} containerComponent="SectionList" />;
}