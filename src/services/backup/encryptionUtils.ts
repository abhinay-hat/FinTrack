/**
 * Encryption utilities for .fintrack backup files.
 *
 * Uses expo-crypto SHA-256 for key derivation and a repeating-key XOR cipher
 * over Base64-encoded data. This is **not** production-grade cryptography —
 * real encryption will come via SQLCipher (FIN-20).
 */
import * as Crypto from 'expo-crypto';

const KEY_DERIVATION_ROUNDS = 1000;
const DERIVED_KEY_LENGTH = 64; // chars of hex = 32 bytes

/**
 * Derive a key from a password by iterating SHA-256.
 */
export async function deriveKey(password: string): Promise<string> {
  let hash = password;
  for (let i = 0; i < KEY_DERIVATION_ROUNDS; i++) {
    hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      hash,
    );
  }
  return hash.slice(0, DERIVED_KEY_LENGTH);
}

/**
 * XOR a string with a repeating key and return the result.
 * Both input and output are plain strings; caller handles Base64.
 */
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
 * Encrypt a plaintext JSON string with the given password.
 *
 * Flow: plaintext -> Base64 -> XOR with derived key -> Base64
 */
export async function encrypt(
  plaintext: string,
  password: string,
): Promise<string> {
  const key = await deriveKey(password);
  const base64Data = btoa(
    encodeURIComponent(plaintext).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16)),
    ),
  );
  const xored = xorWithKey(base64Data, key);
  // Encode XOR result as Base64 using a safe approach for arbitrary chars
  const encoded = btoa(
    Array.from(xored)
      .map((c) => String.fromCharCode(c.charCodeAt(0) & 0xff))
      .join(''),
  );
  return encoded;
}

/**
 * Decrypt a previously encrypted string with the given password.
 *
 * Flow: Base64 decode -> XOR with derived key -> Base64 decode -> plaintext
 */
export async function decrypt(
  ciphertext: string,
  password: string,
): Promise<string> {
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
