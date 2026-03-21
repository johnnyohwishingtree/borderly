/**
 * Cryptographic utilities for Borderly
 *
 * Provides PBKDF2 key derivation and AES-256-GCM encryption/decryption
 * helpers used by the BackupService. All operations use the Web Crypto API
 * (crypto.subtle), which is available in React Native (Hermes/JSC) and in
 * the Node.js Jest test environment (polyfilled via react-native-get-random-values).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of PBKDF2 iterations (NIST SP 800-132 recommendation: ≥ 100 000). */
export const PBKDF2_ITERATIONS = 100_000;
export const PBKDF2_HASH = 'SHA-256';
export const KEY_LENGTH_BITS = 256;
/** Salt size in bytes (256 bits). */
export const SALT_BYTES = 32;
/** AES-GCM nonce / IV size in bytes (96 bits – standard for GCM). */
export const IV_BYTES = 12;

// ---------------------------------------------------------------------------
// Random byte generators
// ---------------------------------------------------------------------------

/** Generate a cryptographically random salt. */
export function generateSalt(): Uint8Array<ArrayBuffer> {
  const salt = new Uint8Array(new ArrayBuffer(SALT_BYTES));
  crypto.getRandomValues(salt);
  return salt;
}

/** Generate a cryptographically random AES-GCM IV. */
export function generateIV(): Uint8Array<ArrayBuffer> {
  const iv = new Uint8Array(new ArrayBuffer(IV_BYTES));
  crypto.getRandomValues(iv);
  return iv;
}

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

/**
 * Derive an AES-256-GCM CryptoKey from a passphrase and salt using PBKDF2.
 *
 * @param passphrase - User-supplied plaintext passphrase.
 * @param salt - Random salt (must be SALT_BYTES long).
 * @returns A non-extractable CryptoKey suitable for AES-GCM encrypt/decrypt.
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  // Cast salt to ArrayBuffer-backed Uint8Array to satisfy SubtleCrypto types.
  const saltBuf = salt.buffer instanceof ArrayBuffer
    ? (salt as Uint8Array<ArrayBuffer>)
    : new Uint8Array(salt) as Uint8Array<ArrayBuffer>;

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuf,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ---------------------------------------------------------------------------
// Encrypt / decrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt data with AES-256-GCM.
 *
 * @param key - CryptoKey derived from deriveKeyFromPassphrase.
 * @param iv  - Random IV (must be IV_BYTES long).
 * @param data - Plaintext ArrayBuffer.
 * @returns Ciphertext ArrayBuffer (includes GCM auth tag appended by WebCrypto).
 */
export async function encryptAESGCM(
  key: CryptoKey,
  iv: Uint8Array,
  data: ArrayBuffer,
): Promise<ArrayBuffer> {
  const ivBuf = iv.buffer instanceof ArrayBuffer
    ? (iv as Uint8Array<ArrayBuffer>)
    : new Uint8Array(iv) as Uint8Array<ArrayBuffer>;
  return crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBuf }, key, data);
}

/**
 * Decrypt data with AES-256-GCM.
 *
 * @param key - CryptoKey derived from deriveKeyFromPassphrase.
 * @param iv  - IV used during encryption.
 * @param data - Ciphertext ArrayBuffer (including GCM auth tag).
 * @returns Plaintext ArrayBuffer.
 * @throws DOMException if decryption fails (wrong key / corrupted data).
 */
export async function decryptAESGCM(
  key: CryptoKey,
  iv: Uint8Array,
  data: ArrayBuffer,
): Promise<ArrayBuffer> {
  const ivBuf = iv.buffer instanceof ArrayBuffer
    ? (iv as Uint8Array<ArrayBuffer>)
    : new Uint8Array(iv) as Uint8Array<ArrayBuffer>;
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, key, data);
}

// ---------------------------------------------------------------------------
// Base64 helpers
// ---------------------------------------------------------------------------

/**
 * Encode an ArrayBuffer to a Base64 string.
 * Works in both React Native and Node.js environments.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode a Base64 string to an ArrayBuffer.
 * Works in both React Native and Node.js environments.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
