import {
  isValidISODate,
  isFutureDate,
  isPastDate,
  isValidTravelDate,
  isValidPassportExpiry,
  isValidBirthDate,
  calculateDaysBetween,
  calculateStayDuration,
  formatDateForDisplay,
  formatDateForPortal,
  toISODateString,
  getTodayISO,
  addDays,
  subtractDays,
  isWithinSubmissionWindow,
  parseSubmissionTiming,
  getRecommendedSubmissionDate,
  shouldRemindToSubmit,
  calculateAge,
  validateDateRange,
} from '../../src/utils/dateUtils';

describe('Date Utils', () => {
  describe('isValidISODate', () => {
    it('should validate correct ISO dates', () => {
      expect(isValidISODate('2025-01-15')).toBe(true);
      expect(isValidISODate('2025-12-31')).toBe(true);
      expect(isValidISODate('2024-02-29')).toBe(true); // Leap year
    });

    it('should reject invalid ISO dates', () => {
      expect(isValidISODate('2025-13-01')).toBe(false); // Invalid month
      expect(isValidISODate('2025-01-32')).toBe(false); // Invalid day
      expect(isValidISODate('2025/01/15')).toBe(false); // Wrong format
      expect(isValidISODate('invalid')).toBe(false);
      expect(isValidISODate('')).toBe(false);
      expect(isValidISODate('2023-02-29')).toBe(false); // Non-leap year
    });
  });

  describe('isFutureDate', () => {
    it('should identify future dates correctly', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = toISODateString(tomorrow);
      
      expect(isFutureDate(tomorrowISO)).toBe(true);
    });

    it('should identify past dates correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISO = toISODateString(yesterday);
      
      expect(isFutureDate(yesterdayISO)).toBe(false);
    });

    it('should handle today correctly', () => {
      const today = getTodayISO();
      expect(isFutureDate(today)).toBe(false);
    });
  });

  describe('isPastDate', () => {
    it('should identify past dates correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISO = toISODateString(yesterday);
      
      expect(isPastDate(yesterdayISO)).toBe(true);
    });

    it('should identify future dates correctly', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = toISODateString(tomorrow);
      
      expect(isPastDate(tomorrowISO)).toBe(false);
    });

    it('should handle today correctly', () => {
      const today = getTodayISO();
      expect(isPastDate(today)).toBe(false);
    });
  });

  describe('isValidTravelDate', () => {
    it('should accept dates within travel window', () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthISO = toISODateString(nextMonth);
      
      expect(isValidTravelDate(nextMonthISO)).toBe(true);
    });

    it('should reject dates too far in the future', () => {
      const twoYearsAhead = new Date();
      twoYearsAhead.setFullYear(twoYearsAhead.getFullYear() + 2);
      const twoYearsAheadISO = toISODateString(twoYearsAhead);
      
      expect(isValidTravelDate(twoYearsAheadISO)).toBe(false);
    });

    it('should reject past dates', () => {
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      const lastYearISO = toISODateString(lastYear);
      
      expect(isValidTravelDate(lastYearISO)).toBe(false);
    });
  });

  describe('isValidPassportExpiry', () => {
    it('should accept valid passport expiry dates', () => {
      const fiveYearsAhead = new Date();
      fiveYearsAhead.setFullYear(fiveYearsAhead.getFullYear() + 5);
      const fiveYearsAheadISO = toISODateString(fiveYearsAhead);
      
      expect(isValidPassportExpiry(fiveYearsAheadISO)).toBe(true);
    });

    it('should reject expired passports', () => {
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      const lastYearISO = toISODateString(lastYear);
      
      expect(isValidPassportExpiry(lastYearISO)).toBe(false);
    });

    it('should reject passports expiring too far in future', () => {
      const fifteenYearsAhead = new Date();
      fifteenYearsAhead.setFullYear(fifteenYearsAhead.getFullYear() + 15);
      const fifteenYearsAheadISO = toISODateString(fifteenYearsAhead);
      
      expect(isValidPassportExpiry(fifteenYearsAheadISO)).toBe(false);
    });
  });

  describe('isValidBirthDate', () => {
    it('should accept valid adult birth dates', () => {
      const thirtyYearsAgo = new Date();
      thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
      const thirtyYearsAgoISO = toISODateString(thirtyYearsAgo);
      
      expect(isValidBirthDate(thirtyYearsAgoISO)).toBe(true);
    });

    it('should reject birth dates for minors', () => {
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      const tenYearsAgoISO = toISODateString(tenYearsAgo);
      
      expect(isValidBirthDate(tenYearsAgoISO)).toBe(false);
    });

    it('should reject unrealistic old birth dates', () => {
      const hundredTwentyYearsAgo = new Date();
      hundredTwentyYearsAgo.setFullYear(hundredTwentyYearsAgo.getFullYear() - 120);
      const hundredTwentyYearsAgoISO = toISODateString(hundredTwentyYearsAgo);
      
      expect(isValidBirthDate(hundredTwentyYearsAgoISO)).toBe(false);
    });

    it('should handle edge case around 18th birthday', () => {
      const exactlyEighteenYearsAgo = new Date();
      exactlyEighteenYearsAgo.setFullYear(exactlyEighteenYearsAgo.getFullYear() - 18);
      exactlyEighteenYearsAgo.setDate(exactlyEighteenYearsAgo.getDate() - 1); // One day past 18th birthday
      const exactlyEighteenISO = toISODateString(exactlyEighteenYearsAgo);
      
      expect(isValidBirthDate(exactlyEighteenISO)).toBe(true);
    });
  });

  describe('calculateDaysBetween', () => {
    it('should calculate days correctly', () => {
      expect(calculateDaysBetween('2025-01-01', '2025-01-11')).toBe(10);
      expect(calculateDaysBetween('2025-01-01', '2025-01-02')).toBe(1);
    });

    it('should return null for invalid dates', () => {
      expect(calculateDaysBetween('invalid', '2025-01-01')).toBeNull();
      expect(calculateDaysBetween('2025-01-01', 'invalid')).toBeNull();
    });

    it('should return null for end date before start date', () => {
      expect(calculateDaysBetween('2025-01-02', '2025-01-01')).toBeNull();
    });

    it('should handle same dates', () => {
      expect(calculateDaysBetween('2025-01-01', '2025-01-01')).toBeNull();
    });
  });

  describe('calculateStayDuration', () => {
    it('should calculate stay duration correctly', () => {
      expect(calculateStayDuration('2025-01-01', '2025-01-11')).toBe(10);
    });

    it('should return null when departure date is missing', () => {
      expect(calculateStayDuration('2025-01-01')).toBeNull();
      expect(calculateStayDuration('2025-01-01', undefined)).toBeNull();
    });
  });

  describe('formatDateForDisplay', () => {
    it('should format date for display', () => {
      const formatted = formatDateForDisplay('2025-01-15');
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('should return original string for invalid dates', () => {
      expect(formatDateForDisplay('invalid')).toBe('invalid');
    });
  });

  describe('formatDateForPortal', () => {
    it('should format date for US format', () => {
      expect(formatDateForPortal('2025-01-15', 'US')).toBe('01/15/2025');
    });

    it('should format date for EU format', () => {
      expect(formatDateForPortal('2025-01-15', 'EU')).toBe('15/01/2025');
    });

    it('should default to US format', () => {
      expect(formatDateForPortal('2025-01-15')).toBe('01/15/2025');
    });

    it('should return original string for invalid dates', () => {
      expect(formatDateForPortal('invalid')).toBe('invalid');
    });
  });

  describe('toISODateString', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date(2025, 0, 15); // Month is 0-indexed
      expect(toISODateString(date)).toBe('2025-01-15');
    });
  });

  describe('getTodayISO', () => {
    it('should return today in ISO format', () => {
      const today = getTodayISO();
      expect(isValidISODate(today)).toBe(true);
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      expect(addDays('2025-01-01', 10)).toBe('2025-01-11');
      expect(addDays('2025-01-01', 0)).toBe('2025-01-01');
    });

    it('should handle month boundaries', () => {
      expect(addDays('2025-01-31', 1)).toBe('2025-02-01');
    });

    it('should handle year boundaries', () => {
      expect(addDays('2024-12-31', 1)).toBe('2025-01-01');
    });

    it('should return null for invalid dates', () => {
      expect(addDays('invalid', 1)).toBeNull();
    });
  });

  describe('subtractDays', () => {
    it('should subtract days correctly', () => {
      expect(subtractDays('2025-01-11', 10)).toBe('2025-01-01');
    });

    it('should handle month boundaries', () => {
      expect(subtractDays('2025-02-01', 1)).toBe('2025-01-31');
    });

    it('should return null for invalid dates', () => {
      expect(subtractDays('invalid', 1)).toBeNull();
    });
  });

  describe('isWithinSubmissionWindow', () => {
    it('should validate submission window correctly', () => {
      const arrival = '2025-07-15';
      const current = '2025-07-01'; // 14 days before
      
      // Window: 14 days early to 1 day early (14-1)
      expect(isWithinSubmissionWindow(arrival, current, 14, 1)).toBe(true);
    });

    it('should reject dates outside window', () => {
      const arrival = '2025-07-15';
      const tooEarly = '2025-06-01'; // 44 days before - too early
      const tooLate = '2025-07-15'; // Day of arrival - too late (0 days)
      
      expect(isWithinSubmissionWindow(arrival, tooEarly, 14, 1)).toBe(false);
      expect(isWithinSubmissionWindow(arrival, tooLate, 14, 1)).toBe(false);
    });
  });

  describe('parseSubmissionTiming', () => {
    it('should parse day timing', () => {
      expect(parseSubmissionTiming('14d')).toBe(14);
      expect(parseSubmissionTiming('7d')).toBe(7);
    });

    it('should parse hour timing', () => {
      expect(parseSubmissionTiming('72h')).toBe(3); // 72 hours = 3 days
      expect(parseSubmissionTiming('24h')).toBe(1); // 24 hours = 1 day
    });

    it('should parse minute timing', () => {
      expect(parseSubmissionTiming('1440m')).toBe(1); // 1440 minutes = 1 day
    });

    it('should handle invalid timing', () => {
      expect(parseSubmissionTiming('invalid')).toBe(0);
      expect(parseSubmissionTiming('14x')).toBe(0);
    });
  });

  describe('getRecommendedSubmissionDate', () => {
    it('should calculate recommended submission date', () => {
      const result = getRecommendedSubmissionDate('2025-07-15', '72h');
      expect(result).toBe('2025-07-12'); // 3 days before
    });

    it('should return null for invalid dates', () => {
      expect(getRecommendedSubmissionDate('invalid', '72h')).toBeNull();
    });
  });

  describe('shouldRemindToSubmit', () => {
    it('should remind when past recommended date', () => {
      const arrival = '2025-07-15';
      const recommended = '72h'; // 3 days before = 2025-07-12
      const current = '2025-07-13'; // After recommended date
      
      expect(shouldRemindToSubmit(arrival, recommended, current)).toBe(true);
    });

    it('should not remind when before recommended date', () => {
      const arrival = '2025-07-15';
      const recommended = '72h'; // 3 days before = 2025-07-12
      const current = '2025-07-10'; // Before recommended date
      
      expect(shouldRemindToSubmit(arrival, recommended, current)).toBe(false);
    });
  });

  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = '1990-01-15';
      const referenceDate = '2025-01-15'; // Exactly 35 years later
      
      expect(calculateAge(birthDate, referenceDate)).toBe(35);
    });

    it('should handle birthday not yet occurred this year', () => {
      const birthDate = '1990-06-15';
      const referenceDate = '2025-01-15'; // Before birthday
      
      expect(calculateAge(birthDate, referenceDate)).toBe(34);
    });

    it('should handle birthday already occurred this year', () => {
      const birthDate = '1990-01-15';
      const referenceDate = '2025-06-15'; // After birthday
      
      expect(calculateAge(birthDate, referenceDate)).toBe(35);
    });

    it('should use current date when no reference provided', () => {
      const birthDate = '1990-01-15';
      const age = calculateAge(birthDate);
      
      expect(age).toBeGreaterThanOrEqual(30);
      expect(age).toBeLessThan(100);
    });

    it('should return null for invalid birth date', () => {
      expect(calculateAge('invalid')).toBeNull();
    });
  });

  describe('validateDateRange', () => {
    it('should validate correct date ranges', () => {
      const result = validateDateRange('2025-01-01', '2025-01-10');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject end date before start date', () => {
      const result = validateDateRange('2025-01-10', '2025-01-01');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('End date must be after start date');
    });

    it('should reject trips longer than 365 days', () => {
      const result = validateDateRange('2025-01-01', '2026-01-02'); // 366 days
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed 365 days');
    });

    it('should reject invalid date formats', () => {
      const result = validateDateRange('invalid', '2025-01-01');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid start date format');
    });

    it('should handle edge case of exactly 365 days', () => {
      const result = validateDateRange('2025-01-01', '2025-12-31'); // Exactly 365 days in non-leap year
      
      expect(result.isValid).toBe(true);
    });
  });
});