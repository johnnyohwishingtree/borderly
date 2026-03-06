import { Pressable, Text, ActivityIndicator } from 'react-native';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const getButtonStyles = () => {
    const baseStyles = 'rounded-lg flex-row items-center justify-center';
    
    const sizeStyles = {
      small: 'px-3 py-2',
      medium: 'px-4 py-3',
      large: 'px-6 py-4',
    };
    
    const variantStyles = {
      primary: 'bg-blue-600',
      secondary: 'bg-gray-600',
      outline: 'bg-transparent border border-gray-300',
    };
    
    const disabledStyles = disabled || loading ? 'opacity-50' : '';
    const widthStyles = fullWidth ? 'w-full' : '';
    
    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${widthStyles}`;
  };
  
  const getTextStyles = () => {
    const baseStyles = 'font-medium';
    
    const sizeStyles = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
    };
    
    const variantStyles = {
      primary: 'text-white',
      secondary: 'text-white',
      outline: 'text-gray-700',
    };
    
    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]}`;
  };
  
  return (
    <Pressable
      className={getButtonStyles()}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        opacity: pressed && !disabled && !loading ? 0.8 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' ? '#374151' : 'white'} 
          style={{ marginRight: 8 }}
        />
      ) : null}
      <Text className={getTextStyles()}>{title}</Text>
    </Pressable>
  );
}