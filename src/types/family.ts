export type FamilyRelationship = 
  | 'self'      // Primary account holder
  | 'spouse'    // Spouse/partner
  | 'child'     // Child (minor or adult)
  | 'parent'    // Parent
  | 'sibling'   // Brother/sister
  | 'other';    // Other family member/travel companion

export interface ProfileMetadata {
  id: string;                           // Unique profile ID
  nickname?: string;                    // Optional display name (e.g., "Mom", "John Jr.")
  relationship: FamilyRelationship;     // Relationship to primary account holder
  isPrimary: boolean;                   // Whether this is the primary profile
  isActive: boolean;                    // Whether profile is currently active
  lastAccessed?: string;                // ISO 8601 timestamp of last access
  biometricEnabled: boolean;            // Whether biometric auth is enabled for this profile
  createdAt: string;                    // ISO 8601 timestamp
  updatedAt: string;                    // ISO 8601 timestamp
}

export interface FamilyProfileCollection {
  profiles: Map<string, ProfileMetadata>; // Profile ID -> metadata
  primaryProfileId: string;               // ID of the primary profile
  maxProfiles: number;                    // Maximum allowed profiles (8)
  version: number;                        // Schema version for migrations
  lastModified: string;                   // ISO 8601 timestamp
}

// For storing in MMKV (serializable version)
export interface SerializableFamilyProfileCollection {
  profiles: Record<string, ProfileMetadata>;
  primaryProfileId: string;
  maxProfiles: number;
  version: number;
  lastModified: string;
}

export interface ProfileKeyMapping {
  profileId: string;
  keychainKey: string;
  encryptionKeyId: string;
}

export interface FamilyProfileStats {
  totalProfiles: number;
  activeProfiles: number;
  primaryProfile: ProfileMetadata;
  lastAccessedProfile: ProfileMetadata | undefined;
  profilesByRelationship: Record<FamilyRelationship, number>;
}