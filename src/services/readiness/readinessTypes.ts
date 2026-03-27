/**
 * Readiness types for the ReadinessService.
 *
 * These types model the per-trip health signals that are aggregated into a
 * single TripReadiness snapshot. The service is intentionally pure — no side
 * effects, no store imports.
 */

/**
 * The severity of a single readiness signal.
 *
 * Severity order (ascending): ok < warning < critical < missing
 */
export type ReadinessItemStatus = 'ok' | 'warning' | 'critical' | 'missing';

/**
 * A single health signal for one category on one trip leg.
 */
export interface ReadinessItem {
  /** Unique identifier, e.g. "passport-leg-001" or "form-leg-002". */
  id: string;

  /** Which category of health signal this represents. */
  category: 'passport' | 'form' | 'qr' | 'deadline' | 'confirmation';

  /** Short human-readable label shown in the UI. */
  label: string;

  /** Computed severity of this signal. */
  status: ReadinessItemStatus;

  /** Optional detail message explaining the status. */
  detail?: string;

  /** Optional screen name to navigate to in order to resolve this issue. */
  actionScreen?: string;
}

/**
 * Aggregated readiness snapshot for a single trip.
 */
export interface TripReadiness {
  /** The trip this snapshot belongs to. */
  tripId: string;

  /** Worst severity across all items. */
  overallStatus: ReadinessItemStatus;

  /** All readiness items, one per signal per leg. */
  items: ReadinessItem[];

  /** Number of items with status 'ok'. */
  readyCount: number;

  /** Total number of items. */
  totalCount: number;

  /** Earliest departure (or arrival) date across all legs. */
  departureDate: Date;
}
