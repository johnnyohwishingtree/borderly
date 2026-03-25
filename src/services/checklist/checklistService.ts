/**
 * ChecklistService — aggregates per-trip readiness data into a flat checklist.
 *
 * Pure function: no store or hook imports. All data passed as arguments.
 */

import { Trip, TripLeg, SavedQRCode } from '../../types/trip';
import { TravelerProfile } from '../../types/profile';
import { CountryFormSchema } from '../../types/schema';
import { checkPassportValidity } from '../documents/documentValidityService';
import { computeLegDeadline, getUrgencyLevel } from '../deadline/deadlineService';
import {
  ChecklistItem,
  ChecklistItemStatus,
  TripChecklist,
} from './checklistTypes';

/** Country codes whose portals issue a QR code required at the border. */
const QR_REQUIRED_COUNTRIES = new Set<string>(['JPN']);

/** Severity ordering for computing worst overall status. Higher = worse. */
const STATUS_SEVERITY: Record<ChecklistItemStatus, number> = {
  complete: 0,
  'in-progress': 1,
  'not-started': 2,
  warning: 3,
  'action-needed': 4,
};

function worstStatus(items: ChecklistItem[]): ChecklistItemStatus {
  if (items.length === 0) return 'complete';
  return items.reduce<ChecklistItemStatus>((worst, item) => {
    return STATUS_SEVERITY[item.status] > STATUS_SEVERITY[worst]
      ? item.status
      : worst;
  }, 'complete');
}

function buildFormItem(
  legId: string,
  countryCode: string,
  countryLabel: string,
  formStatus: string,
): ChecklistItem {
  const statusMap: Record<string, ChecklistItemStatus> = {
    submitted: 'complete',
    ready: 'complete',
    in_progress: 'in-progress',
    not_started: 'not-started',
  };
  const detailMap: Record<string, string> = {
    submitted: 'Form submitted',
    ready: 'Form ready to submit',
    in_progress: 'Form partially completed',
    not_started: 'Form not started',
  };
  const urgencyMap: Record<string, 'normal' | 'warning' | 'critical'> = {
    submitted: 'normal',
    ready: 'normal',
    in_progress: 'warning',
    not_started: 'critical',
  };

  return {
    id: `leg-${countryCode}-form-${legId}`,
    category: 'form',
    label: `${countryLabel} entry form`,
    status: statusMap[formStatus] ?? 'not-started',
    detail: detailMap[formStatus] ?? 'Form not started',
    urgency: urgencyMap[formStatus] ?? 'critical',
    deepLink: { screen: 'LegForm', params: { legId } },
    legId,
    countryCode,
  };
}

function buildQrItem(
  legId: string,
  countryCode: string,
  countryLabel: string,
  qrCount: number,
  required: boolean,
): ChecklistItem | undefined {
  if (!required && qrCount === 0) return undefined;

  return {
    id: `leg-${countryCode}-qr-${legId}`,
    category: 'qr',
    label: `${countryLabel} QR code`,
    status: qrCount > 0 ? 'complete' : 'action-needed',
    detail:
      qrCount > 0
        ? `${qrCount} QR code(s) saved`
        : 'No QR code saved — required for entry',
    urgency: qrCount > 0 ? 'normal' : 'critical',
    deepLink: { screen: 'QRWallet', params: { legId } },
    legId,
    countryCode,
  };
}

function buildPassportItem(
  legId: string,
  countryCode: string,
  countryLabel: string,
  profiles: TravelerProfile[],
  departureDate: string,
  schema: CountryFormSchema,
): ChecklistItem | undefined {
  if (profiles.length === 0) return undefined;

  let worstUrgency: 'normal' | 'warning' | 'critical' = 'normal';
  let worstDetail = '';
  let worstSeverity = 0;

  for (const profile of profiles) {
    const validity = checkPassportValidity(profile, departureDate, schema);

    const expiryDate = new Date(profile.passportExpiry);
    const departure = new Date(departureDate);
    expiryDate.setHours(0, 0, 0, 0);
    departure.setHours(0, 0, 0, 0);

    if (expiryDate < departure) {
      // Expired before departure — critical
      if (worstSeverity < 2) {
        worstSeverity = 2;
        worstUrgency = 'critical';
        worstDetail = `Passport for ${profile.surname} expires before departure`;
      }
    } else if (!validity.isValid) {
      // Doesn't meet validity buffer — warning
      if (worstSeverity < 1) {
        worstSeverity = 1;
        worstUrgency = 'warning';
        worstDetail = `Passport for ${profile.surname} may not meet ${countryLabel}'s validity requirement`;
      }
    }
  }

  // Only emit a passport item when there's a warning or critical issue
  if (worstSeverity === 0) return undefined;

  return {
    id: `passport-${countryCode}-${legId}`,
    category: 'passport',
    label: `Passport validity — ${countryLabel}`,
    status: worstSeverity >= 2 ? 'action-needed' : 'warning',
    detail: worstDetail,
    urgency: worstUrgency,
    deepLink: { screen: 'Profile', params: {} },
    legId,
    countryCode,
  };
}

function buildDeadlineItem(
  leg: TripLeg,
  countryLabel: string,
  schema: CountryFormSchema,
): ChecklistItem | undefined {
  const deadline = computeLegDeadline(leg, schema);

  if (deadline.status === 'no-deadline') return undefined;
  if (deadline.status === 'ready') return undefined;

  const urgencyLevel = getUrgencyLevel(deadline);

  let status: ChecklistItemStatus;
  let urgency: 'normal' | 'warning' | 'critical';

  if (urgencyLevel === 'overdue') {
    status = 'action-needed';
    urgency = 'critical';
  } else if (urgencyLevel === 'critical') {
    status = 'warning';
    urgency = 'critical';
  } else if (urgencyLevel === 'warning') {
    status = 'warning';
    urgency = 'warning';
  } else {
    status = 'in-progress';
    urgency = 'normal';
  }

  const hoursLeft = Math.max(0, Math.floor(deadline.hoursRemaining));
  const detail =
    deadline.hoursRemaining < 0
      ? 'Deadline passed'
      : `${hoursLeft}h remaining`;

  return {
    id: `deadline-${leg.destinationCountry}-${leg.id}`,
    category: 'deadline',
    label: `Submission deadline — ${countryLabel}`,
    status,
    detail: deadline.windowNote || detail,
    urgency,
    deepLink: { screen: 'TripDetail', params: { tripId: '' } },
    legId: leg.id,
    countryCode: leg.destinationCountry,
  };
}

/**
 * Computes a complete pre-departure checklist for the given trip.
 *
 * Produces checklist items per leg:
 *   1. Form status
 *   2. QR code (only for QR-required countries, or when QR exists)
 *   3. Passport validity (only when warning/expired)
 *   4. Deadline (only when upcoming and not yet ready)
 */
export function computeTripChecklist(
  trip: Trip,
  profiles: TravelerProfile[],
  schemas: Record<string, CountryFormSchema>,
  qrCodes: SavedQRCode[],
): TripChecklist {
  const items: ChecklistItem[] = [];

  for (const leg of trip.legs) {
    const schema = schemas[leg.destinationCountry];
    const countryLabel = schema?.countryName ?? leg.destinationCountry;
    const countryCode = leg.destinationCountry;
    const departureDateStr = leg.departureDate ?? leg.arrivalDate;

    // Resolve which profiles apply to this leg
    const legProfiles =
      leg.assignedTravelers && leg.assignedTravelers.length > 0
        ? profiles.filter((p) => (leg.assignedTravelers as string[]).includes(p.id))
        : profiles;

    // 1. Form status — always present
    items.push(buildFormItem(leg.id, countryCode, countryLabel, leg.formStatus));

    // 2. QR code
    const legQrCount = qrCodes.filter((qr) => qr.legId === leg.id).length;
    const qrItem = buildQrItem(
      leg.id,
      countryCode,
      countryLabel,
      legQrCount,
      QR_REQUIRED_COUNTRIES.has(countryCode),
    );
    if (qrItem) items.push(qrItem);

    // 3. Passport validity (only when warning/expired)
    if (schema) {
      const passportItem = buildPassportItem(
        leg.id,
        countryCode,
        countryLabel,
        legProfiles,
        departureDateStr,
        schema,
      );
      if (passportItem) items.push(passportItem);
    }

    // 4. Deadline (only when upcoming and not ready)
    if (schema) {
      const deadlineItem = buildDeadlineItem(leg, countryLabel, schema);
      if (deadlineItem) {
        // Fix up tripId in deep link
        deadlineItem.deepLink.params.tripId = trip.id;
        items.push(deadlineItem);
      }
    }
  }

  const completedCount = items.filter((i) => i.status === 'complete').length;

  return {
    tripId: trip.id,
    tripName: trip.name,
    items,
    overallStatus: worstStatus(items),
    completedCount,
    totalCount: items.length,
  };
}
