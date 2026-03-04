import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ModelStatus = 'not-downloaded' | 'downloading' | 'ready' | 'running' | 'error';

export interface AIModel {
  id: string;
  name: string;
  size: string;
  minTier: 1 | 2 | 3;
}

export const AVAILABLE_MODELS: AIModel[] = [
  { id: 'rule-based', name: 'Rule-Based Engine', size: '0 MB', minTier: 1 },
  { id: 'gemma-1b', name: 'Gemma 1B', size: '~600 MB', minTier: 2 },
  { id: 'qwen3-1.5b', name: 'Qwen3 1.5B', size: '~900 MB', minTier: 3 },
];

interface AIState {
  modelStatus: ModelStatus;
  selectedModelId: string;
  fallbackMode: boolean;
  downloadProgress: number;

  setModelStatus: (status: ModelStatus) => void;
  setSelectedModel: (modelId: string) => void;
  setFallbackMode: (enabled: boolean) => void;
  setDownloadProgress: (progress: number) => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      modelStatus: 'not-downloaded',
      selectedModelId: 'rule-based',
      fallbackMode: true,
      downloadProgress: 0,

      setModelStatus: (modelStatus) => set({ modelStatus }),
      setSelectedModel: (selectedModelId) => set({ selectedModelId }),
      setFallbackMode: (fallbackMode) => set({ fallbackMode }),
      setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
    }),
    {
      name: 'fintrack-ai-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
        fallbackMode: state.fallbackMode,
      }),
    },
  ),
);
