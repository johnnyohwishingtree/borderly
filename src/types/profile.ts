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
