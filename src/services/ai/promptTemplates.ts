/**
 * Prompt Templates for AI-powered categorization and insights.
 *
 * Used by the LLM service for transaction categorization,
 * spending insights, anomaly detection, and budget advice.
 */

export interface MonthlyData {
  month: string;
  totalIncome: number;
  totalExpense: number;
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number }>;
  transactionCount: number;
}

export interface BudgetInfo {
  category: string;
  limit: number;
  spent: number;
  percentUsed: number;
}

const CATEGORY_LIST = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health',
  'Education',
  'Income',
  'Investments',
  'Rent & EMI',
  'Groceries',
  'Others',
].join(', ');

export function getCategorizePrompt(
  transactions: Array<{ description: string; amount: number }>,
): string {
  const lines = transactions
    .map((t, i) => `${i + 1}. ${t.description} - \u20B9${t.amount}`)
    .join('\n');

  return (
    `Categorize these Indian transactions into exactly one of: ${CATEGORY_LIST}.\n\n` +
    `Transactions:\n${lines}\n\n` +
    `Respond with ONLY the category name for each, one per line.`
  );
}

export function getInsightPrompt(monthData: MonthlyData): string {
  const breakdown = monthData.categoryBreakdown
    .map((c) => `- ${c.category}: \u20B9${c.amount} (${c.percentage.toFixed(1)}%)`)
    .join('\n');

  return (
    `Analyze this monthly spending data and provide 2-3 brief insights in natural language:\n\n` +
    `Month: ${monthData.month}\n` +
    `Total Income: \u20B9${monthData.totalIncome}\n` +
    `Total Expense: \u20B9${monthData.totalExpense}\n` +
    `Transactions: ${monthData.transactionCount}\n\n` +
    `Category Breakdown:\n${breakdown}\n\n` +
    `Provide insights about spending patterns, anomalies, and suggestions.`
  );
}

export function getAnomalyPrompt(
  currentMonth: MonthlyData,
  previousMonth: MonthlyData,
): string {
  const currentBreakdown = currentMonth.categoryBreakdown
    .map((c) => `- ${c.category}: \u20B9${c.amount}`)
    .join('\n');

  const previousBreakdown = previousMonth.categoryBreakdown
    .map((c) => `- ${c.category}: \u20B9${c.amount}`)
    .join('\n');

  return (
    `Compare these two months and identify spending anomalies:\n\n` +
    `Current Month (${currentMonth.month}):\n` +
    `Total Expense: \u20B9${currentMonth.totalExpense}\n${currentBreakdown}\n\n` +
    `Previous Month (${previousMonth.month}):\n` +
    `Total Expense: \u20B9${previousMonth.totalExpense}\n${previousBreakdown}\n\n` +
    `List any significant changes (>20% increase/decrease) and possible reasons.`
  );
}

export function getBudgetAdvicePrompt(budgets: BudgetInfo[]): string {
  const budgetLines = budgets
    .map(
      (b) =>
        `- ${b.category}: \u20B9${b.spent}/\u20B9${b.limit} (${b.percentUsed.toFixed(0)}%)`,
    )
    .join('\n');

  return (
    `Based on the following budget usage, provide 2-3 brief actionable tips:\n\n` +
    `Budget Status:\n${budgetLines}\n\n` +
    `Focus on categories that are over or near budget. ` +
    `Give specific, practical Indian-context suggestions.`
  );
}
