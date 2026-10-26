import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

const PIN_SECURE_KEY = 'fintrack.pin.credential.v2';
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

export interface PinCredential {
  version: 2;
  salt: string;
  hash: string;
  iterations: number;
}

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock FinTrack',
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: true,
  });
  return result.success;
}

async function randomSalt(): Promise<Uint8Array> {
  const bytes = await Crypto.getRandomBytesAsync(SALT_BYTES);
  return new Uint8Array(bytes);
}

async function derivePinHash(
  pin: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  return pbkdf2Async(sha256, pin, salt, { c: iterations, dkLen: HASH_BYTES });
}

/**
 * Create a salted PBKDF2-SHA256 credential for a PIN.
 */
export async function hashPIN(pin: string): Promise<PinCredential> {
  const salt = await randomSalt();
  const hash = await derivePinHash(pin, salt, PBKDF2_ITERATIONS);
  return {
    version: 2,
    salt: bytesToHex(salt),
    hash: bytesToHex(hash),
    iterations: PBKDF2_ITERATIONS,
  };
}

export async function storePinCredential(credential: PinCredential): Promise<void> {
  await SecureStore.setItemAsync(PIN_SECURE_KEY, JSON.stringify(credential));
}

export async function loadPinCredential(): Promise<PinCredential | null> {
  const raw = await SecureStore.getItemAsync(PIN_SECURE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PinCredential;
    if (
      parsed?.version === 2 &&
      typeof parsed.salt === 'string' &&
      typeof parsed.hash === 'string' &&
      typeof parsed.iterations === 'number'
    ) {
      return parsed;
    }
  } catch {
    // ignore corrupt secure store payload
  }
  return null;
}

export async function clearPinCredential(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_SECURE_KEY);
}

/**
 * Verify PIN against a v2 SecureStore credential.
 */
export async function verifyPinCredential(
  pin: string,
  credential: PinCredential,
): Promise<boolean> {
  const salt = hexToBytes(credential.salt);
  const expected = hexToBytes(credential.hash);
  const actual = await derivePinHash(pin, salt, credential.iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i]! ^ expected[i]!;
  }
  return diff === 0;
}

/**
 * Legacy unsalted SHA-256 used by AsyncStorage-era builds.
 * Kept only for one-shot migration on successful unlock.
 */
export async function verifyLegacySha256Pin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
  return hash === storedHash;
}

/**
 * @deprecated Prefer hashPIN + storePinCredential. Kept for type compatibility.
 */
export async function verifyPIN(pin: string, storedHash: string): Promise<boolean> {
  return verifyLegacySha256Pin(pin, storedHash);
}
