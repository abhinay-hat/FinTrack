import DeviceInfo from 'react-native-device-info';
import type { DeviceTier } from '@/stores/useAppStore';

/**
 * Auto-detect device tier based on available RAM.
 * - Tier 1 (≤4GB): Rule-based AI only
 * - Tier 2 (4-6GB): Lightweight LLM (Gemma 1B)
 * - Tier 3 (>6GB): Full LLM (Qwen3 1.5B)
 */
export async function detectDeviceTier(): Promise<DeviceTier> {
  try {
    const totalMemoryBytes = await DeviceInfo.getTotalMemory();
    const totalMemoryGB = totalMemoryBytes / (1024 * 1024 * 1024);

    if (totalMemoryGB <= 4) return 1;
    if (totalMemoryGB <= 6) return 2;
    return 3;
  } catch {
    // Default to Tier 1 if detection fails
    return 1;
  }
}
