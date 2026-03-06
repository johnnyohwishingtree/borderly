import { View, ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export default function Card({
  variant = 'default',
  padding = 'medium',
  className,
  children,
  ...viewProps
}: CardProps) {
  const getCardStyles = () => {
    const baseStyles = 'bg-white rounded-lg';
    
    const variantStyles = {
      default: '',
      outlined: 'border border-gray-200',
      elevated: 'shadow-sm',
    };
    
    const paddingStyles = {
      none: '',
      small: 'p-3',
      medium: 'p-4',
      large: 'p-6',
    };
    
    return `${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className || ''}`.trim();
  };
  
  return (
    <View className={getCardStyles()} {...viewProps}>
      {children}
    </View>
  );
}