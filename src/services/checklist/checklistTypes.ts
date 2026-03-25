/**
 * Types for the ChecklistService.
 *
 * Models per-trip pre-departure checklist items aggregated from readiness,
 * deadline, passport, and QR code data. Pure data types — no runtime logic.
 */

export type ChecklistItemStatus =
  | 'complete'
  | 'in-progress'
  | 'action-needed'
  | 'warning'
  | 'not-started';

export interface ChecklistItem {
  /** Unique identifier, e.g. 'leg-JPN-form', 'passport-validity'. */
  id: string;
  category: 'form' | 'passport' | 'qr' | 'deadline';
  /** Human-readable label, e.g. 'Japan entry form'. */
  label: string;
  status: ChecklistItemStatus;
  /** Detail string, e.g. '3 of 8 fields completed'. */
  detail: string;
  urgency: 'normal' | 'warning' | 'critical';
  /** Navigation target when tapped. */
  deepLink: {
    screen: string;
    params: Record<string, string>;
  };
  /** Associated leg (undefined for cross-cutting items). */
  legId?: string;
  countryCode?: string;
}

export interface TripChecklist {
  tripId: string;
  tripName: string;
  items: ChecklistItem[];
  overallStatus: ChecklistItemStatus;
  completedCount: number;
  totalCount: number;
}
