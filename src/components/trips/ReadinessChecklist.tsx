import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  TripReadiness,
  ReadinessItem,
  ReadinessItemStatus,
} from '../../services/readiness/readinessTypes';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ReadinessChecklistProps {
  /** Aggregated readiness snapshot for a trip (from computeTripReadiness). */
  tripReadiness: TripReadiness;
  /** Called when the user taps a "Fix" link. Receives the target screen name. */
  onNavigate: (screenName: string) => void;
  /** Whether the body is expanded on first render. Default: false. */
  initialExpanded?: boolean;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<ReadinessItem['category'], string> = {
  passport: 'Passport',
  form: 'Forms',
  qr: 'QR Codes',
  deadline: 'Deadlines',
  confirmation: 'Confirmation Codes',
};

const CATEGORY_ORDER: ReadinessItem['category'][] = [
  'passport',
  'form',
  'qr',
  'confirmation',
  'deadline',
];

interface StatusConfig {
  /** Tailwind background class for the pill/icon area. */
  bgClass: string;
  /** Tailwind text colour class. */
  textClass: string;
  /** Unicode symbol used as a status icon. */
  icon: string;
  /** Human-readable status label for screen readers. */
  label: string;
}

function getStatusConfig(status: ReadinessItemStatus): StatusConfig {
  switch (status) {
    case 'ok':
      return {
        bgClass: 'bg-green-100',
        textClass: 'text-green-700',
        icon: '✓',
        label: 'Ready',
      };
    case 'warning':
      return {
        bgClass: 'bg-amber-100',
        textClass: 'text-amber-700',
        icon: '⚠',
        label: 'Warning',
      };
    case 'critical':
      return {
        bgClass: 'bg-red-100',
        textClass: 'text-red-700',
        icon: '✕',
        label: 'Critical',
      };
    case 'missing':
    default:
      return {
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-500',
        icon: '○',
        label: 'Missing',
      };
  }
}

/** Overall header summary text. */
function getHeaderLabel(tripReadiness: TripReadiness): string {
  const { overallStatus, readyCount, totalCount } = tripReadiness;
  if (overallStatus === 'ok') {
    return 'Ready to travel';
  }
  const needsAttention = totalCount - readyCount;
  return `${needsAttention} item${needsAttention !== 1 ? 's' : ''} need${needsAttention === 1 ? 's' : ''} attention`;
}

/** Group items by category, preserving the canonical order. */
function groupByCategory(
  items: ReadinessItem[],
): Array<{ category: ReadinessItem['category']; items: ReadinessItem[] }> {
  const map = new Map<ReadinessItem['category'], ReadinessItem[]>();
  for (const item of items) {
    if (!map.has(item.category)) {
      map.set(item.category, []);
    }
    map.get(item.category)!.push(item);
  }
  return CATEGORY_ORDER.filter((cat) => map.has(cat)).map((cat) => ({
    category: cat,
    items: map.get(cat)!,
  }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ItemRowProps {
  item: ReadinessItem;
  onNavigate: (screenName: string) => void;
}

function ItemRow({ item, onNavigate }: ItemRowProps) {
  const config = getStatusConfig(item.status);
  const isCritical = item.status === 'critical';

  const a11yLabel = [item.label, config.label, item.detail]
    .filter(Boolean)
    .join(', ');

  const handleFix = useCallback(() => {
    if (item.actionScreen) {
      onNavigate(item.actionScreen);
    }
  }, [item.actionScreen, onNavigate]);

  return (
    <View
      testID={`readiness-item-${item.id}`}
      className="flex-row items-start py-2 px-1"
      accessible={true}
      accessibilityLabel={a11yLabel}
      accessibilityRole="text"
    >
      {/* Status icon — decorative, hidden from screen readers */}
      <View
        className={`w-6 h-6 rounded-full items-center justify-center mr-3 mt-0.5 ${config.bgClass}`}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      >
        <Text className={`text-xs font-bold ${config.textClass}`}>{config.icon}</Text>
      </View>

      {/* Label + detail */}
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-900">{item.label}</Text>
        {item.detail ? (
          <Text
            className="text-xs text-gray-500 mt-0.5"
            accessibilityRole="text"
            accessibilityLiveRegion={isCritical ? 'polite' : 'none'}
          >
            {item.detail}
          </Text>
        ) : null}
      </View>

      {/* Fix link */}
      {item.actionScreen ? (
        <TouchableOpacity
          onPress={handleFix}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Fix ${item.label}`}
          accessibilityHint="Navigate to resolve this issue"
          className="ml-2 px-2 py-1"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-xs font-semibold text-blue-600">Fix</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface CategorySectionProps {
  category: ReadinessItem['category'];
  items: ReadinessItem[];
  onNavigate: (screenName: string) => void;
}

function CategorySection({ category, items, onNavigate }: CategorySectionProps) {
  return (
    <View testID={`readiness-category-${category}`} className="mb-2">
      {/* Section header */}
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 pb-1">
        {CATEGORY_LABELS[category]}
      </Text>
      {/* Item rows */}
      {items.map((item) => (
        <ItemRow key={item.id} item={item} onNavigate={onNavigate} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * ReadinessChecklist — expandable checklist card showing TripReadiness status.
 *
 * Renders an overall status header (tap to expand/collapse) and, when expanded,
 * a grouped list of readiness items with status icons and optional "Fix" links.
 */
export default function ReadinessChecklist({
  tripReadiness,
  onNavigate,
  initialExpanded = false,
  testID,
}: ReadinessChecklistProps) {
  const [expanded, setExpanded] = useState(initialExpanded);

  // Rotate animation for the chevron
  const chevronRotation = useRef(new Animated.Value(initialExpanded ? 1 : 0)).current;

  const toggleExpanded = useCallback(() => {
    const toValue = expanded ? 0 : 1;

    Animated.timing(chevronRotation, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setExpanded((prev) => !prev);
  }, [expanded, chevronRotation]);

  const chevronDeg = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const headerLabel = getHeaderLabel(tripReadiness);
  const overallConfig = getStatusConfig(tripReadiness.overallStatus);
  const groups = groupByCategory(tripReadiness.items);

  return (
    <View
      testID={testID ?? 'readiness-checklist'}
      className="rounded-xl border border-gray-200 bg-white overflow-hidden"
    >
      {/* Header row */}
      <TouchableOpacity
        testID="readiness-checklist-header"
        onPress={toggleExpanded}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={headerLabel}
        accessibilityHint={expanded ? 'Tap to collapse checklist' : 'Tap to expand checklist'}
        accessibilityState={{ expanded }}
        activeOpacity={0.7}
        className="flex-row items-center px-4 py-3"
      >
        {/* Overall status icon — decorative */}
        <View
          className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${overallConfig.bgClass}`}
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        >
          <Text className={`text-sm font-bold ${overallConfig.textClass}`}>
            {overallConfig.icon}
          </Text>
        </View>

        {/* Status label */}
        <Text className="flex-1 text-sm font-semibold text-gray-900">{headerLabel}</Text>

        {/* Animated chevron — decorative */}
        <Animated.View
          style={{ transform: [{ rotate: chevronDeg }] }}
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        >
          <Text className="text-gray-400 text-base">▾</Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Expandable body */}
      {expanded ? (
        <View
          testID="readiness-checklist-body"
          className="px-4 pb-3 border-t border-gray-100"
        >
          {groups.length === 0 ? (
            <Text className="text-sm text-gray-400 py-2">No readiness items.</Text>
          ) : (
            groups.map(({ category, items }) => (
              <CategorySection
                key={category}
                category={category}
                items={items}
                onNavigate={onNavigate}
              />
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}
