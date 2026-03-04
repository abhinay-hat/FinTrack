import { Database, Q } from '@nozbe/watermelondb';
import Account, { AccountType } from '../models/Account';
import Transaction from '../models/Transaction';

export interface CreateAccountInput {
  name: string;
  accountType: AccountType;
  institution?: string;
  balance?: number;
  currency?: string;
  icon?: string;
  isDefault?: boolean;
}

export interface UpdateAccountInput {
  name?: string;
  accountType?: AccountType;
  institution?: string;
  balance?: number;
  icon?: string;
  isDefault?: boolean;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking Account',
  savings: 'Savings Account',
  credit: 'Credit Card',
  cash: 'Cash',
  wallet: 'Digital Wallet',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  checking: 'Bank',
  savings: 'Vault',
  credit: 'CreditCard',
  cash: 'Money',
  wallet: 'Wallet',
};

export const WALLET_PRESETS = [
  { name: 'Paytm', icon: 'Wallet' },
  { name: 'PhonePe', icon: 'Wallet' },
  { name: 'Google Pay', icon: 'Wallet' },
  { name: 'Amazon Pay', icon: 'Wallet' },
];

export async function createAccount(
  database: Database,
  input: CreateAccountInput,
): Promise<Account> {
  const collection = database.get<Account>('accounts');
  let created: Account | undefined;

  await database.write(async () => {
    // If setting as default, unset existing defaults
    if (input.isDefault) {
      const existingDefaults = await collection.query(Q.where('is_default', true)).fetch();
      for (const acc of existingDefaults) {
        await acc.update((r) => {
          r.isDefault = false;
        });
      }
    }

    created = await collection.create((record) => {
      record.name = input.name;
      record.accountType = input.accountType;
      record.institution = input.institution ?? null;
      record.balance = input.balance ?? 0;
      record.currency = input.currency ?? 'INR';
      record.icon = input.icon ?? null;
      record.isDefault = input.isDefault ?? false;
    });
  });

  return created!;
}

export async function updateAccount(
  database: Database,
  accountId: string,
  input: UpdateAccountInput,
): Promise<void> {
  const collection = database.get<Account>('accounts');
  const record = await collection.find(accountId);

  await database.write(async () => {
    if (input.isDefault) {
      const existingDefaults = await collection
        .query(Q.where('is_default', true), Q.where('id', Q.notEq(accountId)))
        .fetch();
      for (const acc of existingDefaults) {
        await acc.update((r) => {
          r.isDefault = false;
        });
      }
    }

    await record.update((r) => {
      if (input.name !== undefined) r.name = input.name;
      if (input.accountType !== undefined) r.accountType = input.accountType;
      if (input.institution !== undefined) r.institution = input.institution ?? null;
      if (input.balance !== undefined) r.balance = input.balance;
      if (input.icon !== undefined) r.icon = input.icon ?? null;
      if (input.isDefault !== undefined) r.isDefault = input.isDefault;
    });
  });
}

export async function deleteAccount(database: Database, accountId: string): Promise<void> {
  const collection = database.get<Account>('accounts');
  const record = await collection.find(accountId);

  // Check if there are linked transactions
  const txnCount = await database
    .get<Transaction>('transactions')
    .query(Q.where('account_id', accountId))
    .fetchCount();

  if (txnCount > 0) {
    throw new Error(`Cannot delete account with ${txnCount} transactions. Move or delete them first.`);
  }

  await database.write(async () => {
    await record.markAsDeleted();
  });
}

export async function getDefaultAccount(database: Database): Promise<Account | null> {
  const collection = database.get<Account>('accounts');
  const defaults = await collection.query(Q.where('is_default', true)).fetch();
  if (defaults.length > 0) return defaults[0];

  // Fallback to first account
  const all = await collection.query().fetch();
  return all.length > 0 ? all[0] : null;
}

export async function computeAccountBalance(
  database: Database,
  accountId: string,
): Promise<number> {
  const transactions = await database
    .get<Transaction>('transactions')
    .query(Q.where('account_id', accountId))
    .fetch();

  let balance = 0;
  for (const txn of transactions) {
    if (txn.transactionType === 'income') {
      balance += txn.amount;
    } else if (txn.transactionType === 'expense') {
      balance -= txn.amount;
    }
  }
  return balance;
}

export async function transferBetweenAccounts(
  database: Database,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description: string,
  categoryId: string,
): Promise<void> {
  await database.write(async () => {
    const txnCollection = database.get<Transaction>('transactions');
    const now = new Date();

    // Expense on source account
    await txnCollection.create((r) => {
      r.amount = amount;
      r.date = now;
      r.description = description;
      r.transactionType = 'transfer';
      r.categoryId = categoryId;
      r.accountId = fromAccountId;
      r.importSource = 'manual';
      r.isRecurring = false;
      r.notes = `Transfer to account`;
    });

    // Income on destination account
    await txnCollection.create((r) => {
      r.amount = amount;
      r.date = now;
      r.description = description;
      r.transactionType = 'transfer';
      r.categoryId = categoryId;
      r.accountId = toAccountId;
      r.importSource = 'manual';
      r.isRecurring = false;
      r.notes = `Transfer from account`;
    });
  });
}
