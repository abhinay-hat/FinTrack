import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'accounts',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'account_type', type: 'string' }, // checking | savings | credit | cash | wallet
        { name: 'institution', type: 'string', isOptional: true },
        { name: 'balance', type: 'number' },
        { name: 'currency', type: 'string' },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'is_default', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'amount', type: 'number' },
        { name: 'date', type: 'number' },
        { name: 'description', type: 'string' },
        { name: 'raw_description', type: 'string', isOptional: true },
        { name: 'transaction_type', type: 'string' }, // income | expense | transfer
        { name: 'is_recurring', type: 'boolean' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'import_source', type: 'string', isOptional: true }, // manual | csv | pdf | ocr
        { name: 'account_id', type: 'string', isIndexed: true },
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'statement_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'budget_limit', type: 'number', isOptional: true },
        { name: 'is_default', type: 'boolean' },
        { name: 'parent_category_id', type: 'string', isOptional: true },
        { name: 'keywords', type: 'string' }, // JSON array of keywords for rule-based matching
        { name: 'sort_order', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'budgets',
      columns: [
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'month', type: 'string' }, // YYYY-MM format
        { name: 'limit_amount', type: 'number' },
        { name: 'spent_amount', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'statements',
      columns: [
        { name: 'file_path', type: 'string' },
        { name: 'file_name', type: 'string' },
        { name: 'import_date', type: 'number' },
        { name: 'bank_name', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // pending | processing | done | failed
        { name: 'transaction_count', type: 'number' },
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'account_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'ai_insights',
      columns: [
        { name: 'insight_type', type: 'string' }, // summary | anomaly | tip | budget
        { name: 'content', type: 'string' },
        { name: 'generated_date', type: 'number' },
        { name: 'related_period', type: 'string' }, // YYYY-MM format
        { name: 'is_read', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
