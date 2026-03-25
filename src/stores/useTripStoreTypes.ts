import type { Trip, TripLeg, SavedQRCode, LegSubmissionStatus, TravelerFormData } from '@/types/trip';

export interface TripStore {
  // State
  trips: Trip[];
  currentTrip: Trip | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Pagination state
  currentPage: number;
  pageSize: number;
  totalTrips: number;
  hasMoreTrips: boolean;

  // Trip operations
  loadTrips: (options?: { refresh?: boolean; status?: 'upcoming' | 'active' | 'completed' }) => Promise<void>;
  loadMoreTrips: () => Promise<void>;
  createTrip: (tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Trip>;
  updateTrip: (tripId: string, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  setCurrentTrip: (trip: Trip | null) => void;

  // Trip leg operations
  addTripLeg: (tripId: string, legData: Omit<TripLeg, 'id' | 'tripId'>) => Promise<void>;
  updateTripLeg: (legId: string, updates: Partial<TripLeg>) => Promise<void>;
  removeTripLeg: (legId: string) => Promise<void>;
  reorderTripLegs: (tripId: string, legIds: string[]) => Promise<void>;

  // QR code operations
  addQRCode: (legId: string, qrData: Omit<SavedQRCode, 'id' | 'legId' | 'savedAt'>) => Promise<void>;
  removeQRCode: (qrId: string) => Promise<void>;
  getQRCodesForLeg: (legId: string) => SavedQRCode[];

  // Multi-traveler operations
  assignTravelersToLeg: (legId: string, travelerIds: string[]) => Promise<void>;
  removeTravelerFromLeg: (legId: string, travelerId: string) => Promise<void>;
  updateTravelerFormData: (legId: string, travelerId: string, fieldId: string, value: unknown) => Promise<void>;
  updateTravelerFormStatus: (legId: string, travelerId: string, status: 'not_started' | 'in_progress' | 'ready' | 'submitted') => Promise<void>;
  getTravelerFormData: (legId: string, travelerId: string) => TravelerFormData | undefined;

  // Submission status
  markLegAsSubmitted: (legId: string) => Promise<void>;
  updateLegSubmissionStatus: (legId: string, status: LegSubmissionStatus) => Promise<void>;

  // Trip duplication
  duplicateTrip: (sourceTripId: string, newDepartureDate: string) => Promise<Trip>;

  // Utilities
  getTripById: (tripId: string) => Trip | undefined;
  getLegById: (legId: string) => TripLeg | undefined;
  getActiveTrips: () => Trip[];
  getUpcomingTrips: () => Trip[];
  clearError: () => void;
}
