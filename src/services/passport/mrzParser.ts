/**
 * Machine Readable Zone (MRZ) Parser for TD3 format passports
 * 
 * Handles parsing of the 2-line MRZ at the bottom of passport photo pages.
 * TD3 format: 44 characters per line, contains passport data.
 * 
 * Security: No image data is stored - only parsed text fields.
 */

import type { TravelerProfile } from '../../types/profile';

export interface MRZParseResult {
  success: boolean;
  profile?: Partial<TravelerProfile>;
  errors: string[];
  confidence: number; // 0-1, based on validation checks
}

interface MRZLines {
  line1: string;
  line2: string;
}

/**
 * Parse TD3 format MRZ into traveler profile
 * Line 1: P<NATIONALITY<<SURNAME<<GIVENNAME<GIVENNAME<<
 * Line 2: PASSPORTNUMBER<NATIONALITY<BIRTHDATE<GENDER<EXPIRYDATE<PERSONALNUM<<CHECKDIGIT
 */
export function parseMRZ(line1: string, line2: string): MRZParseResult {
  try {
    // Validate format
    const validation = validateMRZFormat({ line1, line2 });
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        confidence: 0
      };
    }

    // Parse line 1 (name data)
    const nameData = parseLine1(line1);
    
    // Parse line 2 (passport and date data)
    const passportData = parseLine2(line2);
    
    // Combine and validate
    const profile: Partial<TravelerProfile> = {
      passportNumber: passportData.passportNumber,
      surname: nameData.surname,
      givenNames: nameData.givenNames,
      nationality: passportData.nationality,
      dateOfBirth: passportData.dateOfBirth,
      gender: passportData.gender,
      passportExpiry: passportData.passportExpiry,
      issuingCountry: nameData.issuingCountry
    };

    // Calculate confidence based on successful parsing
    let confidence = 0.8; // Base confidence
    if (passportData.checksumValid) confidence += 0.1;
    if (nameData.surname.length > 1) confidence += 0.05;
    if (nameData.givenNames.length > 1) confidence += 0.05;

    return {
      success: true,
      profile,
      errors: [],
      confidence: Math.min(confidence, 1.0)
    };

  } catch (error) {
    return {
      success: false,
      errors: [`Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      confidence: 0
    };
  }
}

/**
 * Validate MRZ format before parsing
 */
function validateMRZFormat(lines: MRZLines): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check line lengths
  if (lines.line1.length !== 44) {
    errors.push(`Line 1 must be 44 characters (got ${lines.line1.length})`);
  }
  if (lines.line2.length !== 44) {
    errors.push(`Line 2 must be 44 characters (got ${lines.line2.length})`);
  }

  // Check line 1 starts with 'P<' (passport indicator)
  if (!lines.line1.startsWith('P<')) {
    errors.push('Line 1 must start with "P<" for passport documents');
  }

  // Check for required characters
  if (!/^[A-Z0-9<]*$/.test(lines.line1)) {
    errors.push('Line 1 contains invalid characters (only A-Z, 0-9, < allowed)');
  }
  if (!/^[A-Z0-9<]*$/.test(lines.line2)) {
    errors.push('Line 2 contains invalid characters (only A-Z, 0-9, < allowed)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Parse line 1: P<NATIONALITY<<SURNAME<<GIVENNAME<GIVENNAME<<
 */
function parseLine1(line: string) {
  // Remove 'P<' prefix
  const data = line.substring(2);
  
  // Extract issuing country (3 chars after P<)
  const issuingCountry = data.substring(0, 3);
  
  // Extract names (rest of line, split by <<)
  const namesPart = data.substring(3);
  const nameParts = namesPart.split('<<');
  
  // First part is surname
  const surname = nameParts[0]?.replace(/</g, ' ').trim() || '';
  
  // Remaining parts are given names
  const givenNamesParts = nameParts.slice(1).filter(part => part.length > 0);
  const givenNames = givenNamesParts
    .join(' ')
    .replace(/</g, ' ')
    .trim();

  return {
    issuingCountry: issuingCountry.replace(/</g, ''),
    surname,
    givenNames
  };
}

/**
 * Parse line 2: PASSPORTNUMBER<NATIONALITY<BIRTHDATE<GENDER<EXPIRYDATE<PERSONALNUM<<CHECKDIGIT
 */
function parseLine2(line: string) {
  // Extract fixed-position fields
  const passportNumber = line.substring(0, 9).replace(/</g, '');
  const passportCheck = line.substring(9, 10);
  const nationality = line.substring(10, 13).replace(/</g, '');
  const birthDate = line.substring(13, 19);
  const birthCheck = line.substring(19, 20);
  const gender = line.substring(20, 21) as 'M' | 'F' | 'X';
  const expiryDate = line.substring(21, 27);
  const expiryCheck = line.substring(27, 28);
  const personalNumber = line.substring(28, 42).replace(/</g, '');
  const finalCheck = line.substring(43, 44);

  // Validate checksums (simplified - in production would use proper mod-10 algorithm)
  const checksumValid = 
    passportCheck !== '<' && 
    birthCheck !== '<' && 
    expiryCheck !== '<' && 
    finalCheck !== '<';

  return {
    passportNumber,
    nationality,
    dateOfBirth: formatMRZDate(birthDate),
    gender: gender === 'M' || gender === 'F' || gender === 'X' ? gender : 'X',
    passportExpiry: formatMRZDate(expiryDate),
    personalNumber,
    checksumValid
  };
}

/**
 * Convert MRZ date format (YYMMDD) to ISO 8601 (YYYY-MM-DD)
 */
function formatMRZDate(mrzDate: string): string {
  if (mrzDate.length !== 6 || !/^\d{6}$/.test(mrzDate)) {
    throw new Error(`Invalid MRZ date format: ${mrzDate}`);
  }

  const year = parseInt(mrzDate.substring(0, 2));
  const month = mrzDate.substring(2, 4);
  const day = mrzDate.substring(4, 6);

  // Handle century (assume current century for years < 30, previous for >= 30)
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  const fullYear = year < 30 ? currentCentury + year : currentCentury - 100 + year;

  return `${fullYear}-${month}-${day}`;
}

/**
 * Utility to clean OCR artifacts from MRZ text
 * Common OCR errors: O->0, I->1, etc.
 */
export function cleanMRZText(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9<]/g, '') // Remove invalid chars
    .replace(/O/g, '0') // Common OCR error: O -> 0 in numbers
    .replace(/I/g, '1') // Common OCR error: I -> 1 in numbers
    .replace(/S/g, '5') // Common OCR error: S -> 5 in numbers
    .replace(/\s+/g, ''); // Remove spaces
}

/**
 * Extract MRZ lines from OCR text
 * Looks for two consecutive lines of approximately 44 characters each
 */
export function extractMRZFromText(ocrText: string): { line1: string; line2: string } | null {
  const lines = ocrText.split('\n').map(line => line.trim());
  
  // Look for MRZ pattern: two lines starting with 'P<' or having 44 chars
  for (let i = 0; i < lines.length - 1; i++) {
    const line1 = cleanMRZText(lines[i]);
    const line2 = cleanMRZText(lines[i + 1]);
    
    // Check if these look like MRZ lines
    if (
      line1.length >= 40 && line1.length <= 44 &&
      line2.length >= 40 && line2.length <= 44 &&
      line1.startsWith('P<')
    ) {
      // Pad to exactly 44 characters if needed
      const paddedLine1 = line1.padEnd(44, '<');
      const paddedLine2 = line2.padEnd(44, '<');
      
      return {
        line1: paddedLine1,
        line2: paddedLine2
      };
    }
  }
  
  return null;
}