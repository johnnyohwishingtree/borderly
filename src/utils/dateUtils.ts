/**
 * Date utilities for form validation, formatting, and travel-specific calculations.
 * Handles date manipulation for travel forms, visa requirements, and government portals.
 */

/**
 * Validates if a date string is in ISO 8601 format and represents a valid date.
 */
export function isValidISODate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  // Check if string matches ISO 8601 date format (YYYY-MM-DD)
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(dateString);
}

/**
 * Validates if a date is in the future (after today).
 */
export function isFutureDate(dateString: string): boolean {
  if (!isValidISODate(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  return date > today;
}

/**
 * Validates if a date is in the past (before today).
 */
export function isPastDate(dateString: string): boolean {
  if (!isValidISODate(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  return date < today;
}

/**
 * Validates if a date is within a reasonable travel window (1 year from now).
 */
export function isValidTravelDate(dateString: string): boolean {
  if (!isValidISODate(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  const today = new Date();
  const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

  return date >= today && date <= oneYearFromNow;
}

/**
 * Validates if a passport expiry date is valid (in the future, within 10 years).
 */
export function isValidPassportExpiry(dateString: string): boolean {
  if (!isValidISODate(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  const today = new Date();
  const tenYearsFromNow = new Date(today.getFullYear() + 10, today.getMonth(), today.getDate());

  return date > today && date <= tenYearsFromNow;
}

/**
 * Validates if a birth date is reasonable (between 18-100 years ago).
 */
export function isValidBirthDate(dateString: string): boolean {
  if (!isValidISODate(dateString)) {
    return false;
  }

  const birthDate = new Date(dateString);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred this year
  const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ? age - 1
    : age;

  return adjustedAge >= 18 && adjustedAge <= 100;
}

/**
 * Calculates the number of days between two dates.
 */
export function calculateDaysBetween(startDate: string, endDate: string): number | null {
  if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return null;
  }

  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * Calculates the duration of stay from arrival to departure date.
 */
export function calculateStayDuration(arrivalDate: string, departureDate?: string): number | null {
  if (!departureDate) {
    return null;
  }

  return calculateDaysBetween(arrivalDate, departureDate);
}

/**
 * Formats a date for display in forms (localized format).
 */
export function formatDateForDisplay(dateString: string, locale = 'en-US'): string {
  if (!isValidISODate(dateString)) {
    return dateString;
  }

  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats a date for government portals (usually MM/DD/YYYY or DD/MM/YYYY).
 */
export function formatDateForPortal(dateString: string, format: 'US' | 'EU' = 'US'): string {
  if (!isValidISODate(dateString)) {
    return dateString;
  }

  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return format === 'US' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
}

/**
 * Converts a date to ISO 8601 format (YYYY-MM-DD).
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Gets today's date in ISO 8601 format.
 */
export function getTodayISO(): string {
  return toISODateString(new Date());
}

/**
 * Adds days to a date and returns the result in ISO format.
 */
export function addDays(dateString: string, days: number): string | null {
  if (!isValidISODate(dateString)) {
    return null;
  }

  const date = new Date(dateString);
  date.setDate(date.getDate() + days);

  return toISODateString(date);
}

/**
 * Subtracts days from a date and returns the result in ISO format.
 */
export function subtractDays(dateString: string, days: number): string | null {
  return addDays(dateString, -days);
}

/**
 * Validates if a date is within the submission window for a country.
 */
export function isWithinSubmissionWindow(
  arrivalDate: string,
  currentDate: string,
  earliestDays: number,
  latestDays: number
): boolean {
  if (!isValidISODate(arrivalDate) || !isValidISODate(currentDate)) {
    return false;
  }

  const daysUntilArrival = calculateDaysBetween(currentDate, arrivalDate);

  if (daysUntilArrival === null) {
    return false;
  }

  return daysUntilArrival >= latestDays && daysUntilArrival <= earliestDays;
}

/**
 * Parses submission timing strings (e.g., "14d", "72h") into days.
 */
export function parseSubmissionTiming(timing: string): number {
  const match = timing.match(/^(\d+)([dhm])$/);
  if (!match) {
    return 0;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value;
    case 'h':
      return Math.ceil(value / 24);
    case 'm':
      return Math.ceil(value / (24 * 60));
    default:
      return 0;
  }
}

/**
 * Gets recommended submission date for a form based on country requirements.
 */
export function getRecommendedSubmissionDate(
  arrivalDate: string,
  recommendedTiming: string
): string | null {
  if (!isValidISODate(arrivalDate)) {
    return null;
  }

  const recommendedDaysBefore = parseSubmissionTiming(recommendedTiming);
  return subtractDays(arrivalDate, recommendedDaysBefore);
}

/**
 * Checks if it's time to remind user to submit forms.
 */
export function shouldRemindToSubmit(
  arrivalDate: string,
  recommendedTiming: string,
  currentDate = getTodayISO()
): boolean {
  const recommendedDate = getRecommendedSubmissionDate(arrivalDate, recommendedTiming);
  if (!recommendedDate) {
    return false;
  }

  return currentDate >= recommendedDate;
}

/**
 * Age calculation for forms that require age instead of birth date.
 */
export function calculateAge(birthDate: string, referenceDate?: string): number | null {
  if (!isValidISODate(birthDate)) {
    return null;
  }

  const birth = new Date(birthDate);
  const reference = referenceDate ? new Date(referenceDate) : new Date();

  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();

  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Validates date ranges for travel (departure must be after arrival).
 */
export function validateDateRange(startDate: string, endDate: string): {
  isValid: boolean;
  error?: string;
} {
  if (!isValidISODate(startDate)) {
    return { isValid: false, error: 'Invalid start date format' };
  }

  if (!isValidISODate(endDate)) {
    return { isValid: false, error: 'Invalid end date format' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return { isValid: false, error: 'End date must be after start date' };
  }

  const duration = calculateDaysBetween(startDate, endDate);
  if (duration && duration > 365) {
    return { isValid: false, error: 'Trip duration cannot exceed 365 days' };
  }

  return { isValid: true };
}