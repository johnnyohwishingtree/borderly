/**
 * useBackupExport
 *
 * Custom hook that manages the backup export flow:
 *  - Passphrase + confirm-passphrase state
 *  - Client-side validation (min 8 chars, passphrase match)
 *  - Passphrase strength calculation
 *  - Calls BackupService.export() and invokes the OS Share sheet
 */

import { useState, useCallback } from 'react';
import { Share } from 'react-native';
import { backupService } from '../services/backup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PassphraseStrength = 'weak' | 'fair' | 'strong';

export interface UseBackupExportResult {
  passphrase: string;
  confirmPassphrase: string;
  isLoading: boolean;
  error: string | null;
  strength: PassphraseStrength;
  setPassphrase: (value: string) => void;
  setConfirmPassphrase: (value: string) => void;
  handleExport: () => Promise<void>;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Passphrase strength calculation
// ---------------------------------------------------------------------------

/**
 * Returns a strength rating for the passphrase.
 *
 * - weak:   fewer than 8 characters, or only one character class
 * - fair:   8+ characters with at least two character classes
 * - strong: 12+ characters with three or more character classes
 */
export function computePassphraseStrength(value: string): PassphraseStrength {
  if (value.length < 8) return 'weak';

  let classes = 0;
  if (/[a-z]/.test(value)) classes++;
  if (/[A-Z]/.test(value)) classes++;
  if (/[0-9]/.test(value)) classes++;
  if (/[^a-zA-Z0-9]/.test(value)) classes++;

  if (value.length >= 12 && classes >= 3) return 'strong';
  if (classes >= 2) return 'fair';
  return 'weak';
}

/**
 * Generates a YYYYMMDD date string for the backup filename.
 * Exported for unit testing.
 */
export function formatBackupDate(date: Date): string {
  const yyyy = date.getFullYear().toString();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBackupExport(): UseBackupExportResult {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = computePassphraseStrength(passphrase);

  const reset = useCallback(() => {
    setPassphrase('');
    setConfirmPassphrase('');
    setIsLoading(false);
    setError(null);
  }, []);

  const handleExport = useCallback(async () => {
    // --- Validation ---
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Generate encrypted backup file content
      const fileContent = await backupService.export(passphrase);

      // Build filename: borderly-backup-YYYYMMDD.borderly
      const dateStr = formatBackupDate(new Date());
      const fileName = `borderly-backup-${dateStr}.borderly`;

      // Invoke OS share sheet
      const result = await Share.share(
        {
          title: fileName,
          message: fileContent,
        },
        { dialogTitle: 'Save Backup File' },
      );

      if (result.action === Share.dismissedAction) {
        // User cancelled — not an error, but don't clear the form
        return;
      }

      // Success: clear sensitive data
      setPassphrase('');
      setConfirmPassphrase('');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(`Export failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [passphrase, confirmPassphrase]);

  return {
    passphrase,
    confirmPassphrase,
    isLoading,
    error,
    strength,
    setPassphrase,
    setConfirmPassphrase,
    handleExport,
    reset,
  };
}
