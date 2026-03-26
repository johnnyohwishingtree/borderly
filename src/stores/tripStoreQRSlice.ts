import type { SavedQRCode } from '@/types/trip';
import { databaseService } from '@/services/storage';
import type { TripStore } from './useTripStoreTypes';

type Set = (
  partial:
    | Partial<TripStore>
    | ((state: TripStore) => Partial<TripStore>),
) => void;
type Get = () => TripStore;

export function createQRSlice(set: Set, get: Get) {
  return {
    addQRCode: async (legId: string, qrData: Omit<SavedQRCode, 'id' | 'legId' | 'savedAt'>) => {
      try {
        await databaseService.saveQRCode({
          ...qrData,
          legId,
        });

        const qrCodes = await databaseService.getQRCodes(legId);
        const formattedQrCodes = qrCodes.map(qr => ({
          id: qr.id,
          legId: (qr as any).legId,
          type: (qr as any).type,
          imageBase64: (qr as any).imageBase64,
          savedAt: (qr as any).savedAtISO,
          label: (qr as any).label,
        }));

        set(state => ({
          trips: state.trips.map(trip => ({
            ...trip,
            legs: trip.legs.map(leg =>
              leg.id === legId
                ? { ...leg, qrCodes: formattedQrCodes }
                : leg
            )
          }))
        }));
      } catch (error) {
        console.error('Failed to add QR code:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to add QR code' });
      }
    },

    removeQRCode: async (qrId: string) => {
      try {
        await databaseService.deleteQRCode(qrId);

        set(state => ({
          trips: state.trips.map(trip => ({
            ...trip,
            legs: trip.legs.map(leg => ({
              ...leg,
              qrCodes: (leg.qrCodes || []).filter(qr => qr.id !== qrId)
            }))
          }))
        }));
      } catch (error) {
        console.error('Failed to remove QR code:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to remove QR code' });
      }
    },

    getQRCodesForLeg: (legId: string) => {
      const trips = get().trips;
      for (const trip of trips) {
        for (const leg of trip.legs) {
          if (leg.id === legId) {
            return leg.qrCodes || [];
          }
        }
      }
      return [];
    },
  };
}
