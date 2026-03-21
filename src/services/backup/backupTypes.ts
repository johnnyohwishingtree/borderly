/**
 * Type definitions for the Borderly backup/restore feature.
 *
 * A .borderly backup file contains:
 *   1. A plain-text header line identifying the format.
 *   2. A Base64-encoded binary blob: [32-byte salt][12-byte IV][ciphertext].
 *
 * The ciphertext is the UTF-8 encoding of a JSON-serialised BackupEnvelope
 * encrypted with AES-256-GCM, where the key is derived from the user's
 * passphrase via PBKDF2 (100 000 iterations, SHA-256).
 */

import { TravelerProfile } from '@/types/profile';
import { SerializableFamilyProfileCollection } from '@/types/family';

// ---------------------------------------------------------------------------
// File format constants
// ---------------------------------------------------------------------------

/** First line of every .borderly file – used to detect and validate the format. */
export const BACKUP_FILE_HEADER = 'BORDERLY_BACKUP_V1';

/** Current backup envelope version. Increment when the schema changes. */
export const BACKUP_CURRENT_VERSION = 1;

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

/**
 * Top-level wrapper that is JSON-serialised and then encrypted.
 */
export interface BackupEnvelope {
  /** Schema version for forward-compatibility checks on import. */
  version: number;
  /** ISO 8601 timestamp of when the backup was created. */
  createdAt: string;
  /** The actual user data. */
  payload: BackupPayload;
}

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

/**
 * All user data collected from the three storage tiers.
 */
export interface BackupPayload {
  /** All traveler profiles (primary + family members) from OS Keychain. */
  profiles: ProfileBackupEntry[];
  /**
   * Family profile collection metadata (profile IDs, relationships, etc.)
   * stored in MMKV.  Null when no profiles have been created yet.
   */
  familyCollection: SerializableFamilyProfileCollection | null;
  /** All trips and their legs from WatermelonDB. */
  trips: TripBackupData[];
  /** All saved QR codes from WatermelonDB. */
  qrCodes: QRCodeBackupData[];
  /**
   * App preferences and other MMKV key-value pairs (excluding the family
   * collection and ephemeral state such as the current profile ID).
   */
  preferences: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/** A single profile entry as stored in the backup. */
export interface ProfileBackupEntry {
  /** The profile's UUID (mirrors TravelerProfile.id). */
  id: string;
  /** Full profile data retrieved from the OS Keychain. */
  profile: TravelerProfile;
}

// ---------------------------------------------------------------------------
// Trip / leg
// ---------------------------------------------------------------------------

/** Serialised representation of a WatermelonDB Trip model. */
export interface TripBackupData {
  id: string;
  name: string;
  status: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  legs: TripLegBackupData[];
}

/** Serialised representation of a WatermelonDB TripLeg model. */
export interface TripLegBackupData {
  id: string;
  tripId: string;
  destinationCountry: string;
  arrivalDate: string;    // ISO 8601
  departureDate?: string; // ISO 8601
  flightNumber?: string;
  airlineCode?: string;
  arrivalAirport?: string;
  /** Raw JSON string (Accommodation object serialised by the model). */
  accommodationData: string;
  formStatus: string;
  /** Raw JSON string (form field values serialised by the model). */
  formDataString?: string;
  order: number;
}

// ---------------------------------------------------------------------------
// QR code
// ---------------------------------------------------------------------------

/** Serialised representation of a WatermelonDB SavedQRCode model. */
export interface QRCodeBackupData {
  id: string;
  legId: string;
  travelerId?: string;
  type: string;
  imageBase64: string;
  savedAt: string; // ISO 8601
  label: string;
}
