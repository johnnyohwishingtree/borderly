/**
 * useBackupRestore
 *
 * Custom hook that manages the backup restore flow:
 *  - File content (pasted .borderly content) + passphrase state
 *  - Client-side validation (non-empty file content, non-empty passphrase)
 *  - Calls BackupService.import() to decrypt and validate the backup envelope
 *  - Exposes success/error state so the modal can show appropriate feedback
 */

import { useState, useCallback } from 'react';
import { backupService } from '../services/backup';
import type { BackupEnvelope } from '../services/backup/backupTypes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseBackupRestoreResult {
  /** The pasted .borderly file content. */
  fileContent: string;
  /** The passphrase used to decrypt the backup. */
  passphrase: string;
  /** True while backupService.import() is running. */
  isLoading: boolean;
  /** Validation or decryption error message, or null when no error. */
  error: string | null;
  /** True once the backup has been successfully imported. */
  isSuccess: boolean;
  /** The decrypted envelope after a successful import, or null otherwise. */
  envelope: BackupEnvelope | null;
  setFileContent: (value: string) => void;
  setPassphrase: (value: string) => void;
  handleRestore: () => Promise<void>;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBackupRestore(): UseBackupRestoreResult {
  const [fileContent, setFileContent] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [envelope, setEnvelope] = useState<BackupEnvelope | null>(null);

  const reset = useCallback(() => {
    setFileContent('');
    setPassphrase('');
    setIsLoading(false);
    setError(null);
    setIsSuccess(false);
    setEnvelope(null);
  }, []);

  const handleRestore = useCallback(async () => {
    // --- Validation ---
    if (!fileContent.trim()) {
      setError('Please paste your backup file content.');
      return;
    }
    if (!passphrase) {
      setError('Please enter your backup passphrase.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const result = await backupService.import(fileContent.trim(), passphrase);
      setEnvelope(result);
      setIsSuccess(true);
      // Clear the passphrase from state after a successful import.
      setPassphrase('');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(`Restore failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [fileContent, passphrase]);

  return {
    fileContent,
    passphrase,
    isLoading,
    error,
    isSuccess,
    envelope,
    setFileContent,
    setPassphrase,
    handleRestore,
    reset,
  };
}
