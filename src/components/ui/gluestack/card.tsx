import React from 'react';
import { View, ViewProps } from 'react-native';
import { cssInterop } from 'react-native-css-interop';

interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'ghost';
  children: React.ReactNode;
  className?: string;
}

const Card = ({
  variant = 'elevated',
  children,
  className = '',
  ...props
}: CardProps) => {
  const variants = {
    elevated: 'bg-white shadow-sm border border-gray-100',
    outlined: 'bg-transparent border border-gray-200',
    ghost: 'bg-gray-50',
  };

  return (
    <View
      className={`rounded-xl p-4 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </View>
  );
};

cssInterop(Card, { 
  className: {
    target: 'style'
  }
});

export { Card };
