import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hashPIN as hashPINUtil,
  storePinCredential,
  loadPinCredential,
  clearPinCredential,
  verifyPinCredential,
  verifyLegacySha256Pin,
} from '@/services/authService';

interface SecurityState {
  isAppLockEnabled: boolean;
  isBiometricEnabled: boolean;
  isPINEnabled: boolean;
  /** @deprecated Legacy unsalted SHA-256; cleared after SecureStore migration. */
  pinHash: string | null;
  autoLockTimeout: number; // ms: 0, 30000, 60000, 300000
  lastActiveTime: number | null;
  isLocked: boolean;

  enableAppLock: () => void;
  disableAppLock: () => Promise<void>;
  setBiometric: (enabled: boolean) => void;
  setPIN: (pin: string) => Promise<void>;
  clearPIN: () => Promise<void>;
  setAutoLockTimeout: (ms: number) => void;
  lock: () => void;
  unlock: () => void;
  updateLastActive: () => void;
  verifyPIN: (pin: string) => Promise<boolean>;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      isAppLockEnabled: false,
      isBiometricEnabled: false,
      isPINEnabled: false,
      pinHash: null,
      autoLockTimeout: 0,
      lastActiveTime: null,
      isLocked: false,

      enableAppLock: () => set({ isAppLockEnabled: true, isLocked: true }),

      disableAppLock: async () => {
        await clearPinCredential();
        set({
          isAppLockEnabled: false,
          isBiometricEnabled: false,
          isPINEnabled: false,
          pinHash: null,
          isLocked: false,
        });
      },

      setBiometric: (enabled) => set({ isBiometricEnabled: enabled }),

      setPIN: async (pin) => {
        const credential = await hashPINUtil(pin);
        await storePinCredential(credential);
        set({ isPINEnabled: true, pinHash: null });
      },

      clearPIN: async () => {
        await clearPinCredential();
        set({ isPINEnabled: false, pinHash: null });
      },

      setAutoLockTimeout: (ms) => set({ autoLockTimeout: ms }),

      lock: () => set({ isLocked: true }),

      unlock: () => set({ isLocked: false, lastActiveTime: Date.now() }),

      updateLastActive: () => set({ lastActiveTime: Date.now() }),

      verifyPIN: async (pin) => {
        const credential = await loadPinCredential();
        if (credential) {
          return verifyPinCredential(pin, credential);
        }

        // Migrate legacy AsyncStorage unsalted SHA-256 on successful unlock.
        const { pinHash } = get();
        if (!pinHash) return false;
        const ok = await verifyLegacySha256Pin(pin, pinHash);
        if (!ok) return false;

        const next = await hashPINUtil(pin);
        await storePinCredential(next);
        set({ pinHash: null, isPINEnabled: true });
        return true;
      },
    }),
    {
      name: 'fintrack-security-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAppLockEnabled: state.isAppLockEnabled,
        isBiometricEnabled: state.isBiometricEnabled,
        isPINEnabled: state.isPINEnabled,
        // Keep legacy pinHash only until migration; new PINs store null.
        pinHash: state.pinHash,
        autoLockTimeout: state.autoLockTimeout,
        lastActiveTime: state.lastActiveTime,
      }),
    },
  ),
);
