/**
 * Data transformation utilities for portal automation
 */

export class DataTransformer {
  /**
   * Transform date formats for different portals
   */
  static transformDate(
    date: string,
    fromFormat: string,
    toFormat: string,
    _locale?: string
  ): string {
    try {
      // Parse the input date based on format
      let parsedDate: Date;

      if (fromFormat === 'YYYY-MM-DD') {
        parsedDate = new Date(date);
      } else if (fromFormat === 'DD/MM/YYYY') {
        const [day, month, year] = date.split('/');
        parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (fromFormat === 'MM/DD/YYYY') {
        const [month, day, year] = date.split('/');
        parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        parsedDate = new Date(date);
      }

      if (isNaN(parsedDate.getTime())) {
        return date; // Return original if parsing failed
      }

      // Format according to target format
      switch (toFormat) {
        case 'YYYY-MM-DD':
          return parsedDate.toISOString().split('T')[0];

        case 'DD/MM/YYYY':
          return `${parsedDate.getDate().toString().padStart(2, '0')}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;

        case 'MM/DD/YYYY':
          return `${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getDate().toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;

        case 'DD-MM-YYYY':
          return `${parsedDate.getDate().toString().padStart(2, '0')}-${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}-${parsedDate.getFullYear()}`;

        case 'YYYY/MM/DD':
          return `${parsedDate.getFullYear()}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getDate().toString().padStart(2, '0')}`;

        default:
          return date;
      }
    } catch (error) {
      console.warn('Date transformation failed:', error);
      return date;
    }
  }

  /**
   * Transform country codes between different formats
   */
  static transformCountryCode(
    countryCode: string,
    fromFormat: 'ISO2' | 'ISO3' | 'NAME',
    toFormat: 'ISO2' | 'ISO3' | 'NAME'
  ): string {
    const countryMappings: Record<string, Record<'ISO2' | 'ISO3' | 'NAME', string>> = {
      'US': { ISO2: 'US', ISO3: 'USA', NAME: 'United States' },
      'GB': { ISO2: 'GB', ISO3: 'GBR', NAME: 'United Kingdom' },
      'CA': { ISO2: 'CA', ISO3: 'CAN', NAME: 'Canada' },
      'AU': { ISO2: 'AU', ISO3: 'AUS', NAME: 'Australia' },
      'DE': { ISO2: 'DE', ISO3: 'DEU', NAME: 'Germany' },
      'FR': { ISO2: 'FR', ISO3: 'FRA', NAME: 'France' },
      'JP': { ISO2: 'JP', ISO3: 'JPN', NAME: 'Japan' },
      'KR': { ISO2: 'KR', ISO3: 'KOR', NAME: 'South Korea' },
      'CN': { ISO2: 'CN', ISO3: 'CHN', NAME: 'China' },
      'IN': { ISO2: 'IN', ISO3: 'IND', NAME: 'India' },
      'MY': { ISO2: 'MY', ISO3: 'MYS', NAME: 'Malaysia' },
      'SG': { ISO2: 'SG', ISO3: 'SGP', NAME: 'Singapore' },
      'TH': { ISO2: 'TH', ISO3: 'THA', NAME: 'Thailand' },
      'VN': { ISO2: 'VN', ISO3: 'VNM', NAME: 'Vietnam' }
    };

    // Find the mapping entry
    let mappingEntry: Record<'ISO2' | 'ISO3' | 'NAME', string> | null = null;

    for (const [, mapping] of Object.entries(countryMappings)) {
      if (mapping[fromFormat] === countryCode ||
          (fromFormat === 'NAME' && mapping.NAME.toLowerCase() === countryCode.toLowerCase())) {
        mappingEntry = mapping;
        break;
      }
    }

    return mappingEntry ? mappingEntry[toFormat] : countryCode;
  }

  /**
   * Transform phone numbers to international format
   */
  static transformPhoneNumber(phone: string, countryCode: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If it already has country code, return as is
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Add country code based on mapping
    const countryPhoneCodes: Record<string, string> = {
      'US': '+1',
      'GB': '+44',
      'CA': '+1',
      'AU': '+61',
      'DE': '+49',
      'FR': '+33',
      'JP': '+81',
      'KR': '+82',
      'CN': '+86',
      'IN': '+91',
      'MY': '+60',
      'SG': '+65',
      'TH': '+66',
      'VN': '+84'
    };

    const prefix = countryPhoneCodes[countryCode];
    if (prefix) {
      // Remove leading 0 if present (common in many countries)
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      return prefix + cleaned;
    }

    return phone; // Return original if no mapping found
  }

  /**
   * Transform boolean values to various string representations
   */
  static transformBoolean(
    value: boolean,
    format: 'yes_no' | 'true_false' | 'on_off' | '1_0' | 'checked_unchecked'
  ): string {
    const mappings = {
      'yes_no': { true: 'Yes', false: 'No' },
      'true_false': { true: 'true', false: 'false' },
      'on_off': { true: 'On', false: 'Off' },
      '1_0': { true: '1', false: '0' },
      'checked_unchecked': { true: 'checked', false: 'unchecked' }
    };

    const mapping = mappings[format];
    return mapping[value ? 'true' : 'false'];
  }

  /**
   * Clean and normalize text input
   */
  static normalizeText(text: string, options: {
    removeExtraSpaces?: boolean;
    removeSpecialChars?: boolean;
    toUpperCase?: boolean;
    toLowerCase?: boolean;
    maxLength?: number;
  } = {}): string {
    let normalized = text;

    // Remove extra spaces
    if (options.removeExtraSpaces !== false) {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }

    // Remove special characters
    if (options.removeSpecialChars) {
      normalized = normalized.replace(/[^\w\s]/g, '');
    }

    // Case transformation
    if (options.toUpperCase) {
      normalized = normalized.toUpperCase();
    } else if (options.toLowerCase) {
      normalized = normalized.toLowerCase();
    }

    // Truncate if needed
    if (options.maxLength && normalized.length > options.maxLength) {
      normalized = normalized.substring(0, options.maxLength);
    }

    return normalized;
  }
}
