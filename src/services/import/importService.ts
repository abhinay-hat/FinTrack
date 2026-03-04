/**
 * High-level import service — batch-creates transactions in WatermelonDB.
 */

import { Database, Q } from '@nozbe/watermelondb';
import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import type { ParsedTransaction } from './transactionMapper';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Batch import parsed transactions into the database.
 * Processes in chunks of 50 for performance.
 */
export async function importTransactions(
  database: Database,
  transactions: ParsedTransaction[],
  accountId: string,
  defaultCategoryId: string,
): Promise<ImportResult> {
  const CHUNK_SIZE = 50;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  const chunks: ParsedTransaction[][] = [];
  for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
    chunks.push(transactions.slice(i, i + CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    try {
      await database.write(async () => {
        const collection = database.get<Transaction>('transactions');
        for (const txn of chunk) {
          try {
            await collection.create((r) => {
              r.amount = txn.amount;
              r.date = txn.date;
              r.description = txn.description;
              r.transactionType = txn.type;
              r.categoryId = defaultCategoryId;
              r.accountId = accountId;
              r.importSource = 'csv';
              r.isRecurring = false;
              r.notes = null;
            });
            imported++;
          } catch (e: any) {
            skipped++;
            errors.push(`Row: ${txn.description.slice(0, 30)} — ${e.message}`);
          }
        }
      });
    } catch (e: any) {
      skipped += chunk.length;
      errors.push(`Chunk failed: ${e.message}`);
    }
  }

  return { imported, skipped, errors };
}

/**
 * Get the "Others" category as a fallback for imported transactions.
 */
export async function getImportFallbackCategoryId(database: Database): Promise<string> {
  const cats = await database
    .get<Category>('categories')
    .query(Q.where('name', 'Others'))
    .fetch();

  if (cats.length > 0) return cats[0].id;

  // Fallback to first category
  const all = await database.get<Category>('categories').query().fetch();
  if (all.length > 0) return all[0].id;

  throw new Error('No categories available. Please seed categories first.');
}
