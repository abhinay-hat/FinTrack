/**
 * Confidence scoring system for OCR/parsed transactions.
 * Flags low-confidence amounts for user review.
 */

import type { ParsedStatementRow } from './statementParser';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ScoredTransaction {
  date: Date;
  amount: number;
  type: 'expense' | 'income';
  description: string;
  balance: number | null;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  flags: string[];
  rawText: string;
}

const CONFIDENCE_THRESHOLDS = {
  high: 0.8,
  medium: 0.5,
};

function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_THRESHOLDS.high) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/**
 * Convert parsed statement rows to scored transactions with confidence indicators.
 */
export function scoreTransactions(rows: ParsedStatementRow[]): ScoredTransaction[] {
  return rows.map((row) => {
    const flags: string[] = [];
    let confidence = row.confidence;

    // Flag: no clear debit/credit distinction
    if (row.debit > 0 && row.credit > 0) {
      flags.push('Both debit and credit detected');
      confidence *= 0.7;
    }

    // Flag: very large amounts
    if (row.debit > 500000 || row.credit > 500000) {
      flags.push('Large amount — please verify');
    }

    // Flag: round numbers might indicate parsing error
    if ((row.debit > 0 && row.debit % 10000 === 0 && row.debit > 10000) ||
        (row.credit > 0 && row.credit % 10000 === 0 && row.credit > 10000)) {
      flags.push('Round amount — verify decimal placement');
      confidence *= 0.9;
    }

    // Flag: very short description
    if (row.description.length < 5) {
      flags.push('Short description');
      confidence *= 0.9;
    }

    // Determine type
    const isIncome = row.credit > row.debit;
    const type: 'expense' | 'income' = isIncome ? 'income' : 'expense';
    const amount = isIncome ? row.credit : row.debit;

    if (amount === 0) {
      flags.push('Zero amount');
      confidence = 0.1;
    }

    return {
      date: row.date,
      amount,
      type,
      description: row.description,
      balance: row.balance,
      confidence: Math.max(0, Math.min(1, confidence)),
      confidenceLevel: getConfidenceLevel(confidence),
      flags,
      rawText: row.rawText,
    };
  }).filter((t) => t.amount > 0);
}

/**
 * Get summary statistics for a set of scored transactions.
 */
export function getConfidenceSummary(transactions: ScoredTransaction[]) {
  const total = transactions.length;
  const high = transactions.filter((t) => t.confidenceLevel === 'high').length;
  const medium = transactions.filter((t) => t.confidenceLevel === 'medium').length;
  const low = transactions.filter((t) => t.confidenceLevel === 'low').length;
  const avgConfidence = total > 0
    ? transactions.reduce((sum, t) => sum + t.confidence, 0) / total
    : 0;

  return {
    total,
    high,
    medium,
    low,
    avgConfidence,
    percentHigh: total > 0 ? (high / total) * 100 : 0,
    percentNeedingReview: total > 0 ? ((medium + low) / total) * 100 : 0,
  };
}
