import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BackupState {
  lastBackupDate: string | null;
  autoBackupEnabled: boolean;
  setLastBackupDate: (date: string) => void;
  setAutoBackup: (enabled: boolean) => void;
}

export const useBackupStore = create<BackupState>()(
  persist(
    (set) => ({
      lastBackupDate: null,
      autoBackupEnabled: false,
      setLastBackupDate: (date) => set({ lastBackupDate: date }),
      setAutoBackup: (enabled) => set({ autoBackupEnabled: enabled }),
    }),
    {
      name: 'fintrack-backup-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
