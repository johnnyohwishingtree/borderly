/**
 * ReadinessService — aggregates per-trip health signals into a TripReadiness model.
 *
 * This is a pure-function service: no side effects, no store imports. All data
 * is passed as arguments so the service is trivially testable.
 */

import { Trip, SavedQRCode } from '../../types/trip';
import { TravelerProfile } from '../../types/profile';
import { CountryFormSchema } from '../../types/schema';
import { QR_REQUIRED_COUNTRY_CODES, CONFIRMATION_CODE_COUNTRY_CODES } from '../../constants/countries';
import { checkPassportValidity } from '../documents/documentValidityService';
import { computeLegDeadline, getUrgencyLevel } from '../deadline/deadlineService';
import { ReadinessItem, ReadinessItemStatus, TripReadiness } from './readinessTypes';

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------


/**
 * Numeric severity ordering so we can compare ReadinessItemStatus values.
 * Higher number = worse severity.
 */
const SEVERITY: Record<ReadinessItemStatus, number> = {
  ok: 0,
  warning: 1,
  critical: 2,
  missing: 3,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the single worst (highest-severity) status across all items.
 * Returns 'ok' when the item list is empty.
 */
export function getOverallStatus(items: ReadinessItem[]): ReadinessItemStatus {
  if (items.length === 0) {
    return 'ok';
  }
  return items.reduce<ReadinessItemStatus>((worst, item) => {
    return SEVERITY[item.status] > SEVERITY[worst] ? item.status : worst;
  }, 'ok');
}

/**
 * Computes a complete TripReadiness snapshot for the given trip.
 *
 * Produces one ReadinessItem per signal category per leg:
 *   1. Passport validity  — uses DocumentValidityService.checkPassportValidity
 *   2. Form completion    — derived from leg.formStatus
 *   3. QR code presence   — checks qrCodes wallet for QR-required destinations
 *   4. Deadline status    — uses DeadlineService.computeLegDeadline
 *
 * @param trip      - The trip whose legs to assess.
 * @param profiles  - All traveler profiles on-device.
 * @param schemas   - Map of ISO-3166-1 alpha-3 country code → CountryFormSchema.
 * @param qrCodes   - All QR codes currently stored in the wallet.
 */
export async function computeTripReadiness(
  trip: Trip,
  profiles: TravelerProfile[],
  schemas: Record<string, CountryFormSchema>,
  qrCodes: SavedQRCode[],
): Promise<TripReadiness> {
  const items: ReadinessItem[] = [];

  for (const leg of trip.legs) {
    const schema = schemas[leg.destinationCountry];
    const departureDateStr = leg.departureDate ?? leg.arrivalDate;
    const countryCode = leg.destinationCountry;
    const countryLabel = schema?.countryName ?? countryCode;

    // Determine which profiles apply to this leg:
    //   • If travelers are explicitly assigned, use only those.
    //   • Otherwise fall back to all available profiles.
    const legProfiles =
      leg.assignedTravelers && leg.assignedTravelers.length > 0
        ? profiles.filter((p) => (leg.assignedTravelers as string[]).includes(p.id))
        : profiles;

    // -----------------------------------------------------------------------
    // 1. Passport validity
    // -----------------------------------------------------------------------
    if (legProfiles.length > 0 && schema) {
      interface PassportSignal {
        status: ReadinessItemStatus;
        detail: string | undefined;
      }

      const passportSignals: PassportSignal[] = legProfiles.map((profile) => {
        const validity = checkPassportValidity(profile, departureDateStr, schema);

        const expiryDate = new Date(profile.passportExpiry);
        const departure = new Date(departureDateStr);
        expiryDate.setHours(0, 0, 0, 0);
        departure.setHours(0, 0, 0, 0);

        if (expiryDate < departure) {
          return {
            status: 'critical' as ReadinessItemStatus,
            detail: `Passport for ${profile.surname} expires before departure`,
          };
        }

        if (!validity.isValid) {
          // Valid at departure but doesn't meet the country's validity-buffer requirement
          return {
            status: 'warning' as ReadinessItemStatus,
            detail: `Passport for ${profile.surname} may not meet ${countryLabel}'s validity requirement`,
          };
        }

        return { status: 'ok' as ReadinessItemStatus, detail: undefined };
      });

      // Aggregate: surface the worst status across all travelers on this leg
      const worstStatus = passportSignals.reduce<ReadinessItemStatus>(
        (worst, s) => (SEVERITY[s.status] > SEVERITY[worst] ? s.status : worst),
        'ok',
      );
      const worstDetail = passportSignals.find((s) => s.status === worstStatus)?.detail;

      items.push({
        id: `passport-${leg.id}`,
        category: 'passport',
        label: `Passport validity — ${countryLabel}`,
        status: worstStatus,
        ...(worstDetail !== undefined ? { detail: worstDetail } : {}),
        actionScreen: 'Profile',
      });
    }

    // -----------------------------------------------------------------------
    // 2. Form completion
    // -----------------------------------------------------------------------
    const formStatusToReadiness: Record<string, ReadinessItemStatus> = {
      submitted: 'ok',
      ready: 'ok',
      in_progress: 'warning',
      not_started: 'critical',
    };

    const formStatusDetails: Record<string, string> = {
      submitted: 'Form submitted',
      ready: 'Form ready to submit',
      in_progress: 'Form partially completed',
      not_started: 'Form not started',
    };

    const formStatus: ReadinessItemStatus =
      formStatusToReadiness[leg.formStatus] ?? 'critical';

    items.push({
      id: `form-${leg.id}`,
      category: 'form',
      label: `Declaration form — ${countryLabel}`,
      status: formStatus,
      detail: formStatusDetails[leg.formStatus],
      actionScreen: 'LegForm',
    });

    // -----------------------------------------------------------------------
    // 3. QR code presence
    // -----------------------------------------------------------------------
    const legQrCodes = qrCodes.filter((qr) => qr.legId === leg.id);
    const requiresQr = QR_REQUIRED_COUNTRY_CODES.has(countryCode);

    if (requiresQr) {
      const qrStatus: ReadinessItemStatus = legQrCodes.length > 0 ? 'ok' : 'missing';
      items.push({
        id: `qr-${leg.id}`,
        category: 'qr',
        label: `QR code — ${countryLabel}`,
        status: qrStatus,
        detail:
          legQrCodes.length > 0
            ? `${legQrCodes.length} QR code(s) saved`
            : 'No QR code saved — required for e-Gate entry',
        actionScreen: 'QRWallet',
      });
    } else if (legQrCodes.length > 0) {
      // Country doesn't require a QR but one exists — show as ok
      items.push({
        id: `qr-${leg.id}`,
        category: 'qr',
        label: `QR code — ${countryLabel}`,
        status: 'ok',
        detail: `${legQrCodes.length} QR code(s) saved`,
        actionScreen: 'QRWallet',
      });
    }

    // -----------------------------------------------------------------------
    // 4. Confirmation code presence
    // -----------------------------------------------------------------------
    if (CONFIRMATION_CODE_COUNTRY_CODES.has(countryCode)) {
      const legConfirmationCodes = qrCodes.filter((qr) => qr.legId === leg.id);
      const confirmationStatus: ReadinessItemStatus =
        legConfirmationCodes.length > 0 ? 'ok' : 'missing';
      items.push({
        id: `confirmation-${leg.id}`,
        category: 'confirmation',
        label: `Confirmation code — ${countryLabel}`,
        status: confirmationStatus,
        detail:
          legConfirmationCodes.length > 0
            ? `${legConfirmationCodes.length} confirmation code(s) saved`
            : 'No confirmation code saved — check email for reference code',
        actionScreen: 'QRWallet',
      });
    }

    // -----------------------------------------------------------------------
    // 5. Deadline status
    // -----------------------------------------------------------------------
    if (schema) {
      const deadline = computeLegDeadline(leg, schema);
      const urgency = getUrgencyLevel(deadline);

      let deadlineStatus: ReadinessItemStatus;

      if (deadline.status === 'ready' || deadline.status === 'no-deadline') {
        deadlineStatus = 'ok';
      } else if (deadline.status === 'overdue' || urgency === 'overdue') {
        deadlineStatus = 'critical';
      } else if (urgency === 'critical') {
        deadlineStatus = 'critical';
      } else if (urgency === 'warning') {
        deadlineStatus = 'warning';
      } else {
        // not-started or in-progress with ample time remaining
        deadlineStatus = 'warning';
      }

      items.push({
        id: `deadline-${leg.id}`,
        category: 'deadline',
        label: `Submission deadline — ${countryLabel}`,
        status: deadlineStatus,
        ...(deadline.windowNote ? { detail: deadline.windowNote } : {}),
        actionScreen: 'TripDetail',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Aggregate
  // -------------------------------------------------------------------------
  const overallStatus = getOverallStatus(items);
  const readyCount = items.filter((item) => item.status === 'ok').length;
  const totalCount = items.length;

  // Earliest departure (or arrival) date across all legs
  const legDates = trip.legs.map((leg) => new Date(leg.departureDate ?? leg.arrivalDate));
  const departureDate =
    legDates.length > 0
      ? legDates.reduce((earliest, d) => (d < earliest ? d : earliest))
      : new Date();

  return {
    tripId: trip.id,
    overallStatus,
    items,
    readyCount,
    totalCount,
    departureDate,
  };
}
