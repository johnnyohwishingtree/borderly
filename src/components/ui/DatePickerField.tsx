import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Calendar } from 'lucide-react-native';

export interface DatePickerFieldProps {
  value?: string | undefined; // ISO format "YYYY-MM-DD" or empty string
  onChange: (isoDate: string) => void;
  label?: string | undefined;
  minDate?: string | undefined; // ISO format "YYYY-MM-DD"
  maxDate?: string | undefined; // ISO format "YYYY-MM-DD"
  error?: string | undefined;
  disabled?: boolean | undefined;
  testID?: string | undefined;
  placeholder?: string | undefined;
  required?: boolean | undefined;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function parseISO(iso: string): { year: number; month: number; day: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

function toISO(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function formatDisplayDate(iso: string): string {
  const parsed = parseISO(iso);
  if (!parsed) return '';
  const { year, month, day } = parsed;
  return `${SHORT_MONTHS[month - 1]} ${day}, ${year}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDay(year: number, month: number, day: number): number {
  const max = daysInMonth(year, month);
  return Math.min(Math.max(1, day), max);
}

interface ColumnPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  testIDPrefix?: string | undefined;
}

function ColumnPicker({ items, selectedIndex, onSelect, testIDPrefix }: ColumnPickerProps) {
  const ITEM_HEIGHT = 40;
  const VISIBLE_ITEMS = 5;

  return (
    <ScrollView
      style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <TouchableOpacity
            key={item}
            onPress={() => onSelect(index)}
            style={{
              height: ITEM_HEIGHT,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: isSelected ? '#eff6ff' : 'transparent',
              borderRadius: 8,
              marginHorizontal: 4,
            }}
            testID={testIDPrefix ? `${testIDPrefix}-${item}` : undefined}
          >
            <Text
              style={{
                fontSize: isSelected ? 16 : 14,
                fontWeight: isSelected ? '600' : '400',
                color: isSelected ? '#1d4ed8' : '#6b7280',
              }}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function DatePickerField({
  value = '',
  onChange,
  label,
  minDate,
  maxDate,
  error,
  disabled = false,
  testID,
  placeholder = 'Select a date',
  required = false,
}: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse current value or use today as default
  const parsed = parseISO(value);
  const today = new Date();
  const defaultYear = parsed?.year ?? today.getFullYear();
  const defaultMonth = parsed?.month ?? today.getMonth() + 1;
  const defaultDay = parsed?.day ?? today.getDate();

  const [draftYear, setDraftYear] = useState(defaultYear);
  const [draftMonth, setDraftMonth] = useState(defaultMonth);
  const [draftDay, setDraftDay] = useState(defaultDay);

  // Year range: minDate year to maxDate year (or 100-year window)
  const parsedMin = parseISO(minDate ?? '');
  const parsedMax = parseISO(maxDate ?? '');
  const minYear = parsedMin?.year ?? (today.getFullYear() - 100);
  const maxYear = parsedMax?.year ?? (today.getFullYear() + 20);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(minYear + i));

  // Constrain months based on min/max date when at boundary year
  const minMonth = (parsedMin && draftYear === parsedMin.year) ? parsedMin.month : 1;
  const maxMonth = (parsedMax && draftYear === parsedMax.year) ? parsedMax.month : 12;
  const months = MONTHS
    .map((m, i) => ({ label: `${i + 1} - ${m}`, monthNum: i + 1 }))
    .filter(m => m.monthNum >= minMonth && m.monthNum <= maxMonth);

  // Constrain days based on min/max date when at boundary year+month
  const currentDays = daysInMonth(draftYear, draftMonth);
  const minDay = (parsedMin && draftYear === parsedMin.year && draftMonth === parsedMin.month) ? parsedMin.day : 1;
  const maxDay = (parsedMax && draftYear === parsedMax.year && draftMonth === parsedMax.month) ? Math.min(parsedMax.day, currentDays) : currentDays;
  const days = Array.from({ length: maxDay - minDay + 1 }, (_, i) => String(minDay + i).padStart(2, '0'));

  const yearIndex = Math.max(0, years.indexOf(String(draftYear)));
  const monthIndex = Math.max(0, months.findIndex(m => m.monthNum === draftMonth));
  const dayIndex = Math.max(0, Math.min(draftDay - minDay, days.length - 1));

  const handleOpen = useCallback(() => {
    if (disabled) return;
    // Sync draft from current value when opening
    const p = parseISO(value);
    if (p) {
      setDraftYear(p.year);
      setDraftMonth(p.month);
      setDraftDay(p.day);
    } else {
      const now = new Date();
      setDraftYear(now.getFullYear());
      setDraftMonth(now.getMonth() + 1);
      setDraftDay(now.getDate());
    }
    setIsOpen(true);
  }, [disabled, value]);

  const handleConfirm = useCallback(() => {
    const clamped = clampDay(draftYear, draftMonth, draftDay);
    onChange(toISO(draftYear, draftMonth, clamped));
    setIsOpen(false);
  }, [draftYear, draftMonth, draftDay, onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    setIsOpen(false);
  }, [onChange]);

  const displayDate = value ? formatDisplayDate(value) : '';

  return (
    <View className="mb-4" testID={testID ? `${testID}-container` : undefined}>
      {label && (
        <Text className="text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <Text className="text-red-500">{' *'}</Text>}
        </Text>
      )}

      <Pressable
        onPress={handleOpen}
        disabled={disabled}
        testID={testID}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label} date picker` : 'Date picker'}
        accessibilityValue={{ text: displayDate || placeholder }}
        className={[
          'border-2 rounded-xl px-4 py-3.5 flex-row justify-between items-center bg-white min-h-[44px]',
          error ? 'border-red-500 bg-red-50' : 'border-gray-200',
          disabled ? 'bg-gray-100 opacity-60' : '',
        ].join(' ')}
      >
        <Text
          className={displayDate ? 'text-base text-gray-900' : 'text-base text-gray-400'}
        >
          {displayDate || placeholder}
        </Text>
        <Calendar size={20} color="#9ca3af" />
      </Pressable>

      {error && (
        <Text className="text-sm text-red-600 mt-1">{error}</Text>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
        testID={testID ? `${testID}-modal` : undefined}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setIsOpen(false)}
          accessible={false}
        >
          <Pressable
            className="bg-white rounded-t-3xl min-h-[350px]"
            onPress={e => e.stopPropagation()}
            accessible={false}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center px-4 pt-4 pb-2 border-b border-gray-100">
              <TouchableOpacity
                onPress={handleClear}
                testID={testID ? `${testID}-clear` : undefined}
              >
                <Text className="text-base text-gray-500 font-medium">Clear</Text>
              </TouchableOpacity>
              <Text className="text-base font-semibold text-gray-900">
                {label || 'Select Date'}
              </Text>
              <TouchableOpacity
                onPress={handleConfirm}
                testID={testID ? `${testID}-confirm` : undefined}
              >
                <Text className="text-base text-blue-600 font-semibold">Done</Text>
              </TouchableOpacity>
            </View>

            {/* Picker columns */}
            <View className="flex-row px-2 pb-16">
              {/* Month column */}
              <View className="flex-[2]">
                <Text className="text-center text-xs font-medium text-gray-500 py-1">Month</Text>
                <ColumnPicker
                  items={months.map(m => m.label)}
                  selectedIndex={monthIndex}
                  onSelect={(idx) => {
                    const newMonth = months[idx].monthNum;
                    setDraftMonth(newMonth);
                    setDraftDay(clampDay(draftYear, newMonth, draftDay));
                  }}
                  testIDPrefix={testID ? `${testID}-month` : undefined}
                />
              </View>

              {/* Day column */}
              <View className="flex-1">
                <Text className="text-center text-xs font-medium text-gray-500 py-1">Day</Text>
                <ColumnPicker
                  items={days}
                  selectedIndex={dayIndex}
                  onSelect={(idx) => setDraftDay(idx + 1)}
                  testIDPrefix={testID ? `${testID}-day` : undefined}
                />
              </View>

              {/* Year column */}
              <View className="flex-1">
                <Text className="text-center text-xs font-medium text-gray-500 py-1">Year</Text>
                <ColumnPicker
                  items={years}
                  selectedIndex={yearIndex}
                  onSelect={(idx) => {
                    const newYear = minYear + idx;
                    setDraftYear(newYear);
                    // Clamp month if we're now at the min year boundary
                    const newMinMonth = (parsedMin && newYear === parsedMin.year) ? parsedMin.month : 1;
                    if (draftMonth < newMinMonth) setDraftMonth(newMinMonth);
                    setDraftDay(clampDay(newYear, draftMonth, draftDay));
                  }}
                  testIDPrefix={testID ? `${testID}-year` : undefined}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
