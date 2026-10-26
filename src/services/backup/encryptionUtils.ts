/**
 * Password-based AEAD for .fintrack backup files.
 *
 * Current format (prefix FTB2.): AES-256-GCM with a key from PBKDF2-SHA256
 * over the user password and a random 16-byte salt (210k iterations).
 *
 * Legacy format (no prefix): SHA-256 iterated XOR obfuscation. Still readable
 * once for restore; new backups always write FTB2.
 */
import * as Crypto from 'expo-crypto';
import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

export const BACKUP_AEAD_PREFIX = 'FTB2.';
const PBKDF2_ITERATIONS = 210_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

/** Legacy XOR key derivation rounds (read-only compatibility). */
const LEGACY_KEY_DERIVATION_ROUNDS = 1000;
const LEGACY_DERIVED_KEY_LENGTH = 64;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function utf8Encode(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text);
  }
  const binary = unescape(encodeURIComponent(text));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function utf8Decode(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }
  let encoded = '';
  for (let i = 0; i < bytes.length; i++) {
    encoded += '%' + bytes[i]!.toString(16).padStart(2, '0');
  }
  return decodeURIComponent(encoded);
}

async function randomBytes(length: number): Promise<Uint8Array> {
  const bytes = await Crypto.getRandomBytesAsync(length);
  return new Uint8Array(bytes);
}

async function deriveAeadKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  return pbkdf2Async(sha256, password, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: KEY_LENGTH,
  });
}

/**
 * Encrypt plaintext with AES-256-GCM. Returns versioned FTB2. envelope.
 */
export async function encryptBackup(plaintext: string, password: string): Promise<string> {
  const salt = await randomBytes(SALT_LENGTH);
  const iv = await randomBytes(IV_LENGTH);
  const key = await deriveAeadKey(password, salt);
  const cipher = gcm(key, iv);
  const ciphertext = cipher.encrypt(utf8Encode(plaintext));

  const packed = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.length);
  packed.set(salt, 0);
  packed.set(iv, SALT_LENGTH);
  packed.set(ciphertext, SALT_LENGTH + IV_LENGTH);

  return BACKUP_AEAD_PREFIX + bytesToBase64(packed);
}

/**
 * Decrypt an FTB2. AEAD envelope. Throws on auth failure / corruption.
 */
export async function decryptBackupAead(envelope: string, password: string): Promise<string> {
  if (!envelope.startsWith(BACKUP_AEAD_PREFIX)) {
    throw new Error('Not an FTB2 encrypted backup');
  }
  const packed = base64ToBytes(envelope.slice(BACKUP_AEAD_PREFIX.length));
  if (packed.length < SALT_LENGTH + IV_LENGTH + 16) {
    throw new Error('Encrypted backup is truncated or invalid');
  }
  const salt = packed.slice(0, SALT_LENGTH);
  const iv = packed.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = packed.slice(SALT_LENGTH + IV_LENGTH);
  const key = await deriveAeadKey(password, salt);
  const cipher = gcm(key, iv);
  try {
    return utf8Decode(cipher.decrypt(ciphertext));
  } catch {
    throw new Error('Backup decryption failed. Wrong password or corrupted file.');
  }
}

/**
 * Decrypt a backup file: FTB2 AEAD first, else legacy XOR obfuscation.
 */
export async function decryptBackup(payload: string, password: string): Promise<string> {
  if (payload.startsWith(BACKUP_AEAD_PREFIX)) {
    return decryptBackupAead(payload, password);
  }
  return deobfuscate(payload, password);
}

/**
 * Derive a key from a password by iterating SHA-256 (legacy).
 */
export async function deriveKey(password: string): Promise<string> {
  let hash = password;
  for (let i = 0; i < LEGACY_KEY_DERIVATION_ROUNDS; i++) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hash);
  }
  return hash.slice(0, LEGACY_DERIVED_KEY_LENGTH);
}

function xorWithKey(data: string, key: string): string {
  const result: string[] = [];
  for (let i = 0; i < data.length; i++) {
    const dataChar = data.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    result.push(String.fromCharCode(dataChar ^ keyChar));
  }
  return result.join('');
}

/**
 * Reverse legacy password-based XOR obfuscation (read-only compatibility).
 */
export async function deobfuscate(ciphertext: string, password: string): Promise<string> {
  const key = await deriveKey(password);
  const xored = atob(ciphertext);
  const base64Data = xorWithKey(xored, key);
  const plaintext = decodeURIComponent(
    atob(base64Data)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
  return plaintext;
}

/**
 * Compute a SHA-256 checksum of the given data string.
 */
export async function computeChecksum(data: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
}
