import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, children } from '@nozbe/watermelondb/decorators';

export default class Category extends Model {
  static table = 'categories';

  static associations = {
    transactions: { type: 'has_many' as const, foreignKey: 'category_id' },
    budgets: { type: 'has_many' as const, foreignKey: 'category_id' },
  };

  @text('name') name!: string;
  @text('icon') icon!: string;
  @text('color') color!: string;
  @field('budget_limit') budgetLimit!: number | null;
  @field('is_default') isDefault!: boolean;
  @text('parent_category_id') parentCategoryId!: string | null;
  @text('keywords') keywords!: string; // JSON array
  @field('sort_order') sortOrder!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('transactions') transactions: any;
  @children('budgets') budgets: any;

  get keywordsList(): string[] {
    try {
      return JSON.parse(this.keywords);
    } catch {
      return [];
    }
  }
}
