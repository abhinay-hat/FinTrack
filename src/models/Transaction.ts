import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';

export type TransactionType = 'income' | 'expense' | 'transfer';
export type ImportSource = 'manual' | 'csv' | 'pdf' | 'ocr';

export default class Transaction extends Model {
  static table = 'transactions';

  static associations = {
    accounts: { type: 'belongs_to' as const, key: 'account_id' },
    categories: { type: 'belongs_to' as const, key: 'category_id' },
    statements: { type: 'belongs_to' as const, key: 'statement_id' },
  };

  @field('amount') amount!: number;
  @date('date') date!: Date;
  @text('description') description!: string;
  @text('raw_description') rawDescription!: string | null;
  @text('transaction_type') transactionType!: TransactionType;
  @field('is_recurring') isRecurring!: boolean;
  @text('notes') notes!: string | null;
  @text('import_source') importSource!: ImportSource | null;
  @text('account_id') accountId!: string;
  @text('category_id') categoryId!: string;
  @text('statement_id') statementId!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('accounts', 'account_id') account: any;
  @relation('categories', 'category_id') category: any;
  @relation('statements', 'statement_id') statement: any;
}
