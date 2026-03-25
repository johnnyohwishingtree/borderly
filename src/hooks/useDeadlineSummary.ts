/**
 * useDeadlineSummary — aggregates deadlines across all trips for the summary header.
 *
 * Returns items sorted by urgency (overdue first, then critical, then warning),
 * with collapsible state management.
 */

import { useMemo, useState } from 'react';
import type { Trip } from '../types/trip';
import type { CountryFormSchema } from '../types/schema';
import { computeTripDeadlines, getUrgencyLevel } from '../services/deadline/deadlineService';
import type { UrgencyLevel } from '../services/deadline/deadlineService';

export interface DeadlineSummaryItem {
  tripId: string;
  tripName: string;
  legId: string;
  countryCode: string;
  urgency: UrgencyLevel;
  hoursRemaining: number;
  label: string;
}

export interface UseDeadlineSummaryReturn {
  items: DeadlineSummaryItem[];
  hasUrgentItems: boolean;
  isExpanded: boolean;
  toggleExpanded: () => void;
}

const URGENCY_SORT_ORDER: Record<UrgencyLevel, number> = {
  overdue: 0,
  critical: 1,
  warning: 2,
  normal: 3,
};

function formatDeadlineLabel(urgency: UrgencyLevel, hoursRemaining: number): string {
  if (urgency === 'overdue') return 'Overdue';
  if (hoursRemaining <= 24) return `Due in ${Math.ceil(hoursRemaining)}h`;
  const days = Math.round(hoursRemaining / 24);
  return `Due in ${days}d`;
}

function buildSummaryItems(
  trips: Trip[],
  schemas: Record<string, CountryFormSchema>,
): DeadlineSummaryItem[] {
  const items: DeadlineSummaryItem[] = [];

  for (const trip of trips) {
    if (trip.status === 'completed') continue;

    const deadlines = computeTripDeadlines(trip, schemas);
    for (const deadline of deadlines) {
      const urgency = getUrgencyLevel(deadline);
      if (urgency === 'normal') continue;

      items.push({
        tripId: trip.id,
        tripName: trip.name,
        legId: deadline.legId,
        countryCode: deadline.countryCode,
        urgency,
        hoursRemaining: deadline.hoursRemaining,
        label: formatDeadlineLabel(urgency, deadline.hoursRemaining),
      });
    }
  }

  // Sort: overdue first (most overdue at top), then critical, then warning
  items.sort((a, b) => {
    const orderDiff = URGENCY_SORT_ORDER[a.urgency] - URGENCY_SORT_ORDER[b.urgency];
    if (orderDiff !== 0) return orderDiff;
    // Within same urgency, most urgent (lowest hours) first
    return a.hoursRemaining - b.hoursRemaining;
  });

  return items;
}

export function useDeadlineSummary(
  trips: Trip[],
  schemas: Record<string, CountryFormSchema>,
): UseDeadlineSummaryReturn {
  const items = useMemo(() => buildSummaryItems(trips, schemas), [trips, schemas]);
  const hasOverdue = items.some(item => item.urgency === 'overdue');
  const [isExpanded, setIsExpanded] = useState(hasOverdue);

  const toggleExpanded = () => setIsExpanded(prev => !prev);

  return {
    items,
    hasUrgentItems: items.length > 0,
    isExpanded,
    toggleExpanded,
  };
}
