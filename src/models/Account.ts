import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children, text } from '@nozbe/watermelondb/decorators';

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'wallet';

export default class Account extends Model {
  static table = 'accounts';

  static associations = {
    transactions: { type: 'has_many' as const, foreignKey: 'account_id' },
    statements: { type: 'has_many' as const, foreignKey: 'account_id' },
  };

  @text('name') name!: string;
  @text('account_type') accountType!: AccountType;
  @text('institution') institution!: string | null;
  @field('balance') balance!: number;
  @text('currency') currency!: string;
  @text('icon') icon!: string | null;
  @field('is_default') isDefault!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('transactions') transactions: any;
  @children('statements') statements: any;
}
