// Re-export all type definitions for easy importing
export * from './profile';
export * from './trip';
export * from './schema';
export * from './navigation';
export * from './submission';
export * from './boarding';

// Create aliases for backward compatibility
import type { TravelerProfile } from './profile';
export type UserProfile = TravelerProfile;
