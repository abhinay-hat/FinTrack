import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

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

export async function hashPIN(pin: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin,
  );
  return hash;
}

export async function verifyPIN(
  pin: string,
  storedHash: string,
): Promise<boolean> {
  const hash = await hashPIN(pin);
  return hash === storedHash;
}
