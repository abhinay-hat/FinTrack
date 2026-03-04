/**
 * Smart Categorization Service
 *
 * Orchestrates categorization by trying the rule-based engine first,
 * then falling back to on-device LLM if available and confidence is low.
 */

import { categorizeTransaction } from '@/services/categorization';
import { createLLMService } from './llmService';
import { getCategorizePrompt } from './promptTemplates';

export interface SmartCategorizationResult {
  categoryName: string;
  confidence: number;
  source: 'rule-based' | 'llm' | 'user';
  alternativeSuggestions?: string[];
}

const VALID_CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health',
  'Education',
  'Income',
  'Investments',
  'Rent & EMI',
  'Groceries',
  'Others',
];

const RULE_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Parse LLM category output, validating against known categories.
 */
function parseLLMCategory(line: string): string | null {
  const trimmed = line.trim();
  const match = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? null;
}

/**
 * Categorize a single transaction using the rule-based engine,
 * with optional LLM fallback for low-confidence results.
 */
export async function smartCategorize(
  description: string,
  amount: number,
  type: 'income' | 'expense',
): Promise<SmartCategorizationResult> {
  // Step 1: Rule-based engine
  const ruleResult = categorizeTransaction(description, amount, type);

  if (ruleResult.confidence >= RULE_CONFIDENCE_THRESHOLD) {
    return {
      categoryName: ruleResult.categoryName,
      confidence: ruleResult.confidence,
      source: 'rule-based',
    };
  }

  // Step 2: Try LLM if available
  const llm = createLLMService();
  if (llm.isAvailable() && llm.getModelStatus() === 'ready') {
    try {
      const prompt = getCategorizePrompt([{ description, amount }]);
      const response = await llm.runInference(prompt);
      const llmCategory = parseLLMCategory(response.text);

      if (llmCategory) {
        return {
          categoryName: llmCategory,
          confidence: 0.85,
          source: 'llm',
          alternativeSuggestions: ruleResult.categoryName !== 'Others'
            ? [ruleResult.categoryName]
            : undefined,
        };
      }
    } catch {
      // LLM failed — fall through to rule-based result
    }
  }

  // Step 3: Return rule-based result as best available
  return {
    categoryName: ruleResult.categoryName,
    confidence: ruleResult.confidence,
    source: 'rule-based',
  };
}

/**
 * Categorize multiple transactions in batch.
 * Uses rule-based engine for all, then tries LLM for low-confidence ones.
 */
export async function batchCategorize(
  transactions: Array<{ description: string; amount: number; type: 'income' | 'expense' }>,
): Promise<SmartCategorizationResult[]> {
  // Step 1: Run rule-based engine on all transactions
  const ruleResults = transactions.map((txn) =>
    categorizeTransaction(txn.description, txn.amount, txn.type),
  );

  const results: SmartCategorizationResult[] = ruleResults.map((r) => ({
    categoryName: r.categoryName,
    confidence: r.confidence,
    source: 'rule-based' as const,
  }));

  // Step 2: Find low-confidence results for LLM fallback
  const llm = createLLMService();
  if (!llm.isAvailable() || llm.getModelStatus() !== 'ready') {
    return results;
  }

  const lowConfidenceIndices = results
    .map((r, i) => (r.confidence < RULE_CONFIDENCE_THRESHOLD ? i : -1))
    .filter((i) => i >= 0);

  if (lowConfidenceIndices.length === 0) {
    return results;
  }

  // Batch LLM inference for low-confidence transactions
  const lowConfTxns = lowConfidenceIndices.map((i) => ({
    description: transactions[i].description,
    amount: transactions[i].amount,
  }));

  try {
    const prompt = getCategorizePrompt(lowConfTxns);
    const response = await llm.runInference(prompt);
    const lines = response.text.split('\n').filter((l) => l.trim().length > 0);

    for (let j = 0; j < Math.min(lines.length, lowConfidenceIndices.length); j++) {
      const llmCategory = parseLLMCategory(lines[j]);
      if (llmCategory) {
        const idx = lowConfidenceIndices[j];
        const ruleCategory = results[idx].categoryName;
        results[idx] = {
          categoryName: llmCategory,
          confidence: 0.85,
          source: 'llm',
          alternativeSuggestions: ruleCategory !== 'Others' ? [ruleCategory] : undefined,
        };
      }
    }
  } catch {
    // LLM batch failed — keep rule-based results
  }

  return results;
}
