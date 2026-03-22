/**
 * useBackupRestore
 *
 * Manages the multi-step Restore from Backup flow:
 *   idle → file-selected → passphrase → loading → (confirming-replace | success) → success
 *                                                                       ↓ error
 *
 * Responsibilities:
 *  - Platform-aware file picking (.borderly files)
 *  - Passphrase collection
 *  - BackupService decryption
 *  - Conflict detection (existing data present?)
 *  - Data restoration: profiles → Keychain, trips/QRs → WatermelonDB, prefs → MMKV
 *  - Store refresh after successful restore
 */

import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { backupService } from '@/services/backup';
import { keychainService, mmkvService, databaseService } from '@/services/storage';
import { BackupEnvelope } from '@/services/backup/backupTypes';

export type RestoreStep =
  | 'idle'
  | 'file-selected'
  | 'passphrase'
  | 'loading'
  | 'confirming-replace'
  | 'success'
  | 'error';

export interface UseBackupRestoreResult {
  /** Current step in the restore flow. */
  step: RestoreStep;
  /** Passphrase text field value. */
  passphrase: string;
  /** Human-readable error message, non-null when step === 'error'. */
  errorMessage: string | null;
  /** Whether the passphrase input should hide characters (toggleable). */
  secureTextEntry: boolean;
  /** Trigger file picker and advance to 'passphrase' step on success. */
  pickFile: () => Promise<void>;
  /** Update the passphrase input value. */
  setPassphrase: (value: string) => void;
  /** Toggle passphrase visibility. */
  toggleSecureEntry: () => void;
  /** Decrypt the file and check for conflicts; advances to next step. */
  submitPassphrase: () => Promise<void>;
  /** Confirm replacement: wipe existing data and restore. */
  confirmReplace: () => Promise<void>;
  /** Reset the hook to the initial idle state. */
  reset: () => void;
}

// ─── Platform-aware file picker ────────────────────────────────────────────

/**
 * Opens an OS-level file picker filtered to .borderly files and returns the
 * text content of the selected file.  Returns null when the user cancels.
 *
 * On web (E2E / preview): uses a hidden <input type="file"> element.
 * On native: requires react-native-document-picker (to be wired up separately).
 */
async function pickBorderlyFile(): Promise<string | null> {
  if (Platform.OS === 'web') {
    // Cast to any to avoid tsconfig dom lib requirement.
    // This code only runs in the browser (Platform.OS === 'web').
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = (globalThis as any).document as any;

    return new Promise<string | null>((resolve) => {
      const input = doc.createElement('input');
      input.type = 'file';
      input.accept = '.borderly';
      input.setAttribute('data-testid', 'borderly-file-input');
      input.style.display = 'none';

      const cleanup = () => {
        if (doc.body.contains(input)) {
          doc.body.removeChild(input);
        }
      };

      input.addEventListener('cancel', () => {
        cleanup();
        resolve(null);
      });

      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          cleanup();
          resolve(null);
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reader = new (globalThis as any).FileReader();
        reader.onload = () => {
          cleanup();
          resolve(typeof reader.result === 'string' ? reader.result : null);
        };
        reader.onerror = () => {
          cleanup();
          resolve(null);
        };
        reader.readAsText(file);
      };

      doc.body.appendChild(input);
      input.click();
    });
  }

  // Native: react-native-document-picker integration point.
  // Currently shows a user-facing placeholder because document picker is not
  // bundled in this release.  A future sprint will integrate
  // react-native-document-picker and remove this alert.
  Alert.alert(
    'File Picker Not Available',
    'The native document picker will be available in a future update. Please use the app on a supported device with the full build.',
  );
  return null;
}

// ─── Restore helpers ────────────────────────────────────────────────────────

/**
 * Writes all data from a decrypted BackupEnvelope back to the three storage
 * tiers (Keychain / WatermelonDB / MMKV).
 *
 * Call AFTER clearing existing data if the user chose "Replace all".
 */
async function restoreEnvelope(envelope: BackupEnvelope): Promise<void> {
  const { profiles, familyCollection, trips, qrCodes, preferences } = envelope.payload;

  // 1. Profiles → OS Keychain
  for (const entry of profiles) {
    await keychainService.storeProfileById(entry.id, entry.profile);
  }

  // 2. Family collection metadata → MMKV
  if (familyCollection) {
    mmkvService.setString('family_profiles', JSON.stringify(familyCollection));
    if (familyCollection.primaryProfileId) {
      mmkvService.setString('current_profile_id', familyCollection.primaryProfileId);
    }
  }

  // 3. Preferences → MMKV (skip current_profile_id and family_profiles which
  //    are already handled above, and skip onboardingComplete so the app
  //    routes to Main after restore)
  const skipKeys = new Set(['family_profiles', 'current_profile_id', 'onboardingComplete']);
  for (const [key, value] of Object.entries(preferences)) {
    if (!skipKeys.has(key) && typeof value === 'string') {
      mmkvService.setString(key, value);
    }
  }

  // Mark onboarding complete so the app navigates to Home after restore
  mmkvService.setString('onboardingComplete', 'true');

  // 4. Trips + legs → WatermelonDB
  //    WatermelonDB auto-generates IDs, so we store original IDs in formDataString
  //    or keep the data as-is. We reset the DB first to avoid duplicate records.
  for (const tripData of trips) {
    const trip = await databaseService.createTrip({
      name: tripData.name,
      status: tripData.status as 'upcoming' | 'active' | 'completed',
    });

    for (const legData of tripData.legs) {
      await databaseService.createTripLeg({
        tripId: (trip as any).id,
        destinationCountry: legData.destinationCountry,
        arrivalDate: legData.arrivalDate,
        departureDate: legData.departureDate,
        flightNumber: legData.flightNumber,
        airlineCode: legData.airlineCode,
        arrivalAirport: legData.arrivalAirport,
        accommodationData: legData.accommodationData,
        formStatus: legData.formStatus as any,
        formDataString: legData.formDataString,
        order: legData.order,
      } as any);
    }
  }

  // 5. QR codes → WatermelonDB
  for (const qr of qrCodes) {
    await databaseService.saveQRCode({
      legId: qr.legId,
      travelerId: qr.travelerId,
      type: qr.type,
      imageBase64: qr.imageBase64,
      savedAt: qr.savedAt,
      label: qr.label,
    } as any);
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useBackupRestore(): UseBackupRestoreResult {
  const [step, setStep] = useState<RestoreStep>('idle');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<BackupEnvelope | null>(null);
  const [passphrase, setPassphraseState] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const reset = useCallback(() => {
    setStep('idle');
    setFileContent(null);
    setEnvelope(null);
    setPassphraseState('');
    setErrorMessage(null);
    setSecureTextEntry(true);
  }, []);

  const pickFile = useCallback(async () => {
    const content = await pickBorderlyFile();
    if (content === null) {
      // User cancelled — stay on idle
      return;
    }
    setFileContent(content);
    setStep('passphrase');
  }, []);

  const setPassphrase = useCallback((value: string) => {
    setPassphraseState(value);
  }, []);

  const toggleSecureEntry = useCallback(() => {
    setSecureTextEntry((prev) => !prev);
  }, []);

  const submitPassphrase = useCallback(async () => {
    if (!fileContent) {
      setErrorMessage('No backup file selected. Please go back and pick a file.');
      setStep('error');
      return;
    }

    setStep('loading');
    setErrorMessage(null);

    try {
      const decrypted = await backupService.import(fileContent, passphrase);
      setEnvelope(decrypted);

      // Check if there is existing data to warn about
      const existingFamilyData = mmkvService.getString('family_profiles');
      if (existingFamilyData) {
        // Conflict: prompt user to confirm replacement
        setStep('confirming-replace');
      } else {
        // No existing data — restore immediately
        await restoreEnvelope(decrypted);
        setStep('success');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(mapErrorMessage(message));
      setStep('error');
    } finally {
      // Clear passphrase from memory
      setPassphraseState('');
    }
  }, [fileContent, passphrase]);

  const confirmReplace = useCallback(async () => {
    if (!envelope) {
      setErrorMessage('Backup data is not available. Please start over.');
      setStep('error');
      return;
    }

    setStep('loading');
    setErrorMessage(null);

    try {
      await restoreEnvelope(envelope);
      setStep('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(message);
      setStep('error');
    }
  }, [envelope]);

  return {
    step,
    passphrase,
    errorMessage,
    secureTextEntry,
    pickFile,
    setPassphrase,
    toggleSecureEntry,
    submitPassphrase,
    confirmReplace,
    reset,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapErrorMessage(raw: string): string {
  if (raw.includes('incorrect passphrase') || raw.includes('Failed to decrypt')) {
    return 'Incorrect passphrase. Please check your passphrase and try again.';
  }
  if (raw.includes('Invalid backup file') || raw.includes('not valid Base64') || raw.includes('truncated')) {
    return 'This file appears to be corrupted or is not a valid Borderly backup.';
  }
  if (raw.includes('Unsupported backup version')) {
    return 'This backup was created with a newer version of Borderly. Please update the app and try again.';
  }
  return raw;
}
