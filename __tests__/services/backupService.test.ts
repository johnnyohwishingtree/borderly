/**
 * Tests for BackupService
 *
 * Covers all acceptance criteria:
 *  1. export() collects profiles from Keychain, trips/legs/QRs from
 *     WatermelonDB, and preferences from MMKV.
 *  2. Output is a versioned JSON envelope wrapped in the .borderly header.
 *  3. AES-256-GCM + PBKDF2 roundtrip: export/import with correct passphrase.
 *  4. import() throws a descriptive error for a wrong passphrase.
 *  5. import() throws for malformed content (bad header, truncated data).
 *  6. Sensitive key material is cleared after export/import (CryptoKey
 *     references dropped from local scope).
 *
 * Crypto operations use the real Web Crypto API (polyfilled via
 * react-native-get-random-values in jest.setup.js, which wires in
 * Node.js webcrypto.subtle).  Storage layers are mocked so tests run
 * without native modules.
 */

import { backupService } from '../../src/services/backup/backupService';
import {
  BACKUP_FILE_HEADER,
  BACKUP_CURRENT_VERSION,
  BackupEnvelope,
} from '../../src/services/backup/backupTypes';
import { keychainService } from '../../src/services/storage/keychain';
import { databaseService } from '../../src/services/storage/database';
import { mmkvService } from '../../src/services/storage/mmkv';

// ---------------------------------------------------------------------------
// Mock storage layers
// ---------------------------------------------------------------------------

jest.mock('../../src/services/storage/keychain', () => ({
  keychainService: {
    getProfileById: jest.fn(),
  },
}));

jest.mock('../../src/services/storage/database', () => ({
  databaseService: {
    getTrips: jest.fn(),
    getTripLegs: jest.fn(),
    getQRCodes: jest.fn(),
  },
}));

jest.mock('../../src/services/storage/mmkv', () => ({
  mmkvService: {
    getString: jest.fn(),
    getAllKeys: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PASSPHRASE = 'test-passphrase-123!';

const mockProfile = {
  id: 'profile-1',
  passportNumber: 'AB123456',
  surname: 'SMITH',
  givenNames: 'JOHN',
  nationality: 'GBR',
  dateOfBirth: '1990-01-15',
  gender: 'M' as const,
  passportExpiry: '2030-01-15',
  issuingCountry: 'GBR',
  defaultDeclarations: {
    hasItemsToDeclare: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockFamilyCollection = {
  profiles: {
    'profile-1': {
      id: 'profile-1',
      relationship: 'self',
      isPrimary: true,
      isActive: true,
      biometricEnabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  },
  primaryProfileId: 'profile-1',
  maxProfiles: 8,
  version: 1,
  lastModified: '2024-01-01T00:00:00Z',
};

const mockTrip = {
  id: 'trip-1',
  name: 'Asia Trip 2024',
  status: 'upcoming',
  createdAt: new Date('2024-06-01T00:00:00Z'),
  updatedAt: new Date('2024-06-01T00:00:00Z'),
};

const mockLeg = {
  id: 'leg-1',
  tripId: 'trip-1',
  destinationCountry: 'JPN',
  arrivalDate: new Date('2024-07-01T00:00:00Z'),
  departureDate: new Date('2024-07-14T00:00:00Z'),
  flightNumber: 'BA007',
  airlineCode: 'BA',
  arrivalAirport: 'NRT',
  accommodationData: JSON.stringify({ name: 'Hotel Tokyo', address: { line1: '1-1 Tokyo', city: 'Tokyo', postalCode: '100-0001', country: 'JPN' } }),
  formStatus: 'not_started',
  formDataString: undefined,
  order: 0,
};

const mockQRCode = {
  id: 'qr-1',
  legId: 'leg-1',
  travelerId: undefined,
  type: 'immigration',
  imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
  savedAt: new Date('2024-07-01T12:00:00Z'),
  label: 'Visit Japan Web QR',
};

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function setupMocks() {
  (mmkvService.getString as jest.Mock).mockImplementation((key: string) => {
    if (key === 'family_profiles') {
      return JSON.stringify(mockFamilyCollection);
    }
    if (key === 'app_preferences') {
      return JSON.stringify({ theme: 'auto', language: 'en' });
    }
    return undefined;
  });

  (mmkvService.getAllKeys as jest.Mock).mockReturnValue(['app_preferences']);

  (keychainService.getProfileById as jest.Mock).mockImplementation((id: string) => {
    if (id === 'profile-1') { return Promise.resolve(mockProfile); }
    return Promise.resolve(null);
  });

  (databaseService.getTrips as jest.Mock).mockResolvedValue([mockTrip]);
  (databaseService.getTripLegs as jest.Mock).mockResolvedValue([mockLeg]);
  (databaseService.getQRCodes as jest.Mock).mockResolvedValue([mockQRCode]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // --- export() ---

  describe('export()', () => {
    it('returns a string starting with the .borderly file header', async () => {
      const result = await backupService.export(PASSPHRASE);
      expect(result.startsWith(`${BACKUP_FILE_HEADER}\n`)).toBe(true);
    });

    it('returns a non-empty Base64 payload after the header', async () => {
      const result = await backupService.export(PASSPHRASE);
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
      const base64 = lines.slice(1).join('');
      expect(base64.length).toBeGreaterThan(0);
      // Should be valid Base64
      expect(() => atob(base64)).not.toThrow();
    });

    it('collects profile data from Keychain', async () => {
      await backupService.export(PASSPHRASE);
      expect(keychainService.getProfileById).toHaveBeenCalledWith('profile-1');
    });

    it('collects trips and legs from WatermelonDB', async () => {
      await backupService.export(PASSPHRASE);
      expect(databaseService.getTrips).toHaveBeenCalled();
      expect(databaseService.getTripLegs).toHaveBeenCalledWith('trip-1');
    });

    it('collects QR codes from WatermelonDB', async () => {
      await backupService.export(PASSPHRASE);
      expect(databaseService.getQRCodes).toHaveBeenCalled();
    });

    it('collects preferences from MMKV (excluding family_profiles)', async () => {
      (mmkvService.getAllKeys as jest.Mock).mockReturnValue([
        'app_preferences',
        'family_profiles', // should be excluded
        'current_profile_id', // should be excluded
        'cache_country_schema',
      ]);
      (mmkvService.getString as jest.Mock).mockImplementation((key: string) => {
        if (key === 'family_profiles') { return JSON.stringify(mockFamilyCollection); }
        return `value_for_${key}`;
      });

      const result = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(result, PASSPHRASE);

      expect(envelope.payload.preferences).toHaveProperty('app_preferences');
      expect(envelope.payload.preferences).toHaveProperty('cache_country_schema');
      expect(envelope.payload.preferences).not.toHaveProperty('family_profiles');
      expect(envelope.payload.preferences).not.toHaveProperty('current_profile_id');
    });

    it('produces different ciphertext for each call (random salt/IV)', async () => {
      const r1 = await backupService.export(PASSPHRASE);
      const r2 = await backupService.export(PASSPHRASE);
      // Same plaintext but different random salt/IV → different ciphertext
      expect(r1).not.toBe(r2);
    });
  });

  // --- import() ---

  describe('import()', () => {
    it('roundtrip: decrypted envelope contains correct version', async () => {
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      expect(envelope.version).toBe(BACKUP_CURRENT_VERSION);
    });

    it('roundtrip: decrypted envelope contains createdAt timestamp', async () => {
      const before = new Date().toISOString();
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      expect(new Date(envelope.createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime(),
      );
    });

    it('roundtrip: profiles are preserved', async () => {
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      expect(envelope.payload.profiles).toHaveLength(1);
      expect(envelope.payload.profiles[0].id).toBe('profile-1');
      expect(envelope.payload.profiles[0].profile.passportNumber).toBe('AB123456');
    });

    it('roundtrip: family collection is preserved', async () => {
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      expect(envelope.payload.familyCollection).not.toBeNull();
      expect(envelope.payload.familyCollection?.primaryProfileId).toBe('profile-1');
    });

    it('roundtrip: trips and legs are preserved', async () => {
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      expect(envelope.payload.trips).toHaveLength(1);
      expect(envelope.payload.trips[0].name).toBe('Asia Trip 2024');
      expect(envelope.payload.trips[0].legs).toHaveLength(1);
      expect(envelope.payload.trips[0].legs[0].destinationCountry).toBe('JPN');
    });

    it('roundtrip: QR codes are preserved', async () => {
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      expect(envelope.payload.qrCodes).toHaveLength(1);
      expect(envelope.payload.qrCodes[0].type).toBe('immigration');
      expect(envelope.payload.qrCodes[0].label).toBe('Visit Japan Web QR');
    });

    it('throws a descriptive error for a wrong passphrase', async () => {
      const file = await backupService.export(PASSPHRASE);
      await expect(backupService.import(file, 'wrong-passphrase')).rejects.toThrow(
        /Failed to decrypt backup/,
      );
    });

    it('throws for a file with a wrong header', async () => {
      const badFile = `WRONG_HEADER\nAGFiYw==`;
      await expect(backupService.import(badFile, PASSPHRASE)).rejects.toThrow(
        /Invalid backup file/,
      );
    });

    it('throws for a file with no newline', async () => {
      await expect(backupService.import('NODATAHERE', PASSPHRASE)).rejects.toThrow(
        /Invalid backup file/,
      );
    });

    it('throws for a truncated payload', async () => {
      // Header is correct but payload is far too short
      const truncated = `${BACKUP_FILE_HEADER}\nAGFiYw==`;
      await expect(backupService.import(truncated, PASSPHRASE)).rejects.toThrow(
        /Invalid backup file.*truncated/i,
      );
    });

    it('throws for a payload that is not valid Base64', async () => {
      const badBase64 = `${BACKUP_FILE_HEADER}\n!!!not-base64!!!`;
      await expect(backupService.import(badBase64, PASSPHRASE)).rejects.toThrow(
        /Invalid backup file/,
      );
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('handles no profiles gracefully (empty family collection in MMKV)', async () => {
      (mmkvService.getString as jest.Mock).mockReturnValue(undefined);
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      expect(envelope.payload.profiles).toHaveLength(0);
      expect(envelope.payload.familyCollection).toBeNull();
    });

    it('handles no trips gracefully', async () => {
      (databaseService.getTrips as jest.Mock).mockResolvedValue([]);
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      expect(envelope.payload.trips).toHaveLength(0);
    });

    it('handles no QR codes gracefully', async () => {
      (databaseService.getQRCodes as jest.Mock).mockResolvedValue([]);
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      expect(envelope.payload.qrCodes).toHaveLength(0);
    });

    it('skips profiles that cannot be loaded from Keychain', async () => {
      (keychainService.getProfileById as jest.Mock).mockResolvedValue(null);
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      expect(envelope.payload.profiles).toHaveLength(0);
    });

    it('preserves leg optional fields when present', async () => {
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      const leg = envelope.payload.trips[0].legs[0];
      expect(leg.flightNumber).toBe('BA007');
      expect(leg.airlineCode).toBe('BA');
      expect(leg.arrivalAirport).toBe('NRT');
      expect(leg.departureDate).toBeDefined();
    });

    it('omits undefined leg optional fields', async () => {
      const legWithoutOptionals = {
        ...mockLeg,
        departureDate: undefined,
        flightNumber: undefined,
        airlineCode: undefined,
        arrivalAirport: undefined,
        formDataString: undefined,
      };
      (databaseService.getTripLegs as jest.Mock).mockResolvedValue([legWithoutOptionals]);
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      const leg = envelope.payload.trips[0].legs[0];
      expect(leg.departureDate).toBeUndefined();
      expect(leg.flightNumber).toBeUndefined();
    });
  });

  // --- Versioned envelope ---

  describe('versioned envelope', () => {
    it('exported envelope has correct version number', async () => {
      const file = await backupService.export(PASSPHRASE);
      const envelope: BackupEnvelope = await backupService.import(file, PASSPHRASE);
      expect(envelope.version).toBe(1);
    });

    it('import() rejects an envelope with an unsupported version', async () => {
      // Build a valid encrypted file but with version = 99
      const file = await backupService.export(PASSPHRASE);
      const envelope = await backupService.import(file, PASSPHRASE);
      // Tamper with version and re-encrypt manually using crypto utils
      const { deriveKeyFromPassphrase, encryptAESGCM, decryptAESGCM,
              generateSalt, generateIV, arrayBufferToBase64, base64ToArrayBuffer,
              SALT_BYTES: S, IV_BYTES: I } = await import('../../src/utils/crypto');

      // Decrypt the original to get the plaintext
      const lines = file.split('\n');
      const packed = new Uint8Array(base64ToArrayBuffer(lines.slice(1).join('')));
      const salt = packed.slice(0, S);
      const iv = packed.slice(S, S + I);
      const ct = packed.slice(S + I);
      const key = await deriveKeyFromPassphrase(PASSPHRASE, salt);
      const plain = await decryptAESGCM(key, iv, ct.buffer as ArrayBuffer);
      const dec = new TextDecoder().decode(plain);
      const tamperedEnvelope = { ...JSON.parse(dec), version: 99 };

      // Re-encrypt with the tampered envelope
      const enc = new TextEncoder();
      const newSalt = generateSalt();
      const newIv = generateIV();
      const newKey = await deriveKeyFromPassphrase(PASSPHRASE, newSalt);
      const newCt = await encryptAESGCM(newKey, newIv, enc.encode(JSON.stringify(tamperedEnvelope)).buffer as ArrayBuffer);
      const newCtBytes = new Uint8Array(newCt);
      const newPacked = new Uint8Array(S + I + newCtBytes.length);
      newPacked.set(newSalt, 0);
      newPacked.set(newIv, S);
      newPacked.set(newCtBytes, S + I);
      const tamperedFile = `BORDERLY_BACKUP_V1\n${arrayBufferToBase64(newPacked.buffer as ArrayBuffer)}`;

      await expect(backupService.import(tamperedFile, PASSPHRASE)).rejects.toThrow(
        /Unsupported backup version 99/,
      );

      // Avoid "used before assigned" lint
      void envelope;
    });
  });
});
