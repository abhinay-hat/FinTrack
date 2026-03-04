import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeviceTier } from '@/stores/useAppStore';
import {
  type AIConfig,
  type AnimationConfig,
  getRecommendedAIConfig,
  getAnimationConfig,
  performanceMonitor,
} from '@/utils/deviceTier';

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

  // AI & animation config from device tier
  aiConfig: AIConfig;
  animationConfig: AnimationConfig;

  // Performance tracking
  lastInferenceTime: number | null;
  avgInferenceTime: number | null;

  // Actions
  setModelStatus: (status: ModelStatus) => void;
  setSelectedModel: (modelId: string) => void;
  setFallbackMode: (enabled: boolean) => void;
  setDownloadProgress: (progress: number) => void;
  setAIConfig: (config: AIConfig) => void;
  setAnimationConfig: (config: AnimationConfig) => void;
  initFromDeviceTier: (tier: DeviceTier) => void;
  recordInference: (durationMs: number) => void;
}

const defaultTier: DeviceTier = 1;

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      modelStatus: 'not-downloaded',
      selectedModelId: 'rule-based',
      fallbackMode: true,
      downloadProgress: 0,

      aiConfig: getRecommendedAIConfig(defaultTier),
      animationConfig: getAnimationConfig(defaultTier),

      lastInferenceTime: null,
      avgInferenceTime: null,

      setModelStatus: (modelStatus) => set({ modelStatus }),
      setSelectedModel: (selectedModelId) => set({ selectedModelId }),
      setFallbackMode: (fallbackMode) => set({ fallbackMode }),
      setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
      setAIConfig: (aiConfig) => set({ aiConfig }),
      setAnimationConfig: (animationConfig) => set({ animationConfig }),

      initFromDeviceTier: (tier: DeviceTier) => {
        const aiConfig = getRecommendedAIConfig(tier);
        const animationConfig = getAnimationConfig(tier);
        set({
          aiConfig,
          animationConfig,
          selectedModelId: aiConfig.modelId ?? 'rule-based',
        });
      },

      recordInference: (durationMs: number) => {
        performanceMonitor.recordInferenceTime(durationMs);
        const avg = performanceMonitor.getAverageInferenceTime();
        set({
          lastInferenceTime: durationMs,
          avgInferenceTime: avg,
        });

        // Auto-downgrade if average inference is too slow
        if (performanceMonitor.shouldDowngrade()) {
          const currentConfig = get().aiConfig;
          const currentTierFromMode: DeviceTier =
            currentConfig.mode === 'qwen3-1.5b' ? 3 :
            currentConfig.mode === 'gemma-1b' ? 2 : 1;
          const downgradedTier = performanceMonitor.getDowngradedTier(currentTierFromMode);

          if (downgradedTier < currentTierFromMode) {
            const newConfig = getRecommendedAIConfig(downgradedTier);
            const newAnimConfig = getAnimationConfig(downgradedTier);
            set({
              aiConfig: newConfig,
              animationConfig: newAnimConfig,
              selectedModelId: newConfig.modelId ?? 'rule-based',
            });
            performanceMonitor.reset();
          }
        }
      },
    }),
    {
      name: 'fintrack-ai-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
        fallbackMode: state.fallbackMode,
        aiConfig: state.aiConfig,
        animationConfig: state.animationConfig,
      }),
    },
  ),
);
