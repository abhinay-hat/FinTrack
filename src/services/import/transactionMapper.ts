/**
 * Maps parsed rows to transaction records using column mappings.
 */

import type { ColumnMapping } from './columnDetector';

export interface ParsedTransaction {
  date: Date;
  amount: number;
  type: 'expense' | 'income';
  description: string;
  balance?: number;
  rawRow: string[];
}

function parseAmount(val: string): number {
  if (!val || val.trim() === '') return 0;
  // Remove currency symbols, spaces, and Indian comma formatting
  const cleaned = val.replace(/[₹$,\s]/g, '').replace(/\((.+)\)/, '-$1');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

function parseDate(val: string, format: string): Date | null {
  if (!val || val.trim() === '') return null;
  const trimmed = val.trim();

  try {
    // Try format-aware parsing
    if (format.includes('DD') && format.includes('MM') && format.includes('YYYY')) {
      const sep = format.includes('/') ? '/' : format.includes('-') ? '-' : '.';
      const parts = trimmed.split(/[\/\-\.]/);
      if (parts.length === 3) {
        const formatParts = format.split(sep);
        const dayIdx = formatParts.findIndex((f) => f.startsWith('DD'));
        const monthIdx = formatParts.findIndex((f) => f.startsWith('MM'));
        const yearIdx = formatParts.findIndex((f) => f.startsWith('YY'));

        if (dayIdx >= 0 && monthIdx >= 0 && yearIdx >= 0) {
          let year = parseInt(parts[yearIdx], 10);
          if (year < 100) year += 2000;
          const month = parseInt(parts[monthIdx], 10) - 1;
          const day = parseInt(parts[dayIdx], 10);
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }

    // Try DD MMM YYYY (e.g., "15 Jan 2024")
    if (/^\d{1,2}\s+\w{3,}\s+\d{2,4}$/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
    }

    // Fallback: native Date parse
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  } catch {}

  return null;
}

export function mapRowsToTransactions(
  rows: string[][],
  columns: ColumnMapping[],
  dateFormat: string,
  hasSeperateDebitCredit: boolean,
): ParsedTransaction[] {
  const dateCol = columns.find((c) => c.role === 'date');
  const amountCol = columns.find((c) => c.role === 'amount');
  const debitCol = columns.find((c) => c.role === 'debit');
  const creditCol = columns.find((c) => c.role === 'credit');
  const descCol = columns.find((c) => c.role === 'description');
  const balanceCol = columns.find((c) => c.role === 'balance');

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    // Parse date
    const dateVal = dateCol ? row[dateCol.index] ?? '' : '';
    const date = parseDate(dateVal, dateFormat);
    if (!date) continue; // Skip rows without valid dates

    // Parse amount and determine type
    let amount = 0;
    let type: 'expense' | 'income' = 'expense';

    if (hasSeperateDebitCredit) {
      const debitVal = debitCol ? parseAmount(row[debitCol.index] ?? '') : 0;
      const creditVal = creditCol ? parseAmount(row[creditCol.index] ?? '') : 0;

      if (debitVal > 0) {
        amount = debitVal;
        type = 'expense';
      } else if (creditVal > 0) {
        amount = creditVal;
        type = 'income';
      } else {
        continue; // Skip rows with no amount
      }
    } else if (amountCol) {
      const rawVal = row[amountCol.index] ?? '';
      const cleaned = rawVal.replace(/[₹$,\s]/g, '');
      const num = parseFloat(cleaned);
      if (isNaN(num) || num === 0) continue;
      amount = Math.abs(num);
      type = num < 0 ? 'expense' : 'income';
    } else {
      continue; // No amount column available
    }

    // Parse description
    const description = descCol ? (row[descCol.index] ?? '').trim() : '';

    // Parse balance
    const balance = balanceCol ? parseAmount(row[balanceCol.index] ?? '') : undefined;

    transactions.push({
      date,
      amount,
      type,
      description: description || 'Imported transaction',
      balance: balance || undefined,
      rawRow: row,
    });
  }

  return transactions;
}
