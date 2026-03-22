/**
 * Passport validity check result returned by DocumentValidityService.
 *
 * All "days" fields are whole numbers (rounded down).
 */
export interface PassportValidityStatus {
  /** Whether the passport meets the destination country's validity requirement. */
  isValid: boolean;

  /**
   * Calendar days remaining between today and the passport expiry date.
   * Negative when the passport is already expired.
   */
  daysUntilExpiry: number;

  /**
   * Minimum number of days the passport must remain valid beyond the
   * departure date, derived from the country's passportValidityMonths field.
   * 0 when no country-specific buffer is required.
   */
  requiredValidityDays: number;

  /**
   * How many days short the passport falls relative to the required minimum.
   * 0 when the passport is valid (isValid === true).
   * Positive when the passport expires before the required buffer date.
   */
  shortfallDays: number;
}
