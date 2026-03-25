import type { Trip } from '@/types/trip';

/**
 * Maps a WatermelonDB trip model and its associated leg models
 * to a plain Trip object suitable for in-memory state.
 */
export function mapTripModelToTrip(
  tripModel: { id: string },
  legModels: { id: string }[],
): Trip {
  return {
    id: tripModel.id,
    name: (tripModel as any).name,
    status: (tripModel as any).status,
    legs: legModels.map(legModel => ({
      id: legModel.id,
      tripId: tripModel.id,
      destinationCountry: (legModel as any).destinationCountry,
      arrivalDate: (legModel as any).arrivalDateISO,
      departureDate: (legModel as any).departureDateISO,
      flightNumber: (legModel as any).flightNumber,
      airlineCode: (legModel as any).airlineCode,
      arrivalAirport: (legModel as any).arrivalAirport,
      accommodation: (legModel as any).accommodation,
      formStatus: (legModel as any).formStatus,
      submissionStatus: (legModel as any).submissionStatus || 'not_started',
      formData: (legModel as any).formData,
      order: (legModel as any).order,
      qrCodes: [],
      assignedTravelers: (legModel as any).assignedTravelers || [],
      travelerFormsData: (legModel as any).travelerFormsData || [],
    })),
    createdAt: (tripModel as any).createdAtISO,
    updatedAt: (tripModel as any).updatedAtISO,
  };
}
