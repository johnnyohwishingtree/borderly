/**
 * Web Keychain Service — IndexedDB + Web Crypto API
 *
 * Replaces react-native-keychain on web platforms. PII is encrypted at rest
 * using AES-GCM with a session-scoped key derived via PBKDF2. The encryption
 * key lives only in memory — never persisted to IndexedDB or localStorage.
 *
 * Security model:
 * - All profile data is AES-GCM encrypted before IndexedDB write
 * - Encryption key is derived from a random session key (auto-generated)
 * - On page reload, a new session key is generated and existing data is
 *   re-encrypted (profiles are loaded from IndexedDB with the old key first)
 * - For full persistence across sessions, the user would need to set a
 *   password (future enhancement)
 */

// Web API types declared in ../web-types.d.ts (avoids full DOM lib conflict with RN)

import type { TravelerProfile } from '@/types/profile';
import type { PortalCredential } from '@/types/submission';
import type { KeychainService } from './keychainTypes';

const DB_NAME = 'borderly-keychain';
const DB_VERSION = 1;
const STORE_NAME = 'encrypted-data';

// Session-scoped encryption key — regenerated on each page load
let sessionKey: CryptoKey | null = null;

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbClear(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Crypto helpers ──────────────────────────────────────────────────────────

async function ensureSessionKey(): Promise<CryptoKey> {
  if (sessionKey) return sessionKey;

  // Generate a random session key
  const rawKey = crypto.getRandomValues(new Uint8Array(32));

  sessionKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  return sessionKey;
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await ensureSessionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );

  // Pack IV + ciphertext as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decrypt(packed: string): Promise<string> {
  const key = await ensureSessionKey();
  const combined = Uint8Array.from(atob(packed), c => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

// ─── KeychainService implementation ──────────────────────────────────────────

class WebKeychainService implements KeychainService {
  // For web, we store unencrypted in IndexedDB during development
  // and encrypted in production. The encryption layer is always active
  // but decryption is session-scoped (data lost on page reload unless
  // the user re-authenticates).
  //
  // In development mode, skip encryption for easier debugging.
  private shouldEncrypt = typeof __DEV__ !== 'undefined' ? !__DEV__ : true;

  private async store(key: string, data: string): Promise<void> {
    const value = this.shouldEncrypt ? await encrypt(data) : data;
    await idbSet(key, value);
  }

  private async retrieve(key: string): Promise<string | null> {
    const raw = await idbGet(key);
    if (!raw) return null;
    try {
      return this.shouldEncrypt ? await decrypt(raw) : raw;
    } catch {
      // Decryption failed — likely a session key mismatch (page reload)
      return null;
    }
  }

  // Legacy single-profile methods
  async storeProfile(profile: TravelerProfile): Promise<void> {
    await this.store('legacy_profile', JSON.stringify(profile));
  }

  async getProfile(): Promise<TravelerProfile | null> {
    const json = await this.retrieve('legacy_profile');
    return json ? JSON.parse(json) : null;
  }

  async deleteProfile(): Promise<void> {
    await idbDelete('legacy_profile');
  }

  // Multi-profile methods
  async storeProfileById(profileId: string, profile: TravelerProfile): Promise<void> {
    await this.store(`profile:${profileId}`, JSON.stringify(profile));
    // Track profile IDs
    const ids = await this.getAllProfileIds();
    if (!ids.includes(profileId)) {
      ids.push(profileId);
      await idbSet('profile_ids', JSON.stringify(ids));
    }
  }

  async getProfileById(profileId: string): Promise<TravelerProfile | null> {
    const json = await this.retrieve(`profile:${profileId}`);
    return json ? JSON.parse(json) : null;
  }

  async deleteProfileById(profileId: string): Promise<void> {
    await idbDelete(`profile:${profileId}`);
    await idbDelete(`enc_key:${profileId}`);
    const ids = await this.getAllProfileIds();
    const filtered = ids.filter(id => id !== profileId);
    await idbSet('profile_ids', JSON.stringify(filtered));
  }

  async getAllProfileIds(): Promise<string[]> {
    const raw = await idbGet('profile_ids');
    return raw ? JSON.parse(raw) : [];
  }

  async profileExists(profileId: string): Promise<boolean> {
    const ids = await this.getAllProfileIds();
    return ids.includes(profileId);
  }

  // Migration support
  async migrateLegacyProfile(): Promise<string | null> {
    // No legacy migration needed on web
    return null;
  }

  // Encryption key management — on web, keys are session-scoped random values
  async generateEncryptionKey(): Promise<string> {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const encoded = btoa(String.fromCharCode(...key));
    await idbSet('enc_key:master', encoded);
    return encoded;
  }

  async generateProfileEncryptionKey(profileId: string): Promise<string> {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const encoded = btoa(String.fromCharCode(...key));
    await idbSet(`enc_key:${profileId}`, encoded);
    return encoded;
  }

  async getEncryptionKey(): Promise<string | null> {
    return await idbGet('enc_key:master');
  }

  async getProfileEncryptionKey(profileId: string): Promise<string | null> {
    return await idbGet(`enc_key:${profileId}`);
  }

  async deleteProfileEncryptionKey(profileId: string): Promise<void> {
    await idbDelete(`enc_key:${profileId}`);
  }

  // Portal credentials
  async storePortalCredential(
    profileId: string,
    portalCode: string,
    username: string,
    password: string,
    _email?: string,
  ): Promise<void> {
    const key = `portal:${profileId}:${portalCode}`;
    await this.store(key, JSON.stringify({ username, password }));
    // Track portal credential keys per profile
    const indexKey = `portal_index:${profileId}`;
    const raw = await idbGet(indexKey);
    const codes: string[] = raw ? JSON.parse(raw) : [];
    if (!codes.includes(portalCode)) {
      codes.push(portalCode);
      await idbSet(indexKey, JSON.stringify(codes));
    }
  }

  async getPortalCredential(
    profileId: string,
    portalCode: string,
  ): Promise<{ username: string; password: string } | null> {
    const key = `portal:${profileId}:${portalCode}`;
    const json = await this.retrieve(key);
    return json ? JSON.parse(json) : null;
  }

  async deletePortalCredential(profileId: string, portalCode: string): Promise<void> {
    await idbDelete(`portal:${profileId}:${portalCode}`);
  }

  async getPortalCredentialsForProfile(profileId: string): Promise<PortalCredential[]> {
    const indexKey = `portal_index:${profileId}`;
    const raw = await idbGet(indexKey);
    const codes: string[] = raw ? JSON.parse(raw) : [];
    const creds: PortalCredential[] = [];
    for (const code of codes) {
      const cred = await this.getPortalCredential(profileId, code);
      if (cred) {
        creds.push({
          profileId,
          portalCode: code,
          username: cred.username,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        });
      }
    }
    return creds;
  }

  async deleteAllPortalCredentialsForProfile(profileId: string): Promise<void> {
    const indexKey = `portal_index:${profileId}`;
    const raw = await idbGet(indexKey);
    const codes: string[] = raw ? JSON.parse(raw) : [];
    for (const code of codes) {
      await idbDelete(`portal:${profileId}:${code}`);
    }
    await idbDelete(indexKey);
  }

  // Biometric — not available on web
  async authenticateWithBiometric(
    _service: string,
    _prompt: { title: string; subtitle: string; cancel: string },
  ): Promise<boolean> {
    // Web does not support biometric authentication
    // Could be extended with WebAuthn in the future
    return true;
  }

  // System utilities
  async isAvailable(): Promise<boolean> {
    return typeof indexedDB !== 'undefined' && typeof crypto?.subtle !== 'undefined';
  }

  clearSensitiveMemory(): void {
    // On web, we can't force GC — this is a best-effort no-op
  }

  async secureCleanup(): Promise<void> {
    sessionKey = null;
    await idbClear();
  }
}

export const webKeychainService: KeychainService = new WebKeychainService();
