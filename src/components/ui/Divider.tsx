import { View, Text, ViewProps } from 'react-native';

export interface DividerProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: 'thin' | 'medium' | 'thick';
  color?: 'light' | 'medium' | 'dark';
  variant?: 'solid' | 'dashed' | 'dotted';
  text?: string;
  textPosition?: 'left' | 'center' | 'right';
  spacing?: 'none' | 'small' | 'medium' | 'large';
}

export default function Divider({
  orientation = 'horizontal',
  thickness = 'thin',
  color = 'light',
  variant = 'solid',
  text,
  textPosition = 'center',
  spacing = 'medium',
  className,
  ...viewProps
}: DividerProps) {
  const getSpacingStyles = () => {
    if (orientation === 'horizontal') {
      const verticalSpacing = {
        none: '',
        small: 'my-2',
        medium: 'my-4',
        large: 'my-6',
      };
      return verticalSpacing[spacing];
    } else {
      const horizontalSpacing = {
        none: '',
        small: 'mx-2',
        medium: 'mx-4',
        large: 'mx-6',
      };
      return horizontalSpacing[spacing];
    }
  };

  const getDividerStyles = () => {
    const baseStyles = orientation === 'horizontal' ? 'w-full' : 'h-full';

    const thicknessStyles = {
      thin: orientation === 'horizontal' ? 'h-px' : 'w-px',
      medium: orientation === 'horizontal' ? 'h-0.5' : 'w-0.5',
      thick: orientation === 'horizontal' ? 'h-1' : 'w-1',
    };

    const colorStyles = {
      light: 'bg-gray-200',
      medium: 'bg-gray-300',
      dark: 'bg-gray-400',
    };

    const variantStyles = {
      solid: '',
      dashed: 'border-dashed border-t border-0',
      dotted: 'border-dotted border-t border-0',
    };

    if (variant !== 'solid') {
      const borderColorStyles = {
        light: 'border-gray-200',
        medium: 'border-gray-300',
        dark: 'border-gray-400',
      };
      
      return `${baseStyles} ${thicknessStyles[thickness]} ${variantStyles[variant]} ${borderColorStyles[color]} bg-transparent`;
    }

    return `${baseStyles} ${thicknessStyles[thickness]} ${colorStyles[color]}`;
  };

  const getTextStyles = () => {
    return 'text-sm font-medium text-gray-500 px-3 bg-white';
  };


  if (text && orientation === 'horizontal') {
    return (
      <View className={`flex-row items-center ${getSpacingStyles()} ${className || ''}`.trim()} {...viewProps}>
        {textPosition !== 'left' && <View className={`flex-1 ${getDividerStyles()}`} />}
        <Text className={getTextStyles()}>{text}</Text>
        {textPosition !== 'right' && <View className={`flex-1 ${getDividerStyles()}`} />}
      </View>
    );
  }

  return (
    <View 
      className={`${getDividerStyles()} ${getSpacingStyles()} ${className || ''}`.trim()} 
      {...viewProps} 
    />
  );
}