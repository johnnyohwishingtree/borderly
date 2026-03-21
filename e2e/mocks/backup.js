// Mock for @/services/backup — replaces the backup service layer for web E2E.
// The real implementation uses native crypto APIs and WatermelonDB, which cannot
// run in the Playwright browser environment.

const backupService = {
  export: (passphrase) => {
    if (!passphrase || passphrase.length < 8) {
      return Promise.reject(new Error('Passphrase must be at least 8 characters.'));
    }
    // Return a mock .borderly file content for E2E testing
    return Promise.resolve('BORDERLY_BACKUP_V1\nMOCK_ENCRYPTED_CONTENT==');
  },
  import: (fileContent, passphrase) => {
    if (!fileContent || !fileContent.startsWith('BORDERLY_BACKUP_V1')) {
      return Promise.reject(new Error('Invalid backup file'));
    }
    return Promise.resolve({
      version: 1,
      createdAt: new Date().toISOString(),
      payload: {
        profiles: [],
        familyCollection: null,
        trips: [],
        qrCodes: [],
        preferences: {},
      },
    });
  },
};

module.exports = {
  backupService,
  BACKUP_FILE_HEADER: 'BORDERLY_BACKUP_V1',
  BACKUP_CURRENT_VERSION: 1,
};
