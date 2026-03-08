import { LucideIcon } from 'lucide-react-native';
import { cssInterop } from 'react-native-css-interop';

interface IconProps {
  as: LucideIcon;
  size?: number;
  color?: string;
  className?: string;
  style?: any;
}

const Icon = ({ as: IconComponent, size = 24, color = '#000', className = '', style }: IconProps) => {
  return <IconComponent size={size} color={color} className={className} style={style} />;
};

cssInterop(Icon, { className: 'style' });

export { Icon };
