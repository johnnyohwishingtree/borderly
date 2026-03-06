import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export default function Input({
  label,
  error,
  helperText,
  required,
  className,
  ...textInputProps
}: InputProps) {
  const getInputStyles = () => {
    const baseStyles = 'border rounded-lg px-3 py-3 text-base';
    const errorStyles = error ? 'border-red-500' : 'border-gray-300';
    const focusStyles = 'focus:border-blue-500';
    
    return `${baseStyles} ${errorStyles} ${focusStyles} ${className || ''}`.trim();
  };
  
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <Text className="text-red-500"> *</Text>}
        </Text>
      )}
      
      <TextInput
        className={getInputStyles()}
        {...textInputProps}
      />
      
      {error && (
        <Text className="text-sm text-red-500 mt-1">{error}</Text>
      )}
      
      {helperText && !error && (
        <Text className="text-sm text-gray-500 mt-1">{helperText}</Text>
      )}
    </View>
  );
}