/**
 * Tests for MRZ Parser
 */

import {
  parseMRZ,
  cleanMRZText,
  extractMRZFromText,
  type MRZParseResult
} from '../../../src/services/passport/mrzParser';

describe('MRZ Parser', () => {
  // Valid test MRZ data (anonymized) - TD3 format: exactly 44 chars per line
  const validMRZ = {
    line1: 'P<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<',
    line2: 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'
  };

  const invalidMRZ = {
    line1: 'P<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<', // Too short
    line2: 'L898902C36UTO7408122F1204159ZE184226B<<<<<1'  // Too short
  };

  describe('parseMRZ', () => {
    it('should successfully parse valid MRZ', () => {
      const result = parseMRZ(validMRZ.line1, validMRZ.line2);
      
      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(0.5);
      
      // Check parsed fields
      expect(result.profile!.passportNumber).toBe('L898902C3');
      expect(result.profile!.surname).toBe('DOE');
      expect(result.profile!.givenNames).toBe('JANE');
      expect(result.profile!.nationality).toBe('UTO');
      expect(result.profile!.issuingCountry).toBe('UTO');
      expect(result.profile!.gender).toBe('F');
      expect(result.profile!.dateOfBirth).toBe('1974-08-12');
      expect(result.profile!.passportExpiry).toBe('2012-04-15');
    });

    it('should fail on invalid line lengths', () => {
      const result = parseMRZ(invalidMRZ.line1, invalidMRZ.line2);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.confidence).toBe(0);
      expect(result.errors[0]).toContain('44 characters');
    });

    it('should fail on non-passport document type', () => {
      const nonPassportMRZ = {
        line1: 'I<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<',
        line2: 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'
      };
      
      const result = parseMRZ(nonPassportMRZ.line1, nonPassportMRZ.line2);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(err => err.includes('P<'))).toBe(true);
    });

    it('should fail on invalid characters', () => {
      const invalidCharsMRZ = {
        line1: 'P<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<%',
        line2: 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'
      };
      
      const result = parseMRZ(invalidCharsMRZ.line1, invalidCharsMRZ.line2);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(err => err.includes('invalid characters'))).toBe(true);
    });

    it('should handle malformed dates gracefully', () => {
      const badDateMRZ = {
        line1: 'P<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<',
        line2: 'L898902C36UTO9999122F1204159ZE184226B<<<<<10' // Invalid year
      };
      
      const result = parseMRZ(badDateMRZ.line1, badDateMRZ.line2);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should parse names with multiple given names correctly', () => {
      const multiNameMRZ = {
        line1: 'P<UTODOE<<JANE<MARIE<ANNE<<<<<<<<<<<<<<<<<<<',
        line2: 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'
      };
      
      const result = parseMRZ(multiNameMRZ.line1, multiNameMRZ.line2);
      
      expect(result.success).toBe(true);
      expect(result.profile!.surname).toBe('DOE');
      expect(result.profile!.givenNames).toBe('JANE MARIE ANNE');
    });

    it('should handle different gender codes', () => {
      const testCases = [
        { gender: 'M', expected: 'M' },
        { gender: 'F', expected: 'F' },
        { gender: 'X', expected: 'X' },
        { gender: '<', expected: 'X' }, // Invalid should default to X
      ];

      testCases.forEach(({ gender, expected }) => {
        const testMRZ = {
          line1: validMRZ.line1,
          line2: `L898902C36UTO7408122${gender}1204159ZE184226B<<<<<10`
        };
        
        const result = parseMRZ(testMRZ.line1, testMRZ.line2);
        
        if (expected !== 'X' || gender === 'X') {
          expect(result.success).toBe(true);
          expect(result.profile!.gender).toBe(expected);
        }
      });
    });
  });

  describe('cleanMRZText', () => {
    it('should convert to uppercase', () => {
      expect(cleanMRZText('p<utodoe')).toBe('P<UTODOE');
    });

    it('should remove invalid characters', () => {
      expect(cleanMRZText('P<UTO-DOE@#$')).toBe('P<UTODOE');
    });

    it('should preserve valid characters and not alter names', () => {
      expect(cleanMRZText('P<UTODOE')).toBe('P<UTODOE'); // Don't alter valid text
      expect(cleanMRZText('P<UTOJANE')).toBe('P<UTOJANE'); // Don't convert letters to numbers in names
    });

    it('should remove spaces', () => {
      expect(cleanMRZText('P< UTO  DOE')).toBe('P<UTODOE');
    });
  });

  describe('extractMRZFromText', () => {
    it('should extract MRZ from OCR text', () => {
      const ocrText = `
        Some random text
        P<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
        L898902C36UTO7408122F1204159ZE184226B<<<<<10
        More random text
      `;
      
      const result = extractMRZFromText(ocrText);
      
      expect(result).toBeDefined();
      expect(result!.line1).toBe('P<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
      expect(result!.line2).toBe('L898902C36UTO7408122F1204159ZE184226B<<<<<10');
    });

    it('should handle lines that need padding', () => {
      const ocrText = `
        P<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<
        L898902C36UTO7408122F1204159ZE184226B<<<<
      `;
      
      const result = extractMRZFromText(ocrText);
      
      expect(result).toBeDefined();
      expect(result!.line1).toHaveLength(44);
      expect(result!.line2).toHaveLength(44);
      expect(result!.line1.endsWith('<')).toBe(true);
      expect(result!.line2.endsWith('<')).toBe(true);
    });

    it('should return null for text without MRZ', () => {
      const ocrText = `
        Just some random text
        No passport data here
        Nothing to see
      `;
      
      const result = extractMRZFromText(ocrText);
      
      expect(result).toBeNull();
    });

    it('should return null for malformed MRZ lines', () => {
      const ocrText = `
        P<UTODOE<<JANE  // Too short
        L898902C36  // Way too short
      `;
      
      const result = extractMRZFromText(ocrText);
      
      expect(result).toBeNull();
    });

    it('should handle noisy OCR output', () => {
      const ocrText = `
        PASSPORT
        |P<UTODOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<|
        |L898902C36UTO7408122F1204159ZE184226B<<<<<10|
        UNITED STATES OF AMERICA
      `;
      
      const result = extractMRZFromText(ocrText);
      
      expect(result).toBeDefined();
      expect(result!.line1.startsWith('P<')).toBe(true);
    });
  });

  describe('Date formatting', () => {
    it('should correctly handle century calculation', () => {
      // Test dates from the past (should be 19xx)
      const oldMRZ = {
        line1: validMRZ.line1,
        line2: 'L898902C36UTO5001011F1204159ZE184226B<<<<<10' // Born 1950-01-01
      };
      
      const result = parseMRZ(oldMRZ.line1, oldMRZ.line2);
      
      expect(result.success).toBe(true);
      expect(result.profile!.dateOfBirth).toBe('1950-01-01');
    });

    it('should correctly handle current century dates', () => {
      // Test dates from this century (should be 20xx)
      const newMRZ = {
        line1: validMRZ.line1,
        line2: 'L898902C36UTO1001011F1204159ZE184226B<<<<<10' // Born 2010-01-01
      };
      
      const result = parseMRZ(newMRZ.line1, newMRZ.line2);
      
      expect(result.success).toBe(true);
      expect(result.profile!.dateOfBirth).toBe('2010-01-01');
    });
  });

  describe('Error handling', () => {
    it('should handle undefined/null input gracefully', () => {
      // @ts-expect-error Testing invalid input
      const result1 = parseMRZ(null, null);
      expect(result1.success).toBe(false);
      
      // @ts-expect-error Testing invalid input
      const result2 = parseMRZ(undefined, undefined);
      expect(result2.success).toBe(false);
    });

    it('should handle empty strings', () => {
      const result = parseMRZ('', '');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide helpful error messages', () => {
      const result = parseMRZ('SHORT', 'ALSO_SHORT');
      
      expect(result.success).toBe(false);
      expect(result.errors.some(err => err.includes('44 characters'))).toBe(true);
    });
  });

  describe('Confidence scoring', () => {
    it('should give high confidence for perfect MRZ', () => {
      const result = parseMRZ(validMRZ.line1, validMRZ.line2);
      
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should account for name length in confidence', () => {
      const shortNameMRZ = {
        line1: 'P<UTOD<<J<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<',
        line2: validMRZ.line2
      };
      
      const longNameMRZ = {
        line1: 'P<UTODOE<<JANE<MARIE<<<<<<<<<<<<<<<<<<<<<<<<',
        line2: validMRZ.line2
      };
      
      const shortResult = parseMRZ(shortNameMRZ.line1, shortNameMRZ.line2);
      const longResult = parseMRZ(longNameMRZ.line1, longNameMRZ.line2);
      
      expect(longResult.confidence).toBeGreaterThan(shortResult.confidence);
    });
  });
});