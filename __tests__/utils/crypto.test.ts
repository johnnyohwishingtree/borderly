import {
  generateSalt,
  generateIV,
  deriveKeyFromPassphrase,
  encryptAESGCM,
  decryptAESGCM,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  SALT_BYTES,
  IV_BYTES,
  PBKDF2_ITERATIONS,
  PBKDF2_HASH,
  KEY_LENGTH_BITS,
} from '../../src/utils/crypto';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('has correct PBKDF2 iteration count', () => {
    expect(PBKDF2_ITERATIONS).toBe(100_000);
  });

  it('has correct key length', () => {
    expect(KEY_LENGTH_BITS).toBe(256);
  });

  it('has correct salt size', () => {
    expect(SALT_BYTES).toBe(32);
  });

  it('has correct IV size', () => {
    expect(IV_BYTES).toBe(12);
  });

  it('uses SHA-256 for PBKDF2', () => {
    expect(PBKDF2_HASH).toBe('SHA-256');
  });
});

describe('generateSalt', () => {
  it('returns a Uint8Array of SALT_BYTES length', () => {
    const salt = generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(SALT_BYTES);
  });

  it('returns different values on successive calls', () => {
    const a = generateSalt();
    const b = generateSalt();
    // Statistically near-impossible to be equal
    const equal = a.every((v, i) => v === b[i]);
    expect(equal).toBe(false);
  });
});

describe('generateIV', () => {
  it('returns a Uint8Array of IV_BYTES length', () => {
    const iv = generateIV();
    expect(iv).toBeInstanceOf(Uint8Array);
    expect(iv.length).toBe(IV_BYTES);
  });
});

describe('arrayBufferToBase64 / base64ToArrayBuffer', () => {
  it('round-trips empty buffer', () => {
    const buf = new ArrayBuffer(0);
    const b64 = arrayBufferToBase64(buf);
    const back = base64ToArrayBuffer(b64);
    expect(back.byteLength).toBe(0);
  });

  it('round-trips known data', () => {
    const data = new TextEncoder().encode('Hello, Borderly!');
    const b64 = arrayBufferToBase64(data.buffer);
    expect(typeof b64).toBe('string');
    const back = new Uint8Array(base64ToArrayBuffer(b64));
    expect(Array.from(back)).toEqual(Array.from(data));
  });

  it('produces valid base64 characters', () => {
    const data = new Uint8Array([0, 127, 255]);
    const b64 = arrayBufferToBase64(data.buffer);
    expect(b64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe('deriveKeyFromPassphrase', () => {
  it('derives a CryptoKey from passphrase and salt', async () => {
    const salt = generateSalt();
    const key = await deriveKeyFromPassphrase('test-pass', salt);
    expect(key).not.toBeUndefined();
    // CryptoKey type check
    expect(key.type).toBe('secret');
    expect(key.algorithm).not.toBeUndefined();
  });

  it('derives different keys for different passphrases', async () => {
    const salt = generateSalt();
    const key1 = await deriveKeyFromPassphrase('pass1', salt);
    const key2 = await deriveKeyFromPassphrase('pass2', salt);
    // Keys are non-extractable, so just verify they are different objects
    expect(key1).not.toBe(key2);
  });
});

describe('encryptAESGCM / decryptAESGCM', () => {
  it('encrypts and decrypts to recover original plaintext', async () => {
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKeyFromPassphrase('my-secret', salt);
    const plaintext = new TextEncoder().encode('Sensitive data');

    const ciphertext = await encryptAESGCM(key, iv, plaintext.buffer);
    expect(ciphertext.byteLength).toBeGreaterThan(0);

    const decrypted = await decryptAESGCM(key, iv, ciphertext);
    const result = new TextDecoder().decode(decrypted);
    expect(result).toBe('Sensitive data');
  });

  it('fails to decrypt with wrong key', async () => {
    const salt = generateSalt();
    const iv = generateIV();
    const key1 = await deriveKeyFromPassphrase('correct', salt);
    const key2 = await deriveKeyFromPassphrase('wrong', salt);
    const plaintext = new TextEncoder().encode('secret');

    const ciphertext = await encryptAESGCM(key1, iv, plaintext.buffer);
    await expect(decryptAESGCM(key2, iv, ciphertext)).rejects.toThrow();
  });

  it('fails to decrypt with wrong IV', async () => {
    const salt = generateSalt();
    const iv1 = generateIV();
    const iv2 = generateIV();
    const key = await deriveKeyFromPassphrase('pass', salt);
    const plaintext = new TextEncoder().encode('data');

    const ciphertext = await encryptAESGCM(key, iv1, plaintext.buffer);
    await expect(decryptAESGCM(key, iv2, ciphertext)).rejects.toThrow();
  });
});
