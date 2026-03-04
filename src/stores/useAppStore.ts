import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type NumberFormat = 'indian' | 'international';
export type DeviceTier = 1 | 2 | 3;

interface AppState {
  // Settings
  theme: ThemeMode;
  language: string;
  currency: string;
  numberFormat: NumberFormat;

  // Device
  deviceTier: DeviceTier;

  // Actions
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: string) => void;
  setCurrency: (currency: string) => void;
  setNumberFormat: (format: NumberFormat) => void;
  setDeviceTier: (tier: DeviceTier) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      currency: 'INR',
      numberFormat: 'indian',
      deviceTier: 1,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setCurrency: (currency) => set({ currency }),
      setNumberFormat: (numberFormat) => set({ numberFormat }),
      setDeviceTier: (deviceTier) => set({ deviceTier }),
    }),
    {
      name: 'fintrack-app-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
