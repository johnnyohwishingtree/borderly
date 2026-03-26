import { TravelerProfile } from '@/types/profile';
import { PortalCredential } from '@/types/submission';

export interface KeychainService {
  // Legacy single-profile methods (for backward compatibility)
  storeProfile(profile: TravelerProfile): Promise<void>;
  getProfile(): Promise<TravelerProfile | null>;
  deleteProfile(): Promise<void>;

  // New multi-profile methods
  storeProfileById(profileId: string, profile: TravelerProfile): Promise<void>;
  getProfileById(profileId: string): Promise<TravelerProfile | null>;
  deleteProfileById(profileId: string): Promise<void>;
  getAllProfileIds(): Promise<string[]>;
  profileExists(profileId: string): Promise<boolean>;

  // Migration support
  migrateLegacyProfile(): Promise<string | null>; // Returns migrated profile ID if any

  // Encryption key management
  generateEncryptionKey(): Promise<string>;
  generateProfileEncryptionKey(profileId: string): Promise<string>;
  getEncryptionKey(): Promise<string | null>;
  getProfileEncryptionKey(profileId: string): Promise<string | null>;
  deleteProfileEncryptionKey(profileId: string): Promise<void>;

  // Portal credential methods
  storePortalCredential(profileId: string, portalCode: string, username: string, password: string, email?: string): Promise<void>;
  getPortalCredential(profileId: string, portalCode: string): Promise<{ username: string; password: string } | null>;
  deletePortalCredential(profileId: string, portalCode: string): Promise<void>;
  getPortalCredentialsForProfile(profileId: string): Promise<PortalCredential[]>;
  deleteAllPortalCredentialsForProfile(profileId: string): Promise<void>;

  // System utilities
  isAvailable(): Promise<boolean>;
  clearSensitiveMemory(): void;
  secureCleanup(): Promise<void>;
}
