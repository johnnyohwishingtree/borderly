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
      ? 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700'
      : 'bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700',
  ].join(' ');

  const textClasses = [
    'font-medium',
    isSmall ? 'text-xs' : 'text-sm',
    isAuto ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300',
  ].join(' ');

  const dotClasses = [
    'rounded-full mr-1.5',
    isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2',
    isAuto ? 'bg-green-500 dark:bg-green-400' : 'bg-blue-500 dark:bg-blue-400',
  ].join(' ');

  const getLabel = () => {
    if (!showLabel) {return null;}

    return isAuto ? 'Auto-filled' : 'User entered';
  };

  const accessibilityDescription = isAuto
    ? 'Auto-filled from your passport profile'
    : 'Filled from your previous entries';

  return (
    <View
      className={containerClasses}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityDescription}
    >
      <View className={dotClasses} />
      {showLabel && (
        <Text className={textClasses} accessible={false}>
          {getLabel()}
        </Text>
      )}
    </View>
  );
}
