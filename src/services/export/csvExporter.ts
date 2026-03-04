/**
 * CSV export service for FinTrack transactions.
 *
 * - Indian number formatting: 1,23,456.78
 * - Date format: DD/MM/YYYY
 * - UTF-8 BOM for Excel compatibility
 * - Uses expo-file-system to write, expo-sharing to share
 */
import {
  documentDirectory,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/setup';
import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import Account from '@/models/Account';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportOptions {
  dateRange?: { start: Date; end: Date };
  accountId?: string;
  includeCategories?: boolean;
  format: 'csv' | 'pdf';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a number using Indian grouping: 1,23,456.78 */
export function formatIndianCurrency(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const [intPart, decPart] = abs.toFixed(2).split('.');

  // Indian grouping: last 3 digits, then groups of 2
  let formatted: string;
  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const groups: string[] = [];
    for (let i = remaining.length; i > 0; i -= 2) {
      groups.unshift(remaining.slice(Math.max(0, i - 2), i));
    }
    formatted = groups.join(',') + ',' + last3;
  }

  return (isNegative ? '-' : '') + '\u20B9' + formatted + '.' + decPart;
}

/** Format a Date as DD/MM/YYYY */
function formatDateDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Escape a value for CSV (double-quote if it contains commas, quotes, or newlines) */
function csvEscape(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Export transactions to a CSV file. Returns the file URI.
 */
export async function exportToCSV(options: ExportOptions): Promise<string> {
  // Build query conditions
  const conditions: Q.Clause[] = [];
  if (options.dateRange) {
    conditions.push(
      Q.where('date', Q.gte(options.dateRange.start.getTime())),
      Q.where('date', Q.lte(options.dateRange.end.getTime())),
    );
  }
  if (options.accountId) {
    conditions.push(Q.where('account_id', options.accountId));
  }

  const transactions = await database
    .get<Transaction>('transactions')
    .query(...conditions)
    .fetch();

  // Pre-fetch categories and accounts for lookup
  const categoryMap = new Map<string, string>();
  const accountMap = new Map<string, string>();

  if (options.includeCategories !== false) {
    const categories = await database
      .get<Category>('categories')
      .query()
      .fetch();
    for (const cat of categories) {
      categoryMap.set(cat.id, cat.name);
    }
  }

  const accounts = await database.get<Account>('accounts').query().fetch();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc.name);
  }

  // Build CSV rows
  const header = ['Date', 'Description', 'Category', 'Amount', 'Type', 'Account', 'Notes'];
  const rows: string[] = [header.map(csvEscape).join(',')];

  for (const tx of transactions) {
    const row = [
      formatDateDDMMYYYY(tx.date),
      tx.description,
      categoryMap.get(tx.categoryId) ?? '',
      formatIndianCurrency(tx.amount),
      tx.transactionType.charAt(0).toUpperCase() + tx.transactionType.slice(1),
      accountMap.get(tx.accountId) ?? '',
      tx.notes ?? '',
    ];
    rows.push(row.map(csvEscape).join(','));
  }

  // UTF-8 BOM + CSV content
  const BOM = '\uFEFF';
  const csvContent = BOM + rows.join('\n');

  const fileName = `fintrack-export-${Date.now()}.csv`;
  const fileUri = `${documentDirectory}${fileName}`;
  await writeAsStringAsync(fileUri, csvContent, {
    encoding: EncodingType.UTF8,
  });

  return fileUri;
}

/**
 * Share a previously exported file using the system share sheet.
 */
export async function shareFile(fileUri: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(fileUri);
}
