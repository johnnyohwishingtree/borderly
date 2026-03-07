import { View, Text, TouchableOpacity, Modal, Pressable, Dimensions } from 'react-native';
import { useState } from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  trigger?: 'tap' | 'long-press';
}

export default function Tooltip({ 
  content, 
  children, 
  placement = 'top', 
  className = '',
  trigger = 'tap'
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const handlePress = (event: any) => {
    if (trigger === 'tap') {
      event.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setPosition({ 
          x: pageX + width / 2, 
          y: placement === 'top' ? pageY - 10 : pageY + height + 10 
        });
        setVisible(true);
      });
    }
  };

  const handleLongPress = (event: any) => {
    if (trigger === 'long-press') {
      event.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setPosition({ 
          x: pageX + width / 2, 
          y: placement === 'top' ? pageY - 10 : pageY + height + 10 
        });
        setVisible(true);
      });
    }
  };

  const getTooltipStyle = () => {
    const tooltipWidth = Math.min(280, screenWidth - 40);
    let left = position.x - tooltipWidth / 2;
    
    // Keep tooltip within screen bounds
    if (left < 20) left = 20;
    if (left + tooltipWidth > screenWidth - 20) left = screenWidth - tooltipWidth - 20;

    return {
      position: 'absolute' as const,
      left,
      top: position.y,
      maxWidth: tooltipWidth,
      zIndex: 1000,
    };
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        className={className}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable 
          className="flex-1" 
          onPress={() => setVisible(false)}
        >
          <View style={getTooltipStyle()}>
            <View className="bg-gray-900 rounded-lg px-3 py-2 shadow-lg">
              <Text className="text-white text-sm leading-5">
                {content}
              </Text>
              {placement === 'top' && (
                <View 
                  className="absolute border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900"
                  style={{ 
                    bottom: -8, 
                    left: '50%', 
                    marginLeft: -8 
                  }}
                />
              )}
              {placement === 'bottom' && (
                <View 
                  className="absolute border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-gray-900"
                  style={{ 
                    top: -8, 
                    left: '50%', 
                    marginLeft: -8 
                  }}
                />
              )}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}