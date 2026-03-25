import type { AppError } from '../services/error/errorHandling';
import type { TravelerProfile } from '../types/profile';

export interface UseLegFormOptions {
  tripId: string;
  legId: string;
}

/** Combined traveler state — updated atomically to avoid split renders */
export interface TravelerState {
  activeTravelerId: string | null;
  profiles: Map<string, TravelerProfile>;
}

export interface LastFailedOperation {
  type: 'save' | 'markReady';
}

export type FormError = AppError | string | null;
