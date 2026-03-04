/**
 * Smart column detection engine.
 * Analyzes headers and sample data rows to auto-detect column roles.
 */

import { findBankTemplate } from './bankTemplates';

export type ColumnRole = 'date' | 'amount' | 'debit' | 'credit' | 'description' | 'balance' | 'ignore';

export interface ColumnMapping {
  index: number;
  header: string;
  role: ColumnRole;
  confidence: number; // 0-1
}

export interface DetectionResult {
  columns: ColumnMapping[];
  detectedBank: string | null;
  dateFormat: string;
  hasSeperateDebitCredit: boolean;
}

// Date patterns
const DATE_PATTERNS = [
  /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/,
  /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/,
  /^\d{1,2}\s+\w{3}\s+\d{2,4}$/,
  /^\d{1,2}\s+\w+\s+\d{4}$/,
];

// Amount patterns (Indian format: 1,23,456.78 or standard: 123,456.78)
const AMOUNT_PATTERNS = [
  /^[\s]*[₹$]?\s*[\d,]+\.?\d*[\s]*$/,
  /^[\s]*[\-]?\s*[\d,]+\.?\d*[\s]*$/,
  /^[\s]*\([\d,]+\.?\d*\)[\s]*$/, // negative in parens
];

// Debit/Credit indicator keywords
const DEBIT_KEYWORDS = ['debit', 'dr', 'withdrawal', 'dr.', 'debit amount', 'withdrawal amt'];
const CREDIT_KEYWORDS = ['credit', 'cr', 'deposit', 'cr.', 'credit amount', 'deposit amt'];
const DATE_KEYWORDS = ['date', 'txn date', 'transaction date', 'value date', 'value dt', 'tran date'];
const DESC_KEYWORDS = ['description', 'narration', 'particulars', 'remarks', 'transaction remarks', 'transaction particulars'];
const BALANCE_KEYWORDS = ['balance', 'closing balance', 'running balance', 'init. br'];
const AMOUNT_KEYWORDS = ['amount', 'transaction amount', 'txn amount'];

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function matchesKeywords(header: string, keywords: string[]): boolean {
  const norm = normalizeHeader(header);
  return keywords.some((k) => norm === k || norm.includes(k));
}

function isDateValue(val: string): boolean {
  if (!val || val.trim().length === 0) return false;
  return DATE_PATTERNS.some((p) => p.test(val.trim()));
}

function isAmountValue(val: string): boolean {
  if (!val || val.trim().length === 0) return false;
  const cleaned = val.trim().replace(/[₹$\s]/g, '');
  if (cleaned === '' || cleaned === '-') return false;
  return AMOUNT_PATTERNS.some((p) => p.test(val.trim()));
}

function detectDateFormat(sampleDates: string[]): string {
  for (const d of sampleDates) {
    const trimmed = d.trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) return 'DD/MM/YYYY';
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(trimmed)) return 'DD/MM/YY';
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) return 'DD-MM-YYYY';
    if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(trimmed)) return 'DD-MM-YY';
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) return 'YYYY-MM-DD';
    if (/^\d{1,2}\s+\w{3}\s+\d{4}$/.test(trimmed)) return 'DD MMM YYYY';
    if (/^\d{1,2}\s+\w{3}\s+\d{2}$/.test(trimmed)) return 'DD MMM YY';
  }
  return 'DD/MM/YYYY';
}

/**
 * Detect column roles from headers and sample data rows.
 */
export function detectColumns(
  headers: string[],
  sampleRows: string[][],
  bankHint?: string,
): DetectionResult {
  const columns: ColumnMapping[] = headers.map((h, i) => ({
    index: i,
    header: h,
    role: 'ignore' as ColumnRole,
    confidence: 0,
  }));

  // Try bank template first
  let detectedBank: string | null = null;
  if (bankHint) {
    const template = findBankTemplate(bankHint);
    if (template) {
      detectedBank = template.bankName;
      // Match by template column names
      for (const col of columns) {
        const norm = normalizeHeader(col.header);
        if (template.dateColumns.some((d) => normalizeHeader(d) === norm)) {
          col.role = 'date';
          col.confidence = 0.95;
        } else if (template.debitColumns.some((d) => normalizeHeader(d) === norm)) {
          col.role = 'debit';
          col.confidence = 0.95;
        } else if (template.creditColumns.some((d) => normalizeHeader(d) === norm)) {
          col.role = 'credit';
          col.confidence = 0.95;
        } else if (template.amountColumns.some((d) => normalizeHeader(d) === norm)) {
          col.role = 'amount';
          col.confidence = 0.95;
        } else if (template.descriptionColumns.some((d) => normalizeHeader(d) === norm)) {
          col.role = 'description';
          col.confidence = 0.95;
        } else if (template.balanceColumns.some((d) => normalizeHeader(d) === norm)) {
          col.role = 'balance';
          col.confidence = 0.95;
        }
      }
    }
  }

  // Fall back to generic detection for unmatched columns
  for (const col of columns) {
    if (col.confidence > 0.5) continue; // already matched by template

    // Header-based detection
    if (matchesKeywords(col.header, DATE_KEYWORDS)) {
      col.role = 'date';
      col.confidence = 0.8;
    } else if (matchesKeywords(col.header, DEBIT_KEYWORDS)) {
      col.role = 'debit';
      col.confidence = 0.8;
    } else if (matchesKeywords(col.header, CREDIT_KEYWORDS)) {
      col.role = 'credit';
      col.confidence = 0.8;
    } else if (matchesKeywords(col.header, AMOUNT_KEYWORDS)) {
      col.role = 'amount';
      col.confidence = 0.8;
    } else if (matchesKeywords(col.header, DESC_KEYWORDS)) {
      col.role = 'description';
      col.confidence = 0.8;
    } else if (matchesKeywords(col.header, BALANCE_KEYWORDS)) {
      col.role = 'balance';
      col.confidence = 0.8;
    }
  }

  // Data-based detection for remaining unknowns
  for (const col of columns) {
    if (col.confidence > 0.5) continue;

    const values = sampleRows.map((row) => row[col.index] ?? '').filter((v) => v.trim() !== '');
    if (values.length === 0) continue;

    const dateCount = values.filter(isDateValue).length;
    const amountCount = values.filter(isAmountValue).length;
    const avgLength = values.reduce((sum, v) => sum + v.length, 0) / values.length;

    if (dateCount / values.length > 0.6) {
      col.role = 'date';
      col.confidence = 0.6;
    } else if (amountCount / values.length > 0.6) {
      // Determine if it's debit, credit, or generic amount based on position
      col.role = 'amount';
      col.confidence = 0.5;
    } else if (avgLength > 15) {
      // Long text → likely description
      col.role = 'description';
      col.confidence = 0.4;
    }
  }

  // Ensure we have at least one date column — pick first if none detected
  if (!columns.some((c) => c.role === 'date')) {
    const firstDateLike = columns.find((c) => {
      const values = sampleRows.map((r) => r[c.index] ?? '');
      return values.some(isDateValue);
    });
    if (firstDateLike) {
      firstDateLike.role = 'date';
      firstDateLike.confidence = 0.3;
    }
  }

  // Ensure we have a description — pick longest avg text col
  if (!columns.some((c) => c.role === 'description')) {
    let bestIdx = -1;
    let bestAvg = 0;
    for (const col of columns) {
      if (col.role !== 'ignore') continue;
      const values = sampleRows.map((r) => r[col.index] ?? '');
      const avg = values.reduce((s, v) => s + v.length, 0) / Math.max(values.length, 1);
      if (avg > bestAvg) {
        bestAvg = avg;
        bestIdx = col.index;
      }
    }
    if (bestIdx >= 0 && bestAvg > 5) {
      columns[bestIdx].role = 'description';
      columns[bestIdx].confidence = 0.3;
    }
  }

  // Detect date format from sample date values
  const dateCol = columns.find((c) => c.role === 'date');
  const sampleDates = dateCol
    ? sampleRows.map((r) => r[dateCol.index] ?? '').filter((v) => v.trim() !== '')
    : [];
  const dateFormat = sampleDates.length > 0 ? detectDateFormat(sampleDates) : 'DD/MM/YYYY';

  const hasSeperateDebitCredit = columns.some((c) => c.role === 'debit') && columns.some((c) => c.role === 'credit');

  return { columns, detectedBank, dateFormat, hasSeperateDebitCredit };
}
