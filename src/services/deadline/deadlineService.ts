import { TripLeg, Trip } from '../../types/trip';
import { CountryFormSchema } from '../../types/schema';

/**
 * The five possible submission statuses for a trip leg.
 */
export type DeadlineStatus =
  | 'not-started'
  | 'in-progress'
  | 'ready'
  | 'overdue'
  | 'no-deadline';

/**
 * Urgency level based on hours remaining until the submission deadline.
 */
export type UrgencyLevel = 'normal' | 'warning' | 'critical' | 'overdue';

/**
 * Deadline information for a single trip leg.
 */
export interface LegDeadline {
  legId: string;
  countryCode: string;
  /** The hard submission deadline. Undefined when status is 'no-deadline'. */
  submissionDeadline?: Date;
  /** The recommended (earlier) deadline. Undefined when status is 'no-deadline'. */
  recommendedDeadline?: Date;
  /** Hours remaining until submissionDeadline. Negative means overdue. 0 when no deadline. */
  hoursRemaining: number;
  status: DeadlineStatus;
  windowNote: string;
}

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Derives the submission status from form progress and deadline state.
 */
function deriveStatus(
  leg: TripLeg,
  submissionDeadline: Date | undefined,
  now: Date,
): DeadlineStatus {
  if (!submissionDeadline) {
    return 'no-deadline';
  }

  // ready takes precedence over overdue
  if (leg.formStatus === 'ready' || leg.formStatus === 'submitted') {
    return 'ready';
  }

  if (now > submissionDeadline) {
    return 'overdue';
  }

  if (leg.formStatus === 'in_progress') {
    return 'in-progress';
  }

  return 'not-started';
}

/**
 * Computes deadline information for a single trip leg using its schema metadata.
 *
 * The reference date used to anchor the deadline is `leg.departureDate` if present,
 * falling back to `leg.arrivalDate`. When `submissionDeadlineHours` is 0 **and**
 * there is no `departureDate`, no hard deadline can be derived and the status is
 * set to `'no-deadline'`.
 */
export function computeLegDeadline(
  leg: TripLeg,
  schema: CountryFormSchema,
): LegDeadline {
  const now = new Date();

  // no-deadline: schema has no hard deadline AND no departure date to anchor to
  if (schema.submissionDeadlineHours === 0 && !leg.departureDate) {
    return {
      legId: leg.id,
      countryCode: leg.destinationCountry,
      hoursRemaining: 0,
      status: 'no-deadline',
      windowNote: schema.submissionWindowNote,
    };
  }

  // Prefer departureDate; fall back to arrivalDate
  const referenceDateStr = leg.departureDate ?? leg.arrivalDate;
  const referenceDate = new Date(referenceDateStr);

  // submissionDeadline = referenceDate − submissionDeadlineHours
  const submissionDeadline = new Date(
    referenceDate.getTime() - schema.submissionDeadlineHours * MS_PER_HOUR,
  );

  // recommendedDeadline is earlier than the hard deadline
  const recommendedDeadline = new Date(
    submissionDeadline.getTime() - schema.recommendedLeadTimeHours * MS_PER_HOUR,
  );

  const hoursRemaining =
    (submissionDeadline.getTime() - now.getTime()) / MS_PER_HOUR;

  const status = deriveStatus(leg, submissionDeadline, now);

  return {
    legId: leg.id,
    countryCode: leg.destinationCountry,
    submissionDeadline,
    recommendedDeadline,
    hoursRemaining,
    status,
    windowNote: schema.submissionWindowNote,
  };
}

/**
 * Computes deadline information for every leg in a trip.
 *
 * @param trip - The trip whose legs to process.
 * @param schemas - A map from ISO-3166-1 alpha-3 country code to its schema.
 *   Legs with no matching schema receive `'no-deadline'` status.
 */
export function computeTripDeadlines(
  trip: Trip,
  schemas: Record<string, CountryFormSchema>,
): LegDeadline[] {
  return trip.legs.map((leg) => {
    const schema = schemas[leg.destinationCountry];
    if (!schema) {
      return {
        legId: leg.id,
        countryCode: leg.destinationCountry,
        hoursRemaining: 0,
        status: 'no-deadline' as DeadlineStatus,
        windowNote: '',
      };
    }
    return computeLegDeadline(leg, schema);
  });
}

/**
 * Returns the urgency level for a given leg deadline.
 *
 * Boundary values:
 *  - exactly 24 h remaining → 'critical'
 *  - exactly 48 h remaining → 'warning'
 */
export function getUrgencyLevel(deadline: LegDeadline): UrgencyLevel {
  if (deadline.status === 'no-deadline') {
    return 'normal';
  }
  if (deadline.status === 'overdue' || deadline.hoursRemaining < 0) {
    return 'overdue';
  }
  if (deadline.hoursRemaining <= 24) {
    return 'critical';
  }
  if (deadline.hoursRemaining <= 48) {
    return 'warning';
  }
  return 'normal';
}
