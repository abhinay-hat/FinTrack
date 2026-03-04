/**
 * Backup service for creating and restoring encrypted .fintrack backup files.
 *
 * Backup flow:
 *   1. Query all WatermelonDB tables
 *   2. Serialize to JSON
 *   3. Calculate SHA-256 checksum
 *   4. Encrypt with user-supplied password (XOR cipher — see encryptionUtils)
 *   5. Write to documentDirectory as .fintrack file
 *
 * Restore flow:
 *   1. Read .fintrack file
 *   2. Decrypt with password
 *   3. Verify checksum
 *   4. Optionally clear existing data
 *   5. Batch-insert all records into WatermelonDB
 */
import {
  documentDirectory,
  writeAsStringAsync,
  readAsStringAsync,
} from 'expo-file-system/legacy';
import { database } from '@/db/setup';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import Budget from '@/models/Budget';
import Statement from '@/models/Statement';
import AIInsight from '@/models/AIInsight';
import { encrypt, decrypt, computeChecksum } from './encryptionUtils';

const APP_VERSION = '1.0.0';
const BACKUP_FORMAT_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BackupMetadata {
  version: string;
  createdAt: string;
  appVersion: string;
  transactionCount: number;
  accountCount: number;
  checksum: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  accounts: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  budgets: Record<string, unknown>[];
  statements: Record<string, unknown>[];
  aiInsights: Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Helpers — serialise a WatermelonDB model to a plain object
// ---------------------------------------------------------------------------

function serializeAccount(m: Account): Record<string, unknown> {
  return {
    id: m.id,
    name: m.name,
    accountType: m.accountType,
    institution: m.institution,
    balance: m.balance,
    currency: m.currency,
    icon: m.icon,
    isDefault: m.isDefault,
  };
}

function serializeTransaction(m: Transaction): Record<string, unknown> {
  return {
    id: m.id,
    amount: m.amount,
    date: m.date.getTime(),
    description: m.description,
    rawDescription: m.rawDescription,
    transactionType: m.transactionType,
    isRecurring: m.isRecurring,
    notes: m.notes,
    importSource: m.importSource,
    accountId: m.accountId,
    categoryId: m.categoryId,
    statementId: m.statementId,
  };
}

function serializeCategory(m: Category): Record<string, unknown> {
  return {
    id: m.id,
    name: m.name,
    icon: m.icon,
    color: m.color,
    budgetLimit: m.budgetLimit,
    isDefault: m.isDefault,
    parentCategoryId: m.parentCategoryId,
    keywords: m.keywords,
    sortOrder: m.sortOrder,
  };
}

function serializeBudget(m: Budget): Record<string, unknown> {
  return {
    id: m.id,
    categoryId: m.categoryId,
    month: m.month,
    limitAmount: m.limitAmount,
    spentAmount: m.spentAmount,
  };
}

function serializeStatement(m: Statement): Record<string, unknown> {
  return {
    id: m.id,
    filePath: m.filePath,
    fileName: m.fileName,
    importDate: m.importDate.getTime(),
    bankName: m.bankName,
    status: m.status,
    transactionCount: m.transactionCount,
    errorMessage: m.errorMessage,
    accountId: m.accountId,
  };
}

function serializeAIInsight(m: AIInsight): Record<string, unknown> {
  return {
    id: m.id,
    insightType: m.insightType,
    content: m.content,
    generatedDate: m.generatedDate.getTime(),
    relatedPeriod: m.relatedPeriod,
    isRead: m.isRead,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create an encrypted backup of all data and write it as a .fintrack file.
 * Returns the file URI.
 */
export async function createBackup(password: string): Promise<string> {
  // 1. Query all records
  const accounts = await database.get<Account>('accounts').query().fetch();
  const transactions = await database
    .get<Transaction>('transactions')
    .query()
    .fetch();
  const categories = await database
    .get<Category>('categories')
    .query()
    .fetch();
  const budgets = await database.get<Budget>('budgets').query().fetch();
  const statements = await database
    .get<Statement>('statements')
    .query()
    .fetch();
  const aiInsights = await database
    .get<AIInsight>('ai_insights')
    .query()
    .fetch();

  // 2. Serialize
  const metadata: BackupMetadata = {
    version: BACKUP_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    transactionCount: transactions.length,
    accountCount: accounts.length,
    checksum: '', // placeholder — filled after hashing
  };

  const data: BackupData = {
    metadata,
    accounts: accounts.map(serializeAccount),
    transactions: transactions.map(serializeTransaction),
    categories: categories.map(serializeCategory),
    budgets: budgets.map(serializeBudget),
    statements: statements.map(serializeStatement),
    aiInsights: aiInsights.map(serializeAIInsight),
  };

  // 3. Checksum (computed on payload without the checksum field itself)
  const payloadJson = JSON.stringify({
    accounts: data.accounts,
    transactions: data.transactions,
    categories: data.categories,
    budgets: data.budgets,
    statements: data.statements,
    aiInsights: data.aiInsights,
  });
  const checksum = await computeChecksum(payloadJson);
  metadata.checksum = checksum;

  // 4. Encrypt
  const fullJson = JSON.stringify(data);
  const encrypted = await encrypt(fullJson, password);

  // 5. Write to file
  const fileName = `fintrack-backup-${Date.now()}.fintrack`;
  const fileUri = `${documentDirectory}${fileName}`;
  await writeAsStringAsync(fileUri, encrypted);

  return fileUri;
}

/**
 * Read and return only the metadata from a .fintrack backup file.
 */
export async function readBackupMetadata(
  fileUri: string,
  password: string,
): Promise<BackupMetadata> {
  const encrypted = await readAsStringAsync(fileUri);
  const decrypted = await decrypt(encrypted, password);
  const data: BackupData = JSON.parse(decrypted);
  return data.metadata;
}

/**
 * Restore a .fintrack backup into WatermelonDB.
 *
 * @param clearExisting When true, all existing records are deleted before
 *   inserting the backup data. Defaults to false.
 */
export async function restoreBackup(
  fileUri: string,
  password: string,
  clearExisting = false,
): Promise<{ transactionCount: number; accountCount: number }> {
  // 1. Read & decrypt
  const encrypted = await readAsStringAsync(fileUri);
  const decrypted = await decrypt(encrypted, password);
  const data: BackupData = JSON.parse(decrypted);

  // 2. Verify checksum
  const payloadJson = JSON.stringify({
    accounts: data.accounts,
    transactions: data.transactions,
    categories: data.categories,
    budgets: data.budgets,
    statements: data.statements,
    aiInsights: data.aiInsights,
  });
  const checksum = await computeChecksum(payloadJson);
  if (checksum !== data.metadata.checksum) {
    throw new Error(
      'Backup checksum verification failed. The file may be corrupted or the password is incorrect.',
    );
  }

  // 3. Write to DB inside a single batch
  await database.write(async () => {
    // Optionally clear existing data
    if (clearExisting) {
      const tables = [
        'transactions',
        'accounts',
        'categories',
        'budgets',
        'statements',
        'ai_insights',
      ] as const;
      for (const table of tables) {
        const records = await database.get(table).query().fetch();
        for (const record of records) {
          await record.destroyPermanently();
        }
      }
    }

    // Insert accounts
    for (const raw of data.accounts) {
      await database.get<Account>('accounts').create((rec) => {
        rec._raw.id = raw.id as string;
        rec._raw._status = 'created';
        rec.name = raw.name as string;
        rec.accountType = raw.accountType as Account['accountType'];
        rec.institution = (raw.institution as string) ?? null;
        rec.balance = raw.balance as number;
        rec.currency = raw.currency as string;
        rec.icon = (raw.icon as string) ?? null;
        rec.isDefault = raw.isDefault as boolean;
      });
    }

    // Insert categories
    for (const raw of data.categories) {
      await database.get<Category>('categories').create((rec) => {
        rec._raw.id = raw.id as string;
        rec._raw._status = 'created';
        rec.name = raw.name as string;
        rec.icon = raw.icon as string;
        rec.color = raw.color as string;
        rec.budgetLimit = (raw.budgetLimit as number) ?? null;
        rec.isDefault = raw.isDefault as boolean;
        rec.parentCategoryId = (raw.parentCategoryId as string) ?? null;
        rec.keywords = raw.keywords as string;
        rec.sortOrder = raw.sortOrder as number;
      });
    }

    // Insert transactions
    for (const raw of data.transactions) {
      await database.get<Transaction>('transactions').create((rec) => {
        rec._raw.id = raw.id as string;
        rec._raw._status = 'created';
        rec.amount = raw.amount as number;
        (rec._raw as Record<string, unknown>).date = raw.date as number;
        rec.description = raw.description as string;
        rec.rawDescription = (raw.rawDescription as string) ?? null;
        rec.transactionType =
          raw.transactionType as Transaction['transactionType'];
        rec.isRecurring = raw.isRecurring as boolean;
        rec.notes = (raw.notes as string) ?? null;
        rec.importSource =
          (raw.importSource as Transaction['importSource']) ?? null;
        rec.accountId = raw.accountId as string;
        rec.categoryId = raw.categoryId as string;
        rec.statementId = (raw.statementId as string) ?? null;
      });
    }

    // Insert budgets
    for (const raw of data.budgets) {
      await database.get<Budget>('budgets').create((rec) => {
        rec._raw.id = raw.id as string;
        rec._raw._status = 'created';
        rec.categoryId = raw.categoryId as string;
        rec.month = raw.month as string;
        rec.limitAmount = raw.limitAmount as number;
        rec.spentAmount = raw.spentAmount as number;
      });
    }

    // Insert statements
    for (const raw of data.statements) {
      await database.get<Statement>('statements').create((rec) => {
        rec._raw.id = raw.id as string;
        rec._raw._status = 'created';
        rec.filePath = raw.filePath as string;
        rec.fileName = raw.fileName as string;
        (rec._raw as Record<string, unknown>).import_date = raw.importDate as number;
        rec.bankName = (raw.bankName as string) ?? null;
        rec.status = raw.status as Statement['status'];
        rec.transactionCount = raw.transactionCount as number;
        rec.errorMessage = (raw.errorMessage as string) ?? null;
        rec.accountId = (raw.accountId as string) ?? null;
      });
    }

    // Insert AI insights
    for (const raw of data.aiInsights) {
      await database.get<AIInsight>('ai_insights').create((rec) => {
        rec._raw.id = raw.id as string;
        rec._raw._status = 'created';
        rec.insightType = raw.insightType as AIInsight['insightType'];
        rec.content = raw.content as string;
        (rec._raw as Record<string, unknown>).generated_date = raw.generatedDate as number;
        rec.relatedPeriod = raw.relatedPeriod as string;
        rec.isRead = raw.isRead as boolean;
      });
    }
  });

  return {
    transactionCount: data.transactions.length,
    accountCount: data.accounts.length,
  };
}
