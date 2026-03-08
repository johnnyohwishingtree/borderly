import React from 'react';
import { LucideIcon } from 'lucide-react-native';
import { cssInterop } from 'react-native-css-interop';

interface IconProps {
  as: LucideIcon;
  size?: number | string;
  color?: string;
  className?: string;
}

const Icon = ({ as: IconComponent, size = 24, color = 'currentColor', className = '' }: IconProps) => {
  return <IconComponent size={size} color={color} className={className} />;
};

cssInterop(Icon, { className: 'style' });

export { Icon };
