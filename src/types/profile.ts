export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string; // ISO 3166-1 alpha-3
}

export interface DeclarationDefaults {
  hasItemsToDeclar: boolean; // usually false
  carryingCurrency: boolean; // usually false
  carryingProhibitedItems: boolean; // usually false
  visitedFarm: boolean; // usually false
  hasCriminalRecord: boolean; // usually false
  carryingCommercialGoods: boolean; // usually false
}

export interface TravelerProfile {
  id: string; // UUID
  // From passport MRZ scan
  passportNumber: string;
  surname: string;
  givenNames: string;
  nationality: string; // ISO 3166-1 alpha-3
  dateOfBirth: string; // ISO 8601 date
  gender: 'M' | 'F' | 'X';
  passportExpiry: string; // ISO 8601 date
  issuingCountry: string; // ISO 3166-1 alpha-3

  // User-provided (not on passport)
  email?: string;
  phoneNumber?: string;
  homeAddress?: Address;
  occupation?: string;

  // Common declaration defaults
  defaultDeclarations: DeclarationDefaults;

  createdAt: string; // ISO 8601
  updatedAt: string;
}

// Legacy interface for backward compatibility
export interface PassportInfo {
  number: string;
  givenNames: string;
  surname: string;
  nationality: string;
  dateOfBirth: string;
  gender: 'M' | 'F' | 'X';
  expiryDate: string;
  issueDate?: string;
  issuingCountry: string;
}

// Legacy interface for backward compatibility
export interface TravelProfile {
  passport: PassportInfo;
  contactInfo: {
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}
