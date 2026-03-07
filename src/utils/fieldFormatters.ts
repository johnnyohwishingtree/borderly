/**
 * Field value formatting utilities for display in the submission guide
 */

export function formatFieldValue(
  value: unknown, 
  fieldType: string
): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  switch (fieldType) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    
    case 'date':
      if (typeof value === 'string') {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
        } catch {
          // Fall through to string conversion
        }
      }
      return String(value);
    
    case 'number':
      if (typeof value === 'number') {
        return value.toString();
      }
      return String(value);
    
    case 'select':
    case 'text':
    case 'textarea':
    default:
      return String(value);
  }
}

export function formatCurrencyValue(
  amount: number, 
  currency: string = 'USD'
): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDuration(days: number): string {
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  
  if (remainingDays === 0) {
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  
  const weeksText = weeks === 1 ? '1 week' : `${weeks} weeks`;
  const daysText = remainingDays === 1 ? '1 day' : `${remainingDays} days`;
  
  return `${weeksText}, ${daysText}`;
}

export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format based on length (basic international formatting)
  if (cleaned.length === 10) {
    // US format: (123) 456-7890
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US with country code: +1 (123) 456-7890
    return cleaned.replace(/^1(\d{3})(\d{3})(\d{4})/, '+1 ($1) $2-$3');
  } else if (cleaned.length > 7) {
    // International format: +XX XXX XXX XXXX
    return `+${cleaned}`;
  }
  
  return phoneNumber; // Return original if no formatting applied
}

export function formatAddress(address: {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}): string {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  
  return parts.join(', ');
}

export function formatPassportNumber(passportNumber: string): string {
  // Basic passport number formatting - uppercase and remove spaces
  return passportNumber.toUpperCase().replace(/\s/g, '');
}

export function formatCountryName(countryCode: string): string {
  const countryNames: Record<string, string> = {
    'JPN': 'Japan',
    'MYS': 'Malaysia', 
    'SGP': 'Singapore',
    'USA': 'United States',
    'CAN': 'Canada',
    'GBR': 'United Kingdom',
    'AUS': 'Australia',
    'DEU': 'Germany',
    'FRA': 'France',
    'ITA': 'Italy',
    'ESP': 'Spain',
    'NLD': 'Netherlands',
    'CHE': 'Switzerland',
    'SWE': 'Sweden',
    'NOR': 'Norway',
    'DNK': 'Denmark',
    'FIN': 'Finland',
    'KOR': 'South Korea',
    'CHN': 'China',
    'IND': 'India',
    'THA': 'Thailand',
    'VNM': 'Vietnam',
    'IDN': 'Indonesia',
    'PHL': 'Philippines',
  };
  
  return countryNames[countryCode] || countryCode;
}

export function formatGender(gender: 'M' | 'F' | 'X'): string {
  switch (gender) {
    case 'M': return 'Male';
    case 'F': return 'Female';
    case 'X': return 'Other';
    default: return gender;
  }
}