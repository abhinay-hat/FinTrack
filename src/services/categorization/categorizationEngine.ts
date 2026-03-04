/**
 * Rule-based Transaction Categorization Engine
 *
 * Multi-step matching algorithm:
 * 1. Normalize input (lowercase, remove special chars)
 * 2. Exact match against merchantMap (confidence: 0.95)
 * 3. Keyword match: split into words, check each (confidence: 0.8)
 * 4. Pattern match: regex for UPI/, NEFT/, ATM/, POS/ etc. (confidence: 0.7)
 * 5. Amount-based heuristics (confidence: 0.6)
 * 6. Default to "Others" (confidence: 0.3)
 */

import {
  MERCHANT_CATEGORY_MAP,
  CATEGORY_KEYWORDS,
  TRANSACTION_PATTERNS,
  type CategoryName,
} from './merchantMap';

export interface CategorizationResult {
  categoryName: string;
  confidence: number;
  matchType: 'exact' | 'keyword' | 'pattern' | 'default';
  matchedTerm?: string;
}

/**
 * Normalize a transaction description for matching.
 * Lowercases, strips special characters, collapses whitespace.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove all non-alphanumeric characters for compact matching.
 */
function compactNormalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Step 1: Exact match against the merchant category map.
 * Tries the full compact string and progressively smaller substrings.
 */
function exactMatch(normalized: string): CategorizationResult | null {
  const compact = compactNormalize(normalized);

  // Direct lookup
  if (MERCHANT_CATEGORY_MAP[compact]) {
    return {
      categoryName: MERCHANT_CATEGORY_MAP[compact],
      confidence: 0.95,
      matchType: 'exact',
      matchedTerm: compact,
    };
  }

  // Check if any merchant key is found within the compact string
  for (const [key, category] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    if (key.length >= 3 && compact.includes(key)) {
      return {
        categoryName: category,
        confidence: 0.95,
        matchType: 'exact',
        matchedTerm: key,
      };
    }
  }

  return null;
}

/**
 * Step 2: Keyword match against category keyword lists.
 * Split description into words, check each word against all category keyword lists.
 */
function keywordMatch(normalized: string): CategorizationResult | null {
  const words = normalized.split(/\s+/);

  // Score each category by how many keyword matches it has
  let bestCategory: CategoryName | null = null;
  let bestScore = 0;
  let bestTerm = '';

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<
    [CategoryName, string[]]
  >) {
    if (keywords.length === 0) continue;

    let score = 0;
    let matched = '';

    for (const word of words) {
      if (word.length < 2) continue;
      for (const keyword of keywords) {
        // Check if the word matches the keyword or the keyword is in the word
        if (word === keyword || (keyword.length >= 4 && word.includes(keyword))) {
          score++;
          if (!matched) matched = keyword;
        }
      }
    }

    // Also check multi-word keywords against the full normalized string
    for (const keyword of keywords) {
      if (keyword.includes(' ') && normalized.includes(keyword)) {
        score += 2; // Multi-word match is stronger
        if (!matched) matched = keyword;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
      bestTerm = matched;
    }
  }

  if (bestCategory && bestScore > 0) {
    return {
      categoryName: bestCategory,
      confidence: 0.8,
      matchType: 'keyword',
      matchedTerm: bestTerm,
    };
  }

  return null;
}

/**
 * Step 3: Pattern match against common transaction format regexes.
 */
function patternMatch(raw: string): CategorizationResult | null {
  for (const { pattern, category, label } of TRANSACTION_PATTERNS) {
    if (pattern.test(raw)) {
      // For generic patterns (UPI, NEFT, etc.), try to find a more specific
      // category from the remaining description
      if (category === 'Others') {
        // Strip the prefix and try exact/keyword match on the rest
        const stripped = raw.replace(pattern, '').trim();
        if (stripped.length > 0) {
          const normalized = normalize(stripped);
          const exact = exactMatch(normalized);
          if (exact) {
            return {
              ...exact,
              confidence: 0.85,
              matchType: 'pattern',
            };
          }
          const kw = keywordMatch(normalized);
          if (kw) {
            return {
              ...kw,
              confidence: 0.75,
              matchType: 'pattern',
            };
          }
        }
      }

      return {
        categoryName: category,
        confidence: 0.7,
        matchType: 'pattern',
        matchedTerm: label,
      };
    }
  }

  return null;
}

/**
 * Step 4: Amount-based heuristics for when description matching fails.
 * - Large round amounts (e.g., 5000, 10000, 25000) for expenses -> Rent & EMI
 * - Salary-range credits (>= 10000) -> Income
 */
function amountHeuristic(
  amount?: number,
  type?: 'income' | 'expense',
): CategorizationResult | null {
  if (amount === undefined || amount === null) return null;

  const absAmount = Math.abs(amount);

  // Income detection
  if (type === 'income') {
    // Salary-range: typically >= 10,000
    if (absAmount >= 10000) {
      return {
        categoryName: 'Income',
        confidence: 0.6,
        matchType: 'pattern',
        matchedTerm: 'income-amount-heuristic',
      };
    }
    // Smaller income amounts could be refunds/cashback
    return {
      categoryName: 'Income',
      confidence: 0.5,
      matchType: 'pattern',
      matchedTerm: 'income-type-heuristic',
    };
  }

  // Expense heuristics
  if (type === 'expense') {
    // Large round amounts -> likely Rent or EMI
    if (absAmount >= 5000 && absAmount % 500 === 0) {
      return {
        categoryName: 'Rent & EMI',
        confidence: 0.6,
        matchType: 'pattern',
        matchedTerm: 'large-round-amount-heuristic',
      };
    }
  }

  return null;
}

/**
 * Categorize a single transaction description.
 *
 * @param description - Raw transaction description
 * @param amount - Optional transaction amount (positive number)
 * @param type - Optional transaction type ('income' or 'expense')
 * @returns Categorization result with category name, confidence, and match info
 */
export function categorizeTransaction(
  description: string,
  amount?: number,
  type?: 'income' | 'expense',
): CategorizationResult {
  if (!description || typeof description !== 'string') {
    return {
      categoryName: 'Others',
      confidence: 0.3,
      matchType: 'default',
    };
  }

  const normalized = normalize(description);

  // Step 1: Exact match (confidence: 0.95)
  const exact = exactMatch(normalized);
  if (exact) return exact;

  // Step 2: Keyword match (confidence: 0.8)
  const keyword = keywordMatch(normalized);
  if (keyword) return keyword;

  // Step 3: Pattern match (confidence: 0.7)
  const pattern = patternMatch(description);
  if (pattern) return pattern;

  // Step 4: Amount-based heuristic (confidence: 0.6)
  const heuristic = amountHeuristic(amount, type);
  if (heuristic) return heuristic;

  // Step 5: Default (confidence: 0.3)
  return {
    categoryName: 'Others',
    confidence: 0.3,
    matchType: 'default',
  };
}

/**
 * Categorize multiple transactions in batch.
 *
 * @param transactions - Array of transaction objects with description, amount, and type
 * @returns Array of categorization results in the same order
 */
export function categorizeTransactions(
  transactions: Array<{
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }>,
): CategorizationResult[] {
  return transactions.map((txn) =>
    categorizeTransaction(txn.description, txn.amount, txn.type),
  );
}
