/**
 * Spending Insights Generator
 *
 * Generates rule-based spending insights from WatermelonDB transaction data.
 * When an LLM is available, enhances insights with natural language generation.
 */

import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/setup';
import type Transaction from '@/models/Transaction';
import type Budget from '@/models/Budget';
import type Category from '@/models/Category';
import type AIInsight from '@/models/AIInsight';
import { createLLMService } from './llmService';
import { getInsightPrompt, type MonthlyData } from './promptTemplates';

export interface SpendingInsight {
  type: 'summary' | 'anomaly' | 'tip' | 'budget';
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'positive';
  relatedCategory?: string;
  relatedAmount?: number;
}

interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  amount: number;
}

function getMonthDateRange(month: string): { start: number; end: number } {
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year, mon - 1, 1).getTime();
  const end = new Date(year, mon, 1).getTime();
  return { start, end };
}

function getPreviousMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(year, mon - 2, 1);
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}

function getWeekDateRange(): { start: number; end: number } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  return { start: startOfWeek.getTime(), end: now.getTime() };
}

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

async function fetchTransactionsForRange(
  start: number,
  end: number,
): Promise<Transaction[]> {
  const collection = database.get<Transaction>('transactions');
  return collection
    .query(Q.where('date', Q.gte(start)), Q.where('date', Q.lt(end)))
    .fetch();
}

async function fetchCategoriesMap(): Promise<Map<string, string>> {
  const categories = await database.get<Category>('categories').query().fetch();
  const map = new Map<string, string>();
  for (const cat of categories) {
    map.set(cat.id, cat.name);
  }
  return map;
}

async function computeCategoryTotals(
  transactions: Transaction[],
  categoryMap: Map<string, string>,
  type: 'expense' | 'income',
): Promise<CategoryTotal[]> {
  const totals = new Map<string, { categoryName: string; amount: number }>();

  for (const txn of transactions) {
    if (txn.transactionType !== type) continue;
    const catName = categoryMap.get(txn.categoryId) ?? 'Others';
    const existing = totals.get(txn.categoryId);
    if (existing) {
      existing.amount += Math.abs(txn.amount);
    } else {
      totals.set(txn.categoryId, { categoryName: catName, amount: Math.abs(txn.amount) });
    }
  }

  return Array.from(totals.entries())
    .map(([categoryId, data]) => ({ categoryId, ...data }))
    .sort((a, b) => b.amount - a.amount);
}

function buildMonthlyData(
  month: string,
  transactions: Transaction[],
  expenseTotals: CategoryTotal[],
): MonthlyData {
  const totalIncome = transactions
    .filter((t) => t.transactionType === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpense = expenseTotals.reduce((sum, c) => sum + c.amount, 0);

  const categoryBreakdown = expenseTotals.map((c) => ({
    category: c.categoryName,
    amount: c.amount,
    percentage: totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0,
  }));

  return {
    month,
    totalIncome,
    totalExpense,
    categoryBreakdown,
    transactionCount: transactions.length,
  };
}

function generateRuleBasedInsights(
  current: MonthlyData,
  previous: MonthlyData | null,
  budgets: Budget[],
  categoryMap: Map<string, string>,
): SpendingInsight[] {
  const insights: SpendingInsight[] = [];

  // 1. Monthly summary
  if (current.totalExpense > 0) {
    let summaryContent = `You spent ${formatCurrency(current.totalExpense)} this month across ${current.transactionCount} transactions.`;

    if (previous && previous.totalExpense > 0) {
      const diff = current.totalExpense - previous.totalExpense;
      const pctChange = Math.abs((diff / previous.totalExpense) * 100);

      if (Math.abs(diff) > 0.01) {
        const direction = diff > 0 ? 'more' : 'less';
        summaryContent = `You spent ${formatCurrency(current.totalExpense)} this month \u2014 ${pctChange.toFixed(0)}% ${direction} than last month.`;
      }
    }

    insights.push({
      type: 'summary',
      title: 'Monthly Summary',
      content: summaryContent,
      severity: 'info',
      relatedAmount: current.totalExpense,
    });
  }

  // 2. Top category
  if (current.categoryBreakdown.length > 0) {
    const top = current.categoryBreakdown[0];
    insights.push({
      type: 'summary',
      title: 'Top Spending Category',
      content: `${top.category} was your biggest expense at ${formatCurrency(top.amount)} (${top.percentage.toFixed(0)}%).`,
      severity: 'info',
      relatedCategory: top.category,
      relatedAmount: top.amount,
    });
  }

  // 3. Anomaly detection (compare with previous month)
  if (previous && previous.categoryBreakdown.length > 0) {
    const prevMap = new Map(previous.categoryBreakdown.map((c) => [c.category, c.amount]));

    for (const cat of current.categoryBreakdown) {
      const prevAmount = prevMap.get(cat.category);
      if (prevAmount && prevAmount > 0) {
        const change = ((cat.amount - prevAmount) / prevAmount) * 100;
        if (Math.abs(change) >= 30) {
          const direction = change > 0 ? 'increased' : 'decreased';
          insights.push({
            type: 'anomaly',
            title: `${cat.category} Spending Change`,
            content: `Your ${cat.category} spending ${direction} by ${Math.abs(change).toFixed(0)}% compared to last month.`,
            severity: change > 0 ? 'warning' : 'positive',
            relatedCategory: cat.category,
            relatedAmount: cat.amount,
          });
        }
      }
    }
  }

  // 4. Budget alerts
  for (const budget of budgets) {
    const catName = categoryMap.get(budget.categoryId) ?? 'Unknown';
    const pct = budget.percentUsed;

    if (pct >= 100) {
      insights.push({
        type: 'budget',
        title: `${catName} Budget Exceeded`,
        content: `You've exceeded your ${catName} budget by ${formatCurrency(budget.spentAmount - budget.limitAmount)}.`,
        severity: 'warning',
        relatedCategory: catName,
        relatedAmount: budget.spentAmount,
      });
    } else if (pct >= 80) {
      insights.push({
        type: 'budget',
        title: `${catName} Budget Alert`,
        content: `You've used ${pct.toFixed(0)}% of your ${catName} budget.`,
        severity: 'warning',
        relatedCategory: catName,
        relatedAmount: budget.spentAmount,
      });
    }
  }

  // 5. Savings tips (compare with previous month categories)
  if (previous) {
    const prevMap = new Map(previous.categoryBreakdown.map((c) => [c.category, c.amount]));

    for (const cat of current.categoryBreakdown) {
      const prevAmount = prevMap.get(cat.category);
      if (prevAmount && cat.amount > prevAmount) {
        const savings = cat.amount - prevAmount;
        if (savings >= 500) {
          insights.push({
            type: 'tip',
            title: `Save on ${cat.category}`,
            content: `You could save ${formatCurrency(savings)} by reducing ${cat.category} to last month's level.`,
            severity: 'info',
            relatedCategory: cat.category,
            relatedAmount: savings,
          });
          break; // Only one savings tip
        }
      }
    }
  }

  // 6. Streak detection (budget under for consecutive months)
  const underBudgetAll = budgets.length > 0 && budgets.every((b) => b.percentUsed < 100);
  if (underBudgetAll && budgets.length > 0) {
    insights.push({
      type: 'tip',
      title: 'Budget Streak',
      content: "You're under budget across all categories this month. Keep it up!",
      severity: 'positive',
    });
  }

  return insights;
}

async function tryLLMEnhancement(
  monthData: MonthlyData,
  ruleInsights: SpendingInsight[],
): Promise<SpendingInsight[]> {
  const llm = createLLMService();
  if (!llm.isAvailable() || llm.getModelStatus() !== 'ready') {
    return ruleInsights;
  }

  try {
    const prompt = getInsightPrompt(monthData);
    const response = await llm.runInference(prompt);

    if (response.text.trim().length > 0) {
      ruleInsights.push({
        type: 'summary',
        title: 'AI Analysis',
        content: response.text.trim(),
        severity: 'info',
      });
    }
  } catch {
    // LLM enhancement failed — return rule-based insights only
  }

  return ruleInsights;
}

/**
 * Generate spending insights for a given month (YYYY-MM format).
 */
export async function generateMonthlyInsights(month: string): Promise<SpendingInsight[]> {
  const categoryMap = await fetchCategoriesMap();

  // Fetch current month data
  const { start, end } = getMonthDateRange(month);
  const transactions = await fetchTransactionsForRange(start, end);
  const expenseTotals = await computeCategoryTotals(transactions, categoryMap, 'expense');
  const currentData = buildMonthlyData(month, transactions, expenseTotals);

  // Fetch previous month data
  const prevMonth = getPreviousMonth(month);
  const { start: prevStart, end: prevEnd } = getMonthDateRange(prevMonth);
  const prevTransactions = await fetchTransactionsForRange(prevStart, prevEnd);
  const prevExpenseTotals = await computeCategoryTotals(prevTransactions, categoryMap, 'expense');
  const previousData =
    prevTransactions.length > 0
      ? buildMonthlyData(prevMonth, prevTransactions, prevExpenseTotals)
      : null;

  // Fetch budgets for current month
  const budgets = await database
    .get<Budget>('budgets')
    .query(Q.where('month', month))
    .fetch();

  // Generate rule-based insights
  const insights = generateRuleBasedInsights(currentData, previousData, budgets, categoryMap);

  // Try LLM enhancement
  return tryLLMEnhancement(currentData, insights);
}

/**
 * Generate insights for the current week.
 */
export async function generateWeeklyInsights(): Promise<SpendingInsight[]> {
  const categoryMap = await fetchCategoriesMap();
  const { start, end } = getWeekDateRange();
  const transactions = await fetchTransactionsForRange(start, end);

  if (transactions.length === 0) {
    return [
      {
        type: 'summary',
        title: 'Weekly Summary',
        content: 'No transactions recorded this week yet.',
        severity: 'info',
      },
    ];
  }

  const expenseTotals = await computeCategoryTotals(transactions, categoryMap, 'expense');
  const totalExpense = expenseTotals.reduce((sum, c) => sum + c.amount, 0);
  const totalIncome = transactions
    .filter((t) => t.transactionType === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const insights: SpendingInsight[] = [];

  insights.push({
    type: 'summary',
    title: 'Weekly Summary',
    content: `This week: ${formatCurrency(totalExpense)} spent across ${transactions.length} transactions.`,
    severity: 'info',
    relatedAmount: totalExpense,
  });

  if (totalIncome > 0) {
    insights.push({
      type: 'summary',
      title: 'Weekly Income',
      content: `You received ${formatCurrency(totalIncome)} in income this week.`,
      severity: 'positive',
      relatedAmount: totalIncome,
    });
  }

  if (expenseTotals.length > 0) {
    const top = expenseTotals[0];
    insights.push({
      type: 'summary',
      title: 'Top Weekly Category',
      content: `${top.categoryName} is your top expense this week at ${formatCurrency(top.amount)}.`,
      severity: 'info',
      relatedCategory: top.categoryName,
      relatedAmount: top.amount,
    });
  }

  // Check daily average against monthly budget
  const currentMonth = getCurrentMonth();
  const budgets = await database
    .get<Budget>('budgets')
    .query(Q.where('month', currentMonth))
    .fetch();

  const daysInMonth = new Date(
    parseInt(currentMonth.split('-')[0]),
    parseInt(currentMonth.split('-')[1]),
    0,
  ).getDate();

  for (const budget of budgets) {
    const catName = categoryMap.get(budget.categoryId) ?? 'Unknown';
    const dailyBudget = budget.limitAmount / daysInMonth;
    const catExpense = expenseTotals.find((c) => c.categoryId === budget.categoryId);
    if (catExpense) {
      const dailyActual = catExpense.amount / 7;
      if (dailyActual > dailyBudget * 1.5) {
        insights.push({
          type: 'budget',
          title: `${catName} Pace Warning`,
          content: `At this pace, you'll exceed your ${catName} budget. Weekly rate: ${formatCurrency(catExpense.amount)}/week.`,
          severity: 'warning',
          relatedCategory: catName,
          relatedAmount: catExpense.amount,
        });
      }
    }
  }

  return insights;
}

/**
 * Save generated insights to the WatermelonDB ai_insights table.
 */
export async function saveInsightsToDB(
  insights: SpendingInsight[],
  month: string,
): Promise<void> {
  await database.write(async () => {
    const collection = database.get<AIInsight>('ai_insights');

    for (const insight of insights) {
      await collection.create((record) => {
        record.insightType = insight.type;
        record.content = JSON.stringify({
          title: insight.title,
          content: insight.content,
          severity: insight.severity,
          relatedCategory: insight.relatedCategory,
          relatedAmount: insight.relatedAmount,
        });
        record.generatedDate = new Date();
        record.relatedPeriod = month;
        record.isRead = false;
      });
    }
  });
}
