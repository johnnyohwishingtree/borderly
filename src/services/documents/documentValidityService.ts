import { TravelerProfile } from '../../types/profile';
import { CountryFormSchema } from '../../types/schema';
import { PassportValidityStatus } from '../../types/document';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Adds N calendar months to a date, respecting month-end edge cases.
 *
 * Examples:
 *  - Jan 31 + 1 month = Feb 28/29 (clamped to last day of month)
 *  - Jan 31 + 3 months = Apr 30
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const targetMonth = result.getMonth() + months;
  // Set year and month — JavaScript handles year rollovers automatically.
  result.setMonth(targetMonth);

  // If the day overflowed (e.g., Jan 31 + 1 = Mar 3), roll back to the last
  // valid day of the intended month.
  const expectedMonth = ((targetMonth % 12) + 12) % 12;
  if (result.getMonth() !== expectedMonth) {
    // Overflow: go back to the last day of the intended month
    result.setDate(0); // 0 = last day of previous month
  }

  return result;
}

/**
 * Computes the number of whole days between two dates (positive means `end`
 * is after `start`).
 */
function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * Checks whether a traveler's passport is valid for a trip leg to a given
 * country, taking into account the country's required passport validity buffer
 * beyond the departure date.
 *
 * @param passport       - The traveler's profile (must have `passportExpiry`).
 * @param departureDate  - ISO 8601 date string of the departure date for this leg.
 * @param schema         - The destination country's form schema. Uses
 *                         `schema.passportValidityMonths` as the required buffer
 *                         (0 when undefined).
 * @returns PassportValidityStatus with validity and shortfall information.
 */
export function checkPassportValidity(
  passport: TravelerProfile,
  departureDate: string,
  schema: CountryFormSchema,
): PassportValidityStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Compare at day granularity

  const expiryDate = new Date(passport.passportExpiry);
  expiryDate.setHours(0, 0, 0, 0);

  const departure = new Date(departureDate);
  departure.setHours(0, 0, 0, 0);

  const requiredMonths = schema.passportValidityMonths ?? 0;

  // The passport must remain valid until at least:
  //   departure + requiredValidityMonths calendar months
  const minimumExpiryDate =
    requiredMonths > 0 ? addMonths(departure, requiredMonths) : departure;

  const daysUntilExpiry = daysBetween(today, expiryDate);
  const requiredValidityDays = daysBetween(departure, minimumExpiryDate);
  const shortfallDays = Math.max(0, daysBetween(expiryDate, minimumExpiryDate));
  const isValid = shortfallDays === 0;

  return {
    isValid,
    daysUntilExpiry,
    requiredValidityDays,
    shortfallDays,
  };
}
