export interface TripLeg {
  id: string;
  countryCode: string;
  arrivalDate: string;
  departureDate?: string;
  purpose: 'tourism' | 'business' | 'transit' | 'other';
  accommodation?: {
    name: string;
    address: string;
  };
  formData?: Record<string, any>;
  submissionQR?: string;
  status: 'pending' | 'filled' | 'submitted';
}

export interface Trip {
  id: string;
  name: string;
  legs: TripLeg[];
  createdAt: string;
  updatedAt: string;
}
