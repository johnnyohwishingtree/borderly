import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableWithoutFeedback,
  Pressable,
  LayoutChangeEvent,
  Dimensions
} from 'react-native';
import { Info, TriangleAlert, CircleAlert } from 'lucide-react-native';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  trigger?: 'tap' | 'longPress' | 'both';
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  variant?: 'default' | 'info' | 'warning' | 'error';
  showIcon?: boolean;
  maxWidth?: number;
  className?: string;
}

interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function Tooltip({
  children,
  content,
  trigger = 'tap',
  placement = 'auto',
  variant = 'default',
  showIcon = true,
  maxWidth = 280,
  className = '',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [childPosition, setChildPosition] = useState<Position | null>(null);
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number } | null>(null);
  const childRef = useRef<View>(null);

  const variantStyles = {
    default: {
      bg: 'bg-gray-800',
      text: 'text-white',
      icon: Info,
      iconColor: '#ffffff',
    },
    info: {
      bg: 'bg-blue-600',
      text: 'text-white',
      icon: Info,
      iconColor: '#ffffff',
    },
    warning: {
      bg: 'bg-yellow-500',
      text: 'text-gray-900',
      icon: TriangleAlert,
      iconColor: '#1f2937',
    },
    error: {
      bg: 'bg-red-600',
      text: 'text-white',
      icon: CircleAlert,
      iconColor: '#ffffff',
    },
  } as const;

  const style = variantStyles[variant];

  const measureChild = () => {
    if (childRef.current) {
      childRef.current.measure((_x, _y, width, height, pageX, pageY) => {
        setChildPosition({ x: pageX, y: pageY, width, height });
        setVisible(true);
      });
    }
  };

  const handlePress = () => {
    if (trigger === 'tap' || trigger === 'both') {
      measureChild();
    }
  };

  const handleLongPress = () => {
    if (trigger === 'longPress' || trigger === 'both') {
      measureChild();
    }
  };

  const calculatePosition = () => {
    if (!childPosition || !tooltipSize) return { top: 0, left: 0, placement: 'top' };

    const padding = 8;
    const arrowSize = 6;
    
    let finalPlacement = placement;
    let top = 0;
    let left = 0;

    // Auto placement logic
    if (placement === 'auto') {
      const spaceAbove = childPosition.y;
      const spaceBelow = screenHeight - (childPosition.y + childPosition.height);
      const spaceRight = screenWidth - (childPosition.x + childPosition.width);

      if (spaceAbove >= tooltipSize.height + arrowSize + padding) {
        finalPlacement = 'top';
      } else if (spaceBelow >= tooltipSize.height + arrowSize + padding) {
        finalPlacement = 'bottom';
      } else if (spaceRight >= tooltipSize.width + arrowSize + padding) {
        finalPlacement = 'right';
      } else {
        finalPlacement = 'left';
      }
    }

    // Calculate position based on final placement
    switch (finalPlacement) {
      case 'top':
        top = childPosition.y - tooltipSize.height - arrowSize - padding;
        left = childPosition.x + (childPosition.width - tooltipSize.width) / 2;
        break;
      case 'bottom':
        top = childPosition.y + childPosition.height + arrowSize + padding;
        left = childPosition.x + (childPosition.width - tooltipSize.width) / 2;
        break;
      case 'left':
        top = childPosition.y + (childPosition.height - tooltipSize.height) / 2;
        left = childPosition.x - tooltipSize.width - arrowSize - padding;
        break;
      case 'right':
        top = childPosition.y + (childPosition.height - tooltipSize.height) / 2;
        left = childPosition.x + childPosition.width + arrowSize + padding;
        break;
    }

    // Keep tooltip within screen bounds
    left = Math.max(padding, Math.min(left, screenWidth - tooltipSize.width - padding));
    top = Math.max(padding, Math.min(top, screenHeight - tooltipSize.height - padding));

    return { top, left, placement: finalPlacement };
  };

  const onTooltipLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setTooltipSize({ width, height });
  };

  const position = calculatePosition();

  return (
    <>
      <Pressable
        ref={childRef}
        onPress={handlePress}
        onLongPress={handleLongPress}
        className={className}
        accessibilityRole="button"
        accessibilityLabel={`Show tooltip: ${content}`}
        accessibilityHint={trigger === 'tap' ? 'Tap to show tooltip' : 'Long press to show tooltip'}
      >
        {children}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View className="flex-1">
            <TouchableWithoutFeedback>
              <View
                style={{
                  position: 'absolute',
                  top: position.top,
                  left: position.left,
                  maxWidth,
                }}
                onLayout={onTooltipLayout}
                className={`${style.bg} rounded-lg shadow-lg p-3 ${tooltipSize ? '' : 'opacity-0'}`}
              >
                <View className="flex-row items-start">
                  {showIcon && 
                    React.createElement(style.icon, { size: 16, color: style.iconColor, style: { marginRight: 6, marginTop: 1 } })
                  }
                  <Text className={`text-sm ${style.text} flex-1`}>
                    {content}
                  </Text>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}