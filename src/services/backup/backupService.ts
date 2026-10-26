/**
 * Backup service for creating and restoring password-obfuscated .fintrack files.
 *
 * Backup flow:
 *   1. Query all WatermelonDB tables
 *   2. Serialize to JSON
 *   3. Calculate SHA-256 checksum
 *   4. Obfuscate with user-supplied password (XOR; see encryptionUtils)
 *   5. Write to documentDirectory as .fintrack file
 *
 * Restore flow:
 *   1. Read .fintrack file
 *   2. Deobfuscate with password
 *   3. Verify checksum
 *   4. Optionally clear existing data
 *   5. Batch-insert all records into WatermelonDB
 *
 * Obfuscation is not encryption. See encryptionUtils.ts.
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
import { obfuscate, deobfuscate, computeChecksum } from './encryptionUtils';

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
 * Create a password-obfuscated backup of all data and write it as a .fintrack file.
 * Returns the file URI. Obfuscation is not encryption.
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

  // 3. Checksum (payload arrays only; metadata counts bound separately on verify)
  metadata.checksum = await computePayloadChecksum(data);

  // 4. Obfuscate (not encryption)
  const fullJson = JSON.stringify(data);
  const obfuscated = await obfuscate(fullJson, password);

  // 5. Write to file
  const fileName = `fintrack-backup-${Date.now()}.fintrack`;
  const fileUri = `${documentDirectory}${fileName}`;
  await writeAsStringAsync(fileUri, obfuscated);

  return fileUri;
}

/**
 * Integrity for restore preview and restore: checksum over payload arrays, plus
 * metadata counts must match those arrays so the confirm UI cannot lie.
 */
async function computePayloadChecksum(data: BackupData): Promise<string> {
  const payloadJson = JSON.stringify({
    accounts: data.accounts,
    transactions: data.transactions,
    categories: data.categories,
    budgets: data.budgets,
    statements: data.statements,
    aiInsights: data.aiInsights,
  });
  return computeChecksum(payloadJson);
}

function assertBackupShape(data: BackupData): void {
  const { metadata } = data;
  if (!metadata || typeof metadata !== 'object') {
    throw new Error('Backup metadata is missing or invalid.');
  }
  for (const key of [
    'accounts',
    'transactions',
    'categories',
    'budgets',
    'statements',
    'aiInsights',
  ] as const) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Backup field "${key}" is missing or invalid.`);
    }
  }
  if (metadata.transactionCount !== data.transactions.length) {
    throw new Error(
      'Backup metadata transactionCount does not match the transaction list.',
    );
  }
  if (metadata.accountCount !== data.accounts.length) {
    throw new Error(
      'Backup metadata accountCount does not match the account list.',
    );
  }
}

async function verifyBackupIntegrity(data: BackupData): Promise<void> {
  assertBackupShape(data);
  const checksum = await computePayloadChecksum(data);
  if (checksum !== data.metadata.checksum) {
    throw new Error(
      'Backup checksum verification failed. The file may be corrupted or the password is incorrect.',
    );
  }
}

async function loadBackupData(
  fileUri: string,
  password: string,
): Promise<BackupData> {
  const obfuscated = await readAsStringAsync(fileUri);
  const plaintext = await deobfuscate(obfuscated, password);
  const data = JSON.parse(plaintext) as BackupData;
  await verifyBackupIntegrity(data);
  return data;
}

/**
 * Read and return only the metadata from a .fintrack backup file.
 * Verifies checksum and metadata/array count binding before returning.
 */
export async function readBackupMetadata(
  fileUri: string,
  password: string,
): Promise<BackupMetadata> {
  const data = await loadBackupData(fileUri, password);
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
  // 1. Read, deobfuscate, verify checksum + metadata counts (before any wipe)
  const data = await loadBackupData(fileUri, password);

  // 2. Write to DB inside a single batch
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
