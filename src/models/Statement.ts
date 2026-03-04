import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, children, relation } from '@nozbe/watermelondb/decorators';

export type StatementStatus = 'pending' | 'processing' | 'done' | 'failed';

export default class Statement extends Model {
  static table = 'statements';

  static associations = {
    transactions: { type: 'has_many' as const, foreignKey: 'statement_id' },
    accounts: { type: 'belongs_to' as const, key: 'account_id' },
  };

  @text('file_path') filePath!: string;
  @text('file_name') fileName!: string;
  @date('import_date') importDate!: Date;
  @text('bank_name') bankName!: string | null;
  @text('status') status!: StatementStatus;
  @field('transaction_count') transactionCount!: number;
  @text('error_message') errorMessage!: string | null;
  @text('account_id') accountId!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('transactions') transactions: any;
  @relation('accounts', 'account_id') account: any;
}
