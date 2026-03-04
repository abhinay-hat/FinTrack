import * as Device from 'expo-device';
import type { DeviceTier } from '@/stores/useAppStore';

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
