/**
 * SQLCipher Encryption Stub (FIN-20)
 *
 * Real SQLCipher-based database encryption requires a custom Expo dev client
 * build with native modules. This stub provides placeholder functions that
 * document the limitation and can be swapped out when a dev client is
 * configured.
 *
 * To enable real encryption:
 *   1. Create a custom dev client (npx expo run:ios / npx expo run:android)
 *   2. Install a SQLCipher-compatible WatermelonDB native driver
 *   3. Replace these stubs with real encryption calls
 */

/**
 * Whether SQLCipher database encryption is available in the current build.
 * Always returns false in Expo Go / managed workflow.
 */
export function isEncryptionAvailable(): boolean {
  return false;
}

/**
 * Human-readable status string describing the encryption state.
 */
export function getEncryptionStatus(): string {
  return 'Database encryption requires a development build with SQLCipher';
}
