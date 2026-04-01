import { useState, useMemo } from 'react';
import { View, Text, Pressable, FlatList, TextInput } from 'react-native';

export interface SearchableSelectProps {
  options: { value: string; label: string }[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
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
  required = false,
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
      {label && (
        <Text className="text-sm font-medium text-secondary mb-2">
          {label}
          {required && <Text className="text-red-500"> *</Text>}
        </Text>
      )}
      {/* Trigger button */}
      <Pressable
        className={`border-2 rounded-xl px-4 py-3.5 flex-row justify-between items-center ${
          error ? 'border-red-500 bg-red-50/30' : 'border-border-default bg-white'
        } ${disabled ? 'bg-surface-tertiary opacity-60' : ''}`}
        onPress={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (isOpen) setSearch('');
          }
        }}
        disabled={disabled}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${label || placeholder}. ${selectedOption ? `Selected: ${selectedOption.label}` : 'No selection'}`}
        accessibilityHint="Tap to search and select"
        testID={testID ? `${testID}-trigger` : undefined}
      >
        <Text className={`text-base ${selectedOption ? 'text-primary' : 'text-tertiary'}`}>
          {selectedOption?.label || placeholder}
        </Text>
        <Text className="text-muted text-lg">{isOpen ? '▲' : '▼'}</Text>
      </Pressable>

      {error && !isOpen && (
        <Text className="text-sm mt-2 font-medium text-red-600">{error}</Text>
      )}

      {/* Inline dropdown panel — renders below trigger, no Modal or absolute positioning */}
      {isOpen && (
        <View className="mt-1 bg-surface rounded-xl max-h-[280px] border border-border-default overflow-hidden shadow-lg elevation-4" testID={testID ? `${testID}-panel` : undefined}>
          <View className="p-3 border-b border-border-light">
            <TextInput
              className="border border-border-default rounded-lg px-3 py-2 text-base"
              placeholder="Type to filter..."
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => {
                if (filtered.length === 1) {
                  handleSelect(filtered[0].value);
                }
              }}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="done"
              testID={testID ? `${testID}-search` : undefined}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  className={`p-3 border-b border-border-light ${isSelected ? 'bg-blue-50' : ''}`}
                  onPress={() => handleSelect(item.value)}
                  testID={testID ? `${testID}-option-${item.value}` : undefined}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text className={`text-base ${isSelected ? 'text-blue-600 font-medium' : 'text-primary'}`}>
                    {item.label}
                    {isSelected && ' ✓'}
                  </Text>
                </Pressable>
              );
            }}
            className="max-h-[220px]"
            ListEmptyComponent={
              <View className="p-4">
                <Text className="text-tertiary text-center">No results for &quot;{search}&quot;</Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}
