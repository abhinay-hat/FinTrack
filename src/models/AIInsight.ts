import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export type InsightType = 'summary' | 'anomaly' | 'tip' | 'budget';

export default class AIInsight extends Model {
  static table = 'ai_insights';

  @text('insight_type') insightType!: InsightType;
  @text('content') content!: string;
  @date('generated_date') generatedDate!: Date;
  @text('related_period') relatedPeriod!: string; // YYYY-MM
  @field('is_read') isRead!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
