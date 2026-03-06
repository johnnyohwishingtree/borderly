import React from 'react';
import { View, Text } from 'react-native';

interface AutoFilledBadgeProps {
  source: 'auto' | 'user' | 'default' | 'empty';
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

export default function AutoFilledBadge({
  source,
  size = 'small',
  showLabel = true,
}: AutoFilledBadgeProps) {
  if (source === 'empty' || source === 'default') {
    return null; // Don't show badge for empty/default fields
  }

  const isSmall = size === 'small';
  const isAuto = source === 'auto';

  const containerClasses = [
    'flex-row items-center rounded-full px-2 py-1',
    isSmall ? 'px-2 py-1' : 'px-3 py-1.5',
    isAuto 
      ? 'bg-green-50 border border-green-200' 
      : 'bg-blue-50 border border-blue-200'
  ].join(' ');

  const textClasses = [
    'font-medium',
    isSmall ? 'text-xs' : 'text-sm',
    isAuto ? 'text-green-700' : 'text-blue-700'
  ].join(' ');

  const dotClasses = [
    'rounded-full mr-1.5',
    isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2',
    isAuto ? 'bg-green-500' : 'bg-blue-500'
  ].join(' ');

  const getLabel = () => {
    if (!showLabel) return null;
    
    return isAuto ? 'Auto-filled' : 'User entered';
  };

  return (
    <View className={containerClasses}>
      <View className={dotClasses} />
      {showLabel && (
        <Text className={textClasses}>
          {getLabel()}
        </Text>
      )}
    </View>
  );
}