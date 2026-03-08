import { View, DimensionValue } from 'react-native';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
}

export function SkeletonLine({
  width = '100%',
  height = 16,
  variant = 'text',
  className = '',
}: SkeletonProps) {
  const getSkeletonStyles = () => {
    const baseStyles = 'bg-gray-200 animate-pulse';
    
    const variantStyles = {
      text: 'rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
    };
    
    return `${baseStyles} ${variantStyles[variant]} ${className}`;
  };

  const getSkeletonStyle = () => {
    return {
      width,
      height,
    };
  };

  return <View className={getSkeletonStyles()} style={getSkeletonStyle()} />;
}

export interface SkeletonCardProps {
  showAvatar?: boolean;
  lines?: number;
  spacing?: 'compact' | 'normal' | 'relaxed';
  className?: string;
}

export function SkeletonCard({
  showAvatar = false,
  lines = 3,
  spacing = 'normal',
  className = '',
}: SkeletonCardProps) {
  const getSpacingClass = () => {
    const spacingMap = {
      compact: 'space-y-2',
      normal: 'space-y-3',
      relaxed: 'space-y-4',
    };
    return spacingMap[spacing];
  };

  const getLineWidths = (totalLines: number) => {
    const widths: string[] = [];
    for (let i = 0; i < totalLines; i++) {
      if (i === 0) {
        widths.push('w-3/4'); // First line - title
      } else if (i === totalLines - 1) {
        widths.push('w-1/2'); // Last line - shorter
      } else {
        widths.push('w-full'); // Middle lines - full width
      }
    }
    return widths;
  };

  const lineWidths = getLineWidths(lines);

  return (
    <View className={`p-4 bg-white rounded-lg ${className}`}>
      <View className="flex-row items-start space-x-3">
        {showAvatar && (
          <SkeletonLine 
            width={40} 
            height={40} 
            variant="circular" 
          />
        )}
        
        <View className={`flex-1 ${getSpacingClass()}`}>
          {lineWidths.map((width, index) => (
            <SkeletonLine
              key={index}
              height={index === 0 ? 20 : 16}
              className={width}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export interface SkeletonListProps {
  itemCount?: number;
  showAvatar?: boolean;
  lines?: number;
  spacing?: 'compact' | 'normal' | 'relaxed';
  className?: string;
}

export function SkeletonList({
  itemCount = 3,
  showAvatar = false,
  lines = 3,
  spacing = 'normal',
  className = '',
}: SkeletonListProps) {
  return (
    <View className={`space-y-4 ${className}`}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <SkeletonCard
          key={index}
          showAvatar={showAvatar}
          lines={lines}
          spacing={spacing}
        />
      ))}
    </View>
  );
}

// Export default for backwards compatibility
export default SkeletonLine;