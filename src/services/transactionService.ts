import { Database, Q } from '@nozbe/watermelondb';
import Transaction, { TransactionType, ImportSource } from '../models/Transaction';

export interface CreateTransactionInput {
  amount: number;
  date: Date;
  description: string;
  transactionType: TransactionType;
  categoryId: string;
  accountId: string;
  notes?: string;
  isRecurring?: boolean;
  importSource?: ImportSource;
  rawDescription?: string;
  statementId?: string;
}

export interface UpdateTransactionInput {
  amount?: number;
  date?: Date;
  description?: string;
  transactionType?: TransactionType;
  categoryId?: string;
  accountId?: string;
  notes?: string;
  isRecurring?: boolean;
}

export async function createTransaction(
  database: Database,
  input: CreateTransactionInput,
): Promise<Transaction> {
  const collection = database.get<Transaction>('transactions');
  let created: Transaction | undefined;

  await database.write(async () => {
    created = await collection.create((record) => {
      record.amount = input.amount;
      record.date = input.date;
      record.description = input.description;
      record.transactionType = input.transactionType;
      record.categoryId = input.categoryId;
      record.accountId = input.accountId;
      record.notes = input.notes ?? null;
      record.isRecurring = input.isRecurring ?? false;
      record.importSource = input.importSource ?? 'manual';
      record.rawDescription = input.rawDescription ?? null;
      record.statementId = input.statementId ?? null;
    });
  });

  return created!;
}

export async function updateTransaction(
  database: Database,
  transactionId: string,
  input: UpdateTransactionInput,
): Promise<void> {
  const collection = database.get<Transaction>('transactions');
  const record = await collection.find(transactionId);

  await database.write(async () => {
    await record.update((r) => {
      if (input.amount !== undefined) r.amount = input.amount;
      if (input.date !== undefined) r.date = input.date;
      if (input.description !== undefined) r.description = input.description;
      if (input.transactionType !== undefined) r.transactionType = input.transactionType;
      if (input.categoryId !== undefined) r.categoryId = input.categoryId;
      if (input.accountId !== undefined) r.accountId = input.accountId;
      if (input.notes !== undefined) r.notes = input.notes ?? null;
      if (input.isRecurring !== undefined) r.isRecurring = input.isRecurring;
    });
  });
}

export async function deleteTransaction(
  database: Database,
  transactionId: string,
): Promise<void> {
  const collection = database.get<Transaction>('transactions');
  const record = await collection.find(transactionId);

  await database.write(async () => {
    await record.markAsDeleted();
  });
}

export interface TransactionFilters {
  search?: string;
  transactionType?: TransactionType;
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
}

export function buildTransactionQuery(database: Database, filters: TransactionFilters = {}) {
  const collection = database.get<Transaction>('transactions');
  const conditions: Q.Clause[] = [];

  if (filters.search) {
    conditions.push(Q.where('description', Q.like(`%${Q.sanitizeLikeString(filters.search)}%`)));
  }

  if (filters.transactionType) {
    conditions.push(Q.where('transaction_type', filters.transactionType));
  }

  if (filters.categoryId) {
    conditions.push(Q.where('category_id', filters.categoryId));
  }

  if (filters.dateFrom) {
    conditions.push(Q.where('date', Q.gte(filters.dateFrom.getTime())));
  }

  if (filters.dateTo) {
    conditions.push(Q.where('date', Q.lte(filters.dateTo.getTime())));
  }

  if (filters.amountMin !== undefined) {
    conditions.push(Q.where('amount', Q.gte(filters.amountMin)));
  }

  if (filters.amountMax !== undefined) {
    conditions.push(Q.where('amount', Q.lte(filters.amountMax)));
  }

  return collection.query(...conditions, Q.sortBy('date', Q.desc));
}
