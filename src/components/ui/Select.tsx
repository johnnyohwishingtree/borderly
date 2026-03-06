import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  testID?: string;
}

export default function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  disabled = false,
  label,
  error,
  testID,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setIsOpen(false);
  };

  const getSelectStyles = () => {
    const baseStyles = 'border rounded-lg px-4 py-3 flex-row justify-between items-center';
    const errorStyles = error ? 'border-red-500' : 'border-gray-300';
    const disabledStyles = disabled ? 'bg-gray-100 opacity-60' : 'bg-white';
    
    return `${baseStyles} ${errorStyles} ${disabledStyles}`;
  };

  const getTextStyles = () => {
    const baseStyles = 'text-base';
    const valueStyles = selectedOption ? 'text-gray-900' : 'text-gray-500';
    
    return `${baseStyles} ${valueStyles}`;
  };

  return (
    <View testID={testID}>
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-1">
          {label}
        </Text>
      )}
      
      <Pressable
        className={getSelectStyles()}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
      >
        <Text className={getTextStyles()}>
          {selectedOption?.label || placeholder}
        </Text>
        <Text className="text-gray-400 text-lg">
          {isOpen ? '▲' : '▼'}
        </Text>
      </Pressable>

      {error && (
        <Text className="text-sm text-red-500 mt-1">
          {error}
        </Text>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setIsOpen(false)}
        >
          <View className="bg-white rounded-lg mx-4 max-h-80 w-full max-w-sm">
            <View className="p-4 border-b border-gray-200">
              <Text className="text-lg font-medium text-gray-900">
                {label || 'Select an option'}
              </Text>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <Pressable
                  className={`p-4 border-b border-gray-100 ${
                    item.value === value ? 'bg-blue-50' : ''
                  }`}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text className={`text-base ${
                    item.value === value ? 'text-blue-600 font-medium' : 'text-gray-900'
                  }`}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
              style={{ maxHeight: 240 }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}