import { Database, Q } from '@nozbe/watermelondb';
import Account from '@/models/Account';
import Category from '@/models/Category';
import Transaction from '@/models/Transaction';

export interface QuickCashEntry {
  amount: number;
  categoryName: string;
  description?: string;
}

/**
 * Find the existing "Cash" account, or create one if none exists.
 */
async function findOrCreateCashAccount(database: Database): Promise<Account> {
  const accounts = database.get<Account>('accounts');
  const existing = await accounts
    .query(Q.where('account_type', 'cash'))
    .fetch();

  if (existing.length > 0) return existing[0];

  let created: Account | undefined;
  await database.write(async () => {
    created = await accounts.create((record) => {
      record.name = 'Cash';
      record.accountType = 'cash';
      record.institution = null as unknown as string;
      record.balance = 0;
      record.currency = 'INR';
      record.icon = 'Money';
      record.isDefault = false;
    });
  });
  return created!;
}

/**
 * Find a category by name (case-insensitive).
 * Falls back to "Others" if not found.
 */
async function findCategoryByName(
  database: Database,
  name: string,
): Promise<Category> {
  const categories = database.get<Category>('categories');
  const all = await categories.query().fetch();

  const match = all.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (match) return match;

  const others = all.find((c) => c.name === 'Others');
  if (others) return others;

  // Absolute fallback: return first category
  return all[0];
}

/**
 * Save a quick cash transaction.
 * Auto-creates Cash account if needed, resolves category by name.
 */
export async function saveCashTransaction(
  database: Database,
  entry: QuickCashEntry,
): Promise<Transaction> {
  const cashAccount = await findOrCreateCashAccount(database);
  const category = await findCategoryByName(database, entry.categoryName);

  const transactions = database.get<Transaction>('transactions');
  let created: Transaction | undefined;

  await database.write(async () => {
    created = await transactions.create((record) => {
      record.amount = entry.amount;
      record.date = new Date();
      record.description = entry.description ?? entry.categoryName;
      record.rawDescription = null as unknown as string;
      record.transactionType = 'expense';
      record.isRecurring = false;
      record.notes = null as unknown as string;
      record.importSource = 'manual';
      record.accountId = cashAccount.id;
      record.categoryId = category.id;
      record.statementId = null as unknown as string;
    });
  });

  return created!;
}

/**
 * Get the most frequently used cash amounts from transaction history.
 * Returns up to 6 amounts sorted by frequency descending.
 */
export async function getFrequentCashAmounts(
  database: Database,
): Promise<number[]> {
  const transactions = database.get<Transaction>('transactions');
  const accounts = database.get<Account>('accounts');

  const cashAccounts = await accounts
    .query(Q.where('account_type', 'cash'))
    .fetch();
  if (cashAccounts.length === 0) return [];

  const cashAccountIds = cashAccounts.map((a) => a.id);
  const recent = await transactions
    .query(
      Q.where('account_id', Q.oneOf(cashAccountIds)),
      Q.where('transaction_type', 'expense'),
      Q.sortBy('created_at', Q.desc),
      Q.take(100),
    )
    .fetch();

  const counts = new Map<number, number>();
  for (const tx of recent) {
    counts.set(tx.amount, (counts.get(tx.amount) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([amount]) => amount);
}

/**
 * Get the most frequently used cash categories from transaction history.
 * Returns up to 6 category names sorted by frequency descending.
 */
export async function getFrequentCashCategories(
  database: Database,
): Promise<string[]> {
  const transactions = database.get<Transaction>('transactions');
  const accounts = database.get<Account>('accounts');
  const categories = database.get<Category>('categories');

  const cashAccounts = await accounts
    .query(Q.where('account_type', 'cash'))
    .fetch();
  if (cashAccounts.length === 0) return [];

  const cashAccountIds = cashAccounts.map((a) => a.id);
  const recent = await transactions
    .query(
      Q.where('account_id', Q.oneOf(cashAccountIds)),
      Q.where('transaction_type', 'expense'),
      Q.sortBy('created_at', Q.desc),
      Q.take(200),
    )
    .fetch();

  const counts = new Map<string, number>();
  for (const tx of recent) {
    counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1);
  }

  const topCategoryIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => id);

  const allCategories = await categories.query().fetch();
  const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));

  return topCategoryIds
    .map((id) => categoryMap.get(id))
    .filter((name): name is string => name !== undefined);
}
