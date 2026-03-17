import { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, FlatList, TextInput } from 'react-native';

export interface SearchableSelectProps {
  options: { value: string; label: string }[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string | undefined;
  testID?: string;
}

export default function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  disabled = false,
  label,
  error,
  testID,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = options.find(o => o.value === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, search]);

  const handleSelect = (val: string) => {
    onValueChange(val);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <View testID={testID}>
      <Pressable
        className={`border-2 rounded-xl px-4 py-3.5 flex-row justify-between items-center ${
          error ? 'border-red-500 bg-red-50/30' : 'border-gray-200 bg-white'
        } ${disabled ? 'bg-gray-100 opacity-60' : ''}`}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${label || placeholder}. ${selectedOption ? `Selected: ${selectedOption.label}` : 'No selection'}`}
        accessibilityHint="Tap to search and select"
      >
        <Text className={`text-base ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
          {selectedOption?.label || placeholder}
        </Text>
        <Text className="text-gray-400 text-lg">▼</Text>
      </Pressable>

      {error && (
        <Text className="text-sm mt-2 font-medium text-red-600">{error}</Text>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => { setIsOpen(false); setSearch(''); }}
        accessibilityViewIsModal={true}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => { setIsOpen(false); setSearch(''); }}
        >
          <View
            className="bg-white rounded-2xl mx-4 max-h-96 w-full max-w-sm shadow-2xl"
            onStartShouldSetResponder={() => true}
          >
            <View className="p-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                {label || 'Select an option'}
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                placeholder="Type to filter..."
                value={search}
                onChangeText={setSearch}
                autoFocus
                testID={testID ? `${testID}-search` : undefined}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={item => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    className={`p-4 border-b border-gray-100 ${isSelected ? 'bg-blue-50' : ''}`}
                    onPress={() => handleSelect(item.value)}
                    testID={testID ? `${testID}-option-${item.value}` : undefined}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text className={`text-base ${isSelected ? 'text-blue-600 font-medium' : 'text-gray-900'}`}>
                      {item.label}
                      {isSelected && ' ✓'}
                    </Text>
                  </Pressable>
                );
              }}
              style={{ maxHeight: 280 }}
              ListEmptyComponent={
                <View className="p-4">
                  <Text className="text-gray-500 text-center">No results for "{search}"</Text>
                </View>
              }
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
