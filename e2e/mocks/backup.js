/**
 * Web / E2E mock for src/services/backup.
 *
 * The real BackupService imports WatermelonDB models directly, which causes a
 * Babel compilation error in the webpack E2E build (definite-assignment fields
 * combined with legacy decorators).  This mock provides the same API surface
 * with no-op implementations so the UI can be exercised in Playwright tests.
 */

const backupService = {
  export: function() {
    return Promise.reject(new Error('backupService.export is not available in web preview'));
  },
  import: function() {
    return Promise.reject(new Error('backupService.import is not available in web preview'));
  },
};

module.exports = {
  backupService,
  // Re-export constants so imports don't crash
  BACKUP_FILE_HEADER: 'BORDERLY_BACKUP_V1',
  BACKUP_CURRENT_VERSION: 1,
};
