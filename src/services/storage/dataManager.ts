/**
 * dataManager.ts
 *
 * Provides two top-level capabilities required for privacy compliance:
 *   1. Export — serialise profile + trip data to JSON (no raw MRZ strings)
 *   2. Delete All — wipe every storage tier (Keychain, WatermelonDB, MMKV)
 */

import { Share } from 'react-native';
import { keychainService } from './keychain';
import { mmkvService } from './mmkv';
import { databaseService } from './database';
import { Trip, TripLeg } from './models';
import packageJson from '../../../package.json';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportedProfile {
  id: string;
  surname: string;
  givenNames: string;
  nationality: string;
  dateOfBirth: string;
  gender: string;
  passportExpiry: string;
  issuingCountry: string;
  email?: string | undefined;
  phoneNumber?: string | undefined;
  occupation?: string | undefined;
  relationship?: string | undefined;
  defaultDeclarations: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // NOTE: passportNumber is intentionally omitted from the export
  //       (it is the most sensitive field on the document).
  //       Raw MRZ strings are never included.
}

export interface ExportedTrip {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  legs: ExportedLeg[];
}

export interface ExportedLeg {
  id: string;
  destinationCountry: string;
  arrivalDate: string;
  departureDate?: string;
  flightNumber?: string;
  formStatus: string;
  order: number;
}

export interface DataExport {
  exportedAt: string;
  appVersion: string;
  profiles: ExportedProfile[];
  trips: ExportedTrip[];
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Build a sanitised JSON export of all user data.
 * Raw MRZ data and passport numbers are intentionally excluded.
 */
export async function buildDataExport(
  profileIds: string[],
): Promise<DataExport> {
  const profiles: ExportedProfile[] = [];

  for (const profileId of profileIds) {
    const profile = await keychainService.getProfileById(profileId);
    if (!profile) continue;

    // Deliberately strip passportNumber — it's the most sensitive field.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passportNumber: _passportNumber, ...safeProfile } = profile;

    profiles.push({
      id: safeProfile.id,
      surname: safeProfile.surname,
      givenNames: safeProfile.givenNames,
      nationality: safeProfile.nationality,
      dateOfBirth: safeProfile.dateOfBirth,
      gender: safeProfile.gender,
      passportExpiry: safeProfile.passportExpiry,
      issuingCountry: safeProfile.issuingCountry,
      email: safeProfile.email,
      phoneNumber: safeProfile.phoneNumber,
      occupation: safeProfile.occupation,
      relationship: safeProfile.relationship,
      defaultDeclarations: safeProfile.defaultDeclarations as unknown as Record<string, unknown>,
      createdAt: safeProfile.createdAt,
      updatedAt: safeProfile.updatedAt,
    });
  }

  // Load trips from WatermelonDB
  const trips: ExportedTrip[] = [];
  try {
    const dbTrips = (await databaseService.getTrips()) as Trip[];
    for (const dbTrip of dbTrips) {
      const legs = (await databaseService.getTripLegs(dbTrip.id)) as TripLeg[];
      trips.push({
        id: dbTrip.id,
        name: dbTrip.name ?? '',
        status: dbTrip.status ?? 'upcoming',
        createdAt: dbTrip.createdAt?.toISOString() ?? '',
        updatedAt: dbTrip.updatedAt?.toISOString() ?? '',
        legs: legs.map(leg => ({
          id: leg.id,
          destinationCountry: leg.destinationCountry ?? '',
          arrivalDate: leg.arrivalDate?.toISOString() ?? '',
          ...(leg.departureDate !== undefined ? { departureDate: leg.departureDate.toISOString() } : {}),
          ...(leg.flightNumber !== undefined ? { flightNumber: leg.flightNumber } : {}),
          formStatus: leg.formStatus ?? 'not_started',
          order: leg.order ?? 0,
        })),
      });
    }
  } catch (err) {
    console.warn('dataManager: failed to load trips for export', err);
  }

  return {
    exportedAt: new Date().toISOString(),
    appVersion: packageJson.version,
    profiles,
    trips,
  };
}

/**
 * Trigger the OS share sheet with a JSON export of all user data.
 * Returns true if the share was initiated, false if it was cancelled or failed.
 */
export async function exportUserData(profileIds: string[]): Promise<boolean> {
  try {
    const exportData = await buildDataExport(profileIds);
    const json = JSON.stringify(exportData, null, 2);

    const result = await Share.share(
      {
        title: 'Borderly Data Export',
        message: json,
      },
      { dialogTitle: 'Export My Data' },
    );

    return result.action !== Share.dismissedAction;
  } catch (err) {
    console.error('dataManager: exportUserData failed', err);
    throw err;
  }
}

// ─── Delete All ───────────────────────────────────────────────────────────────

/**
 * Permanently delete all app data across every storage tier:
 *   - OS Keychain entries (profiles + encryption keys)
 *   - WatermelonDB tables (trips, legs, QR codes)
 *   - MMKV config store
 */
export async function deleteAllData(profileIds: string[]): Promise<void> {
  const errors: string[] = [];

  // 1. Delete every profile from the Keychain (includes encryption keys).
  for (const profileId of profileIds) {
    try {
      await keychainService.deleteProfileById(profileId);
    } catch (err) {
      errors.push(`Keychain profile ${profileId}: ${String(err)}`);
    }
  }

  // 2. Also wipe the legacy keychain entry that may still exist.
  try {
    await keychainService.deleteProfile();
  } catch {
    // Ignore — may not exist.
  }

  // 3. Wipe the WatermelonDB database (trips, legs, QR codes).
  try {
    await databaseService.reset();
  } catch (err) {
    errors.push(`Database reset: ${String(err)}`);
  }

  // 4. Wipe all MMKV keys.
  try {
    mmkvService.clearAll();
  } catch (err) {
    errors.push(`MMKV clearAll: ${String(err)}`);
  }

  if (errors.length > 0) {
    // Surface errors but do not block — partial deletion is better than none.
    console.error('dataManager: deleteAllData encountered errors:', errors);
    throw new Error(`Data deletion had errors: ${errors.join('; ')}`);
  }
}
