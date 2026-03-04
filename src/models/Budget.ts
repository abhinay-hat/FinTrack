import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';

export default class Budget extends Model {
  static table = 'budgets';

  static associations = {
    categories: { type: 'belongs_to' as const, key: 'category_id' },
  };

  @text('category_id') categoryId!: string;
  @text('month') month!: string; // YYYY-MM
  @field('limit_amount') limitAmount!: number;
  @field('spent_amount') spentAmount!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('categories', 'category_id') category: any;

  get remaining(): number {
    return this.limitAmount - this.spentAmount;
  }

  get percentUsed(): number {
    if (this.limitAmount === 0) return 0;
    return (this.spentAmount / this.limitAmount) * 100;
  }
}
