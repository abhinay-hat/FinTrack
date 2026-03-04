/**
 * LLM Service — On-device inference interface
 *
 * llama.rn requires a dev client build with native modules.
 * This provides a proper interface with a stub implementation
 * for use in Expo Go. When a dev client is built, swap the
 * stub with a real LlamaRNService.
 */

export interface LLMConfig {
  modelId: string;
  modelPath?: string;
  contextSize: number;
  maxTokens: number;
  temperature: number;
}

export interface LLMResponse {
  text: string;
  tokensUsed: number;
  inferenceTimeMs: number;
}

export type LLMModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LLMService {
  isAvailable(): boolean;
  loadModel(config: LLMConfig): Promise<void>;
  unloadModel(): Promise<void>;
  runInference(prompt: string): Promise<LLMResponse>;
  getModelStatus(): LLMModelStatus;
}

/**
 * Stub implementation for Expo Go / development builds without native LLM.
 * All inference calls throw — callers should check isAvailable() first.
 */
class StubLLMService implements LLMService {
  private status: LLMModelStatus = 'idle';

  isAvailable(): boolean {
    return false;
  }

  async loadModel(_config: LLMConfig): Promise<void> {
    console.warn(
      '[LLMService] loadModel called but LLM is not available in Expo Go. ' +
        'Build a dev client with llama.rn to enable on-device inference.',
    );
    this.status = 'idle';
  }

  async unloadModel(): Promise<void> {
    this.status = 'idle';
  }

  async runInference(_prompt: string): Promise<LLMResponse> {
    throw new Error(
      'LLM not available in Expo Go. Build a dev client with llama.rn native module.',
    );
  }

  getModelStatus(): LLMModelStatus {
    return this.status;
  }
}

// Future: When dev client is built, replace with:
// class LlamaRNService implements LLMService { ... }

let _instance: LLMService | null = null;

export function createLLMService(): LLMService {
  if (!_instance) {
    _instance = new StubLLMService();
  }
  return _instance;
}
