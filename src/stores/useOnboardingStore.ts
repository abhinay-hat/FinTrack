import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  hasImportedFirstStatement: boolean;

  completeOnboarding: () => void;
  markFirstStatementImported: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      hasImportedFirstStatement: false,

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      markFirstStatementImported: () => set({ hasImportedFirstStatement: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false, hasImportedFirstStatement: false }),
    }),
    {
      name: 'fintrack-onboarding-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
