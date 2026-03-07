import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Card } from './Card';

interface HelpHintProps {
  title: string;
  content: string;
  icon?: string;
  variant?: 'info' | 'tip' | 'warning' | 'success';
  dismissible?: boolean;
  className?: string;
  onDismiss?: () => void;
}

export default function HelpHint({ 
  title, 
  content, 
  icon,
  variant = 'info',
  dismissible = false,
  className = '',
  onDismiss
}: HelpHintProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'tip':
        return {
          containerClass: 'bg-blue-50 border border-blue-200',
          iconColor: '#2563eb',
          titleColor: 'text-blue-800',
          contentColor: 'text-blue-700',
          defaultIcon: 'lightbulb',
        };
      case 'warning':
        return {
          containerClass: 'bg-orange-50 border border-orange-200',
          iconColor: '#ea580c',
          titleColor: 'text-orange-800',
          contentColor: 'text-orange-700',
          defaultIcon: 'warning',
        };
      case 'success':
        return {
          containerClass: 'bg-green-50 border border-green-200',
          iconColor: '#16a34a',
          titleColor: 'text-green-800',
          contentColor: 'text-green-700',
          defaultIcon: 'check-circle',
        };
      default: // info
        return {
          containerClass: 'bg-gray-50 border border-gray-200',
          iconColor: '#6b7280',
          titleColor: 'text-gray-800',
          contentColor: 'text-gray-700',
          defaultIcon: 'info',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card 
      variant="outlined" 
      className={`${styles.containerClass} ${className}`}
    >
      <View className="flex-row items-start space-x-3">
        <MaterialIcons 
          name={icon || styles.defaultIcon} 
          size={20} 
          color={styles.iconColor} 
          style={{ marginTop: 2 }}
        />
        <View className="flex-1">
          <Text className={`text-sm font-medium ${styles.titleColor} mb-1`}>
            {title}
          </Text>
          <Text className={`text-sm ${styles.contentColor} leading-5`}>
            {content}
          </Text>
        </View>
        {dismissible && (
          <TouchableOpacity
            onPress={handleDismiss}
            className="ml-2 p-1"
            accessibilityLabel="Dismiss hint"
            accessibilityRole="button"
          >
            <MaterialIcons name="close" size={16} color={styles.iconColor} />
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}