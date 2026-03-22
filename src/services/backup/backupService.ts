/**
 * BackupService
 *
 * Collects all user data from the three storage tiers (OS Keychain,
 * WatermelonDB, MMKV), serialises it to a versioned JSON envelope, and
 * encrypts the envelope with AES-256-GCM using a key derived from a
 * user-supplied passphrase via PBKDF2.
 *
 * The resulting .borderly file is a UTF-8 text file:
 *
 *   BORDERLY_BACKUP_V1\n
 *   <base64-encoded binary: 32-byte salt + 12-byte IV + ciphertext>
 *
 * Usage:
 *   const fileContent = await backupService.export('my-passphrase');
 *   const envelope   = await backupService.import(fileContent, 'my-passphrase');
 */

import { keychainService } from '@/services/storage/keychain';
import { databaseService } from '@/services/storage/database';
import { mmkvService } from '@/services/storage/mmkv';
import type { Trip, TripLeg, SavedQRCode } from '@/services/storage/models';
import { SerializableFamilyProfileCollection } from '@/types/family';
import {
  deriveKeyFromPassphrase,
  encryptAESGCM,
  decryptAESGCM,
  generateSalt,
  generateIV,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  SALT_BYTES,
  IV_BYTES,
} from '@/utils/crypto';
import {
  BACKUP_FILE_HEADER,
  BACKUP_CURRENT_VERSION,
  BackupEnvelope,
  BackupPayload,
  ProfileBackupEntry,
  TripBackupData,
  TripLegBackupData,
  QRCodeBackupData,
} from './backupTypes';

// MMKV keys that are either handled separately or represent ephemeral state
// and should therefore NOT be included in the generic preferences backup.
const MMKV_EXCLUDED_KEYS = new Set(['family_profiles', 'current_profile_id']);

// ---------------------------------------------------------------------------
// BackupService implementation
// ---------------------------------------------------------------------------

class BackupServiceImpl {
  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Export all user data to an encrypted .borderly file string.
   *
   * Steps:
   *  1. Collect profiles from Keychain, trips/legs/QRs from WatermelonDB,
   *     and preferences from MMKV.
   *  2. Serialise to a versioned JSON BackupEnvelope.
   *  3. Encrypt with AES-256-GCM (PBKDF2-derived key, 100 k iterations).
   *  4. Pack: salt || IV || ciphertext, then Base64-encode.
   *  5. Prepend the file header and return.
   *  6. Clear sensitive key material from memory.
   *
   * @param passphrase - User-supplied plaintext passphrase.
   * @returns Complete .borderly file content (UTF-8 text, safe to write to disk
   *          or transfer over the wire).
   */
  async export(passphrase: string): Promise<string> {
    const encoder = new TextEncoder();
    let key: CryptoKey | undefined;
    // Keep a mutable local copy so we can zero it in the finally block.
    let pp = passphrase;

    try {
      const payload = await this._collectPayload();

      const envelope: BackupEnvelope = {
        version: BACKUP_CURRENT_VERSION,
        createdAt: new Date().toISOString(),
        payload,
      };

      const plaintext = JSON.stringify(envelope);
      const plaintextBytes = encoder.encode(plaintext);

      const salt = generateSalt();
      const iv = generateIV();

      key = await deriveKeyFromPassphrase(pp, salt);
      const ciphertext = await encryptAESGCM(key, iv, plaintextBytes.buffer as ArrayBuffer);

      // Pack: [32 bytes salt][12 bytes IV][N bytes ciphertext]
      const ciphertextBytes = new Uint8Array(ciphertext);
      const packed = new Uint8Array(SALT_BYTES + IV_BYTES + ciphertextBytes.length);
      packed.set(salt, 0);
      packed.set(iv, SALT_BYTES);
      packed.set(ciphertextBytes, SALT_BYTES + IV_BYTES);

      const base64 = arrayBufferToBase64(packed.buffer as ArrayBuffer);
      return `${BACKUP_FILE_HEADER}\n${base64}`;
    } finally {
      // Clear sensitive references to help garbage collection.
      pp = '';
      key = undefined;
    }
  }

  /**
   * Import (decrypt and validate) a .borderly file.
   *
   * @param fileContent - Complete .borderly file content as returned by export().
   * @param passphrase  - User-supplied plaintext passphrase.
   * @returns The decrypted BackupEnvelope.
   * @throws Error if the file is malformed, the passphrase is wrong, or the
   *         backup version is not supported.
   */
  async import(fileContent: string, passphrase: string): Promise<BackupEnvelope> {
    let key: CryptoKey | undefined;
    let pp = passphrase;

    try {
      // --- Parse file structure ---
      const newlineIdx = fileContent.indexOf('\n');
      if (newlineIdx === -1) {
        throw new Error('Invalid backup file: missing newline after header');
      }
      const header = fileContent.slice(0, newlineIdx);
      if (header !== BACKUP_FILE_HEADER) {
        throw new Error(`Invalid backup file: expected header "${BACKUP_FILE_HEADER}", got "${header}"`);
      }

      const base64 = fileContent.slice(newlineIdx + 1);
      if (!base64) {
        throw new Error('Invalid backup file: empty payload');
      }

      let packed: Uint8Array;
      try {
        packed = new Uint8Array(base64ToArrayBuffer(base64));
      } catch {
        throw new Error('Invalid backup file: payload is not valid Base64');
      }

      if (packed.length < SALT_BYTES + IV_BYTES + 1) {
        throw new Error('Invalid backup file: payload is truncated');
      }

      // --- Unpack ---
      const salt = packed.slice(0, SALT_BYTES);
      const iv = packed.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
      const ciphertext = packed.slice(SALT_BYTES + IV_BYTES);

      // --- Decrypt ---
      key = await deriveKeyFromPassphrase(pp, salt);
      let decrypted: ArrayBuffer;
      try {
        decrypted = await decryptAESGCM(key, iv, ciphertext.buffer as ArrayBuffer);
      } catch {
        throw new Error('Failed to decrypt backup: incorrect passphrase or corrupted data');
      }

      // --- Deserialise ---
      const decoder = new TextDecoder();
      const plaintext = decoder.decode(decrypted);

      let envelope: BackupEnvelope;
      try {
        envelope = JSON.parse(plaintext) as BackupEnvelope;
      } catch {
        throw new Error('Invalid backup file: decrypted content is not valid JSON');
      }

      // --- Validate version ---
      if (typeof envelope.version !== 'number') {
        throw new Error('Invalid backup file: missing version field');
      }
      if (envelope.version !== BACKUP_CURRENT_VERSION) {
        throw new Error(
          `Unsupported backup version ${envelope.version}. ` +
          `This app supports version ${BACKUP_CURRENT_VERSION}.`,
        );
      }

      return envelope;
    } finally {
      pp = '';
      key = undefined;
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers – data collection
  // -------------------------------------------------------------------------

  private async _collectPayload(): Promise<BackupPayload> {
    const familyCollectionStr = mmkvService.getString('family_profiles');
    const familyCollection: SerializableFamilyProfileCollection | null = familyCollectionStr
      ? (JSON.parse(familyCollectionStr) as SerializableFamilyProfileCollection)
      : null;

    const [profiles, trips, qrCodes] = await Promise.all([
      this._collectProfiles(familyCollection),
      this._collectTrips(),
      this._collectQRCodes(),
    ]);

    const preferences = this._collectPreferences();

    return { profiles, familyCollection, trips, qrCodes, preferences };
  }

  /** Load each profile's secure data from the OS Keychain. */
  private async _collectProfiles(
    familyCollection: SerializableFamilyProfileCollection | null,
  ): Promise<ProfileBackupEntry[]> {
    if (!familyCollection) {
      return [];
    }

    const entries: ProfileBackupEntry[] = [];
    for (const profileId of Object.keys(familyCollection.profiles)) {
      const profile = await keychainService.getProfileById(profileId);
      if (profile) {
        entries.push({ id: profileId, profile });
      }
    }
    return entries;
  }

  /** Retrieve all trips and their legs from WatermelonDB. */
  private async _collectTrips(): Promise<TripBackupData[]> {
    const trips = await databaseService.getTrips();
    const result: TripBackupData[] = [];

    for (const trip of trips) {
      const legs = await databaseService.getTripLegs(trip.id);

      const typedLegs = legs as unknown as TripLeg[];
      const legData: TripLegBackupData[] = typedLegs.map((leg): TripLegBackupData => {
        const entry: TripLegBackupData = {
          id: leg.id,
          tripId: leg.tripId,
          destinationCountry: leg.destinationCountry,
          arrivalDate: leg.arrivalDate instanceof Date
            ? leg.arrivalDate.toISOString()
            : String(leg.arrivalDate),
          accommodationData: leg.accommodationData,
          formStatus: leg.formStatus,
          order: leg.order,
        };
        if (leg.departureDate != null) {
          entry.departureDate = leg.departureDate instanceof Date
            ? leg.departureDate.toISOString()
            : String(leg.departureDate);
        }
        if (leg.flightNumber != null) { entry.flightNumber = leg.flightNumber; }
        if (leg.airlineCode != null) { entry.airlineCode = leg.airlineCode; }
        if (leg.arrivalAirport != null) { entry.arrivalAirport = leg.arrivalAirport; }
        if (leg.formDataString != null) { entry.formDataString = leg.formDataString; }
        return entry;
      });

      const typedTrip = trip as unknown as Trip;
      result.push({
        id: typedTrip.id,
        name: typedTrip.name,
        status: typedTrip.status,
        createdAt: typedTrip.createdAt instanceof Date
          ? typedTrip.createdAt.toISOString()
          : new Date().toISOString(),
        updatedAt: typedTrip.updatedAt instanceof Date
          ? typedTrip.updatedAt.toISOString()
          : new Date().toISOString(),
        legs: legData,
      });
    }

    return result;
  }

  /** Retrieve all saved QR codes from WatermelonDB. */
  private async _collectQRCodes(): Promise<QRCodeBackupData[]> {
    const qrCodes = await databaseService.getQRCodes();
    return (qrCodes as unknown as SavedQRCode[]).map((qr): QRCodeBackupData => {
      const entry: QRCodeBackupData = {
        id: qr.id,
        legId: qr.legId,
        type: qr.type,
        imageBase64: qr.imageBase64,
        savedAt: qr.savedAt instanceof Date
          ? qr.savedAt.toISOString()
          : String(qr.savedAt),
        label: qr.label,
      };
      if (qr.travelerId != null) { entry.travelerId = qr.travelerId; }
      return entry;
    });
  }

  /**
   * Collect all MMKV key-value pairs that should be included in the backup.
   * The family profile collection and ephemeral state are excluded because
   * they are handled separately or are not meaningful across devices.
   */
  private _collectPreferences(): Record<string, unknown> {
    const allKeys = mmkvService.getAllKeys();
    const prefs: Record<string, unknown> = {};

    for (const key of allKeys) {
      if (MMKV_EXCLUDED_KEYS.has(key)) {
        continue;
      }
      const value = mmkvService.getString(key);
      if (value !== undefined) {
        prefs[key] = value;
      }
    }

    return prefs;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const backupService = new BackupServiceImpl();
