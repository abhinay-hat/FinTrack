import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashPIN as hashPINUtil, verifyPIN as verifyPINUtil } from '@/services/authService';

interface SecurityState {
  isAppLockEnabled: boolean;
  isBiometricEnabled: boolean;
  isPINEnabled: boolean;
  pinHash: string | null;
  autoLockTimeout: number; // ms: 0, 30000, 60000, 300000
  lastActiveTime: number | null;
  isLocked: boolean;

  enableAppLock: () => void;
  disableAppLock: () => void;
  setBiometric: (enabled: boolean) => void;
  setPIN: (pin: string) => Promise<void>;
  clearPIN: () => void;
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

      enableAppLock: () => set({ isAppLockEnabled: true }),

      disableAppLock: () =>
        set({
          isAppLockEnabled: false,
          isBiometricEnabled: false,
          isPINEnabled: false,
          pinHash: null,
          isLocked: false,
        }),

      setBiometric: (enabled) => set({ isBiometricEnabled: enabled }),

      setPIN: async (pin) => {
        const hash = await hashPINUtil(pin);
        set({ isPINEnabled: true, pinHash: hash });
      },

      clearPIN: () => set({ isPINEnabled: false, pinHash: null }),

      setAutoLockTimeout: (ms) => set({ autoLockTimeout: ms }),

      lock: () => set({ isLocked: true }),

      unlock: () => set({ isLocked: false, lastActiveTime: Date.now() }),

      updateLastActive: () => set({ lastActiveTime: Date.now() }),

      verifyPIN: async (pin) => {
        const { pinHash } = get();
        if (!pinHash) return false;
        return verifyPINUtil(pin, pinHash);
      },
    }),
    {
      name: 'fintrack-security-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAppLockEnabled: state.isAppLockEnabled,
        isBiometricEnabled: state.isBiometricEnabled,
        isPINEnabled: state.isPINEnabled,
        pinHash: state.pinHash,
        autoLockTimeout: state.autoLockTimeout,
        lastActiveTime: state.lastActiveTime,
      }),
    },
  ),
);
