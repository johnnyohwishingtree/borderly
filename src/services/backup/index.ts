/**
 * BackupService barrel export.
 *
 * Usage:
 *   import { backupService, BackupEnvelope } from '@/services/backup';
 */

export { backupService } from './backupService';
export type {
  BackupEnvelope,
  BackupPayload,
  ProfileBackupEntry,
  TripBackupData,
  TripLegBackupData,
  QRCodeBackupData,
} from './backupTypes';
export { BACKUP_FILE_HEADER, BACKUP_CURRENT_VERSION } from './backupTypes';
