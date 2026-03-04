import * as Device from 'expo-device';
import type { DeviceTier } from '@/stores/useAppStore';

// --- Types ---

export type AIMode = 'rule-based' | 'gemma-1b' | 'qwen3-1.5b';

export interface AIConfig {
  mode: AIMode;
  modelId: string | null;
  maxTokens: number;
  inferenceTimeout: number; // ms
}

export interface AnimationConfig {
  enableMicroInteractions: boolean;
  enableChartAnimations: boolean;
  enableTransitions: boolean;
  reducedMotion: boolean;
}

// --- Device Tier Detection ---

/**
 * Auto-detect device tier based on available RAM.
 * - Tier 1 (≤4GB): Rule-based AI only
 * - Tier 2 (4-6GB): Lightweight LLM (Gemma 1B)
 * - Tier 3 (>6GB): Full LLM (Qwen3 1.5B)
 */
export async function detectDeviceTier(): Promise<DeviceTier> {
  try {
    const totalMemoryBytes = Device.totalMemory;
    if (!totalMemoryBytes) return 1;
    const totalMemoryGB = totalMemoryBytes / (1024 * 1024 * 1024);

    if (totalMemoryGB <= 4) return 1;
    if (totalMemoryGB <= 6) return 2;
    return 3;
  } catch {
    return 1;
  }
}

// --- AI Config per Tier ---

const AI_CONFIGS: Record<DeviceTier, AIConfig> = {
  1: {
    mode: 'rule-based',
    modelId: null,
    maxTokens: 0,
    inferenceTimeout: 1000,
  },
  2: {
    mode: 'gemma-1b',
    modelId: 'gemma-1b-q4',
    maxTokens: 512,
    inferenceTimeout: 10000,
  },
  3: {
    mode: 'qwen3-1.5b',
    modelId: 'qwen3-1.5b-q4',
    maxTokens: 1024,
    inferenceTimeout: 15000,
  },
};

export function getRecommendedAIConfig(tier: DeviceTier): AIConfig {
  return AI_CONFIGS[tier];
}

// --- Animation Config per Tier ---

const ANIMATION_CONFIGS: Record<DeviceTier, AnimationConfig> = {
  1: {
    enableMicroInteractions: false,
    enableChartAnimations: false,
    enableTransitions: true,
    reducedMotion: true,
  },
  2: {
    enableMicroInteractions: true,
    enableChartAnimations: true,
    enableTransitions: true,
    reducedMotion: false,
  },
  3: {
    enableMicroInteractions: true,
    enableChartAnimations: true,
    enableTransitions: true,
    reducedMotion: false,
  },
};

export function getAnimationConfig(tier: DeviceTier): AnimationConfig {
  return ANIMATION_CONFIGS[tier];
}

// --- Runtime Performance Monitoring ---

const DOWNGRADE_THRESHOLD_MS = 5000;
const INFERENCE_HISTORY_LIMIT = 10;

export class PerformanceMonitor {
  private inferenceTimes: number[] = [];

  recordInferenceTime(ms: number): void {
    this.inferenceTimes.push(ms);
    if (this.inferenceTimes.length > INFERENCE_HISTORY_LIMIT) {
      this.inferenceTimes.shift();
    }
  }

  getLastInferenceTime(): number | null {
    return this.inferenceTimes.length > 0
      ? this.inferenceTimes[this.inferenceTimes.length - 1]
      : null;
  }

  getAverageInferenceTime(): number | null {
    if (this.inferenceTimes.length === 0) return null;
    const sum = this.inferenceTimes.reduce((a, b) => a + b, 0);
    return sum / this.inferenceTimes.length;
  }

  shouldDowngrade(): boolean {
    const avg = this.getAverageInferenceTime();
    return avg !== null && avg > DOWNGRADE_THRESHOLD_MS;
  }

  getDowngradedTier(currentTier: DeviceTier): DeviceTier {
    if (!this.shouldDowngrade()) return currentTier;
    return currentTier > 1 ? ((currentTier - 1) as DeviceTier) : 1;
  }

  reset(): void {
    this.inferenceTimes = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();
