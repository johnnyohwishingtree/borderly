import { useState, useRef } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';
import {
  AccessibilityStateHelpers,
  TouchTargetUtils,
  SemanticUtils,
  ScreenReaderUtils,
  ACCESSIBILITY_CONSTANTS,
} from '../../utils/accessibility';

export interface SelectOption {
  label: string;
  value: string;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  required?: boolean;
  
  // Enhanced accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityDescribedBy?: string;
  
  // High contrast support
  highContrastMode?: boolean;
  
  // Custom styling
  className?: string;
  
  // Testing
  testID?: string;
  labelTestID?: string;
  errorTestID?: string;
  modalTestID?: string;
}

export default function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  disabled = false,
  label,
  error,
  required = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityDescribedBy,
  highContrastMode = false,
  className,
  testID,
  labelTestID,
  errorTestID,
  modalTestID,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<Modal>(null);

  const selectedOption = options.find(option => option.value === value);

  // Generate unique IDs for accessibility relationships
  const selectId = testID || `select-${Math.random().toString(36).substr(2, 9)}`;
  const labelId = `${selectId}-label`;
  const errorId = `${selectId}-error`;

  const handleSelect = (selectedValue: string) => {
    const selectedOpt = options.find(opt => opt.value === selectedValue);
    trigger('selection', { enableVibrateFallback: true });
    onValueChange(selectedValue);
    setIsOpen(false);
    
    // Announce selection for screen readers
    if (selectedOpt) {
      const announcement = `Selected ${selectedOpt.accessibilityLabel || selectedOpt.label}`;
      ScreenReaderUtils.announce(announcement);
    }
  };

  const handleToggle = () => {
    if (!disabled) {
      trigger('selection', { enableVibrateFallback: true });
      setIsOpen(!isOpen);
      
      if (!isOpen) {
        ScreenReaderUtils.announce('Select options opened');
      }
    }
  };

  const getSelectStyles = () => {
    const baseStyles = `border-2 rounded-xl px-4 py-3.5 flex-row justify-between items-center transition-all duration-150 shadow-sm min-h-[${ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET}px]`;
    
    let errorStyles, disabledStyles;
    
    if (highContrastMode) {
      errorStyles = error ? 'border-black bg-white' : 'border-gray-800';
      disabledStyles = disabled ? 'bg-gray-200 opacity-60 border-gray-600' : 'bg-white';
    } else {
      errorStyles = error ? 'border-red-500 bg-red-50/30' : 'border-gray-200';
      disabledStyles = disabled ? 'bg-gray-100 opacity-60' : 'bg-white';
    }

    return `${baseStyles} ${errorStyles} ${disabledStyles} ${className || ''}`;
  };

  const getTextStyles = () => {
    const baseStyles = 'text-base';
    
    let valueStyles;
    if (highContrastMode) {
      valueStyles = selectedOption ? 'text-black' : 'text-gray-700';
    } else {
      valueStyles = selectedOption ? 'text-gray-900' : 'text-gray-500';
    }

    return `${baseStyles} ${valueStyles}`;
  };

  const getLabelStyles = () => {
    const baseStyles = 'text-sm font-semibold mb-2';
    const colorStyles = highContrastMode ? 'text-black' : 'text-gray-700';
    return `${baseStyles} ${colorStyles}`;
  };

  const getErrorStyles = () => {
    const baseStyles = 'text-sm mt-2 font-medium';
    const colorStyles = highContrastMode ? 'text-black' : 'text-red-600';
    return `${baseStyles} ${colorStyles}`;
  };

  // Generate semantic accessibility labels
  const semanticLabel = accessibilityLabel || SemanticUtils.generateFieldLabel(
    label || 'Select',
    required,
    !!error,
    error
  );

  // Create accessibility state
  const accessibilityState = AccessibilityStateHelpers.createFormFieldState(
    required,
    !!error,
    disabled
  );

  // Build accessibility described by relationship
  const describedByIds = [];
  if (error) describedByIds.push(errorId);
  if (accessibilityDescribedBy) describedByIds.push(accessibilityDescribedBy);

  const currentValueText = selectedOption 
    ? `Current selection: ${selectedOption.accessibilityLabel || selectedOption.label}`
    : 'No selection made';

  return (
    <View testID={testID}>
      {label && (
        <Text 
          className={getLabelStyles()}
          nativeID={labelId}
          accessible={true}
          accessibilityRole="text"
          testID={labelTestID}
        >
          {label}
          {required && (
            <Text 
              className={highContrastMode ? 'text-black' : 'text-red-500'}
              accessibilityLabel="required"
            >
              {' *'}
            </Text>
          )}
        </Text>
      )}

      <Pressable
        className={getSelectStyles()}
        onPress={handleToggle}
        disabled={disabled}
        
        // Core accessibility props
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${semanticLabel}. ${currentValueText}. ${isOpen ? 'Expanded' : 'Collapsed'}`}
        accessibilityHint={accessibilityHint || 'Tap to open options menu'}
        accessibilityState={{
          ...accessibilityState,
          expanded: isOpen,
        }}
        accessibilityLabelledBy={label ? labelId : undefined}
        accessibilityDescribedBy={describedByIds.length > 0 ? describedByIds.join(' ') : undefined}
        
        // Enhanced accessibility
        importantForAccessibility="yes"
        hitSlop={TouchTargetUtils.getHitSlop(100, ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET)}
      >
        <Text className={getTextStyles()} accessible={false}>
          {selectedOption?.label || placeholder}
        </Text>
        <Text 
          className={highContrastMode ? 'text-black text-lg' : 'text-gray-400 text-lg'}
          accessible={false}
        >
          {isOpen ? '▲' : '▼'}
        </Text>
      </Pressable>

      {error && (
        <Text 
          className={getErrorStyles()}
          nativeID={errorId}
          accessible={true}
          accessibilityRole="text"
          accessibilityLiveRegion="assertive"
          testID={errorTestID}
        >
          {error}
        </Text>
      )}

      <Modal
        ref={modalRef}
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        accessible={true}
        accessibilityViewIsModal={true}
        testID={modalTestID}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setIsOpen(false)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close options menu"
          accessibilityHint="Tap to close the options menu"
        >
          <View 
            className={`rounded-2xl mx-4 max-h-80 w-full max-w-sm shadow-2xl ${
              highContrastMode 
                ? 'bg-white border-2 border-black' 
                : 'bg-white shadow-gray-900/25'
            }`}
            accessible={false}
          >
            <View className={`p-4 ${
              highContrastMode ? 'border-b-2 border-black' : 'border-b border-gray-100'
            }`}>
              <Text className={`text-lg font-semibold ${
                highContrastMode ? 'text-black' : 'text-gray-900'
              }`}>
                {label || 'Select an option'}
              </Text>
            </View>

            <FlatList
              data={options}
              keyExtractor={item => item.value}
              renderItem={({ item, index }) => {
                const isSelected = item.value === value;
                const isDisabled = item.disabled || false;
                
                return (
                  <Pressable
                    className={`p-4 ${
                      highContrastMode 
                        ? (isSelected ? 'bg-gray-200 border-b-2 border-black' : 'border-b border-gray-400')
                        : (isSelected ? 'bg-blue-50 border-b border-gray-100' : 'border-b border-gray-100')
                    }`}
                    onPress={() => !isDisabled && handleSelect(item.value)}
                    disabled={isDisabled}
                    
                    // Accessibility props
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={item.accessibilityLabel || item.label}
                    accessibilityState={{
                      disabled: isDisabled,
                      selected: isSelected,
                    }}
                    importantForAccessibility="yes"
                    hitSlop={TouchTargetUtils.getHitSlop(100, ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET)}
                    style={{
                      minHeight: ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET,
                      opacity: isDisabled ? 0.5 : 1,
                    }}
                  >
                    <Text className={`text-base ${
                      isDisabled 
                        ? (highContrastMode ? 'text-gray-600' : 'text-gray-400')
                        : isSelected 
                          ? (highContrastMode ? 'text-black font-bold' : 'text-blue-600 font-medium')
                          : (highContrastMode ? 'text-black' : 'text-gray-900')
                    }`}>
                      {item.label}
                      {isSelected && ' ✓'}
                    </Text>
                  </Pressable>
                );
              }}
              style={{ maxHeight: 240 }}
              accessible={false}
              accessibilityElementsHidden={false}
              importantForAccessibility="no-hide-descendants"
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
