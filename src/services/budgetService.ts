import { Database, Q } from '@nozbe/watermelondb';
import Budget from '../models/Budget';
import Category from '../models/Category';
import Transaction from '../models/Transaction';

export interface BudgetWithProgress {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  month: string;
  limitAmount: number;
  spentAmount: number;
  percentage: number;
  status: 'under' | 'warning' | 'over';
}

function getStatus(percentage: number): 'under' | 'warning' | 'over' {
  if (percentage >= 80) return 'over';
  if (percentage >= 60) return 'warning';
  return 'under';
}

export async function calculateCategorySpent(
  database: Database,
  categoryId: string,
  month: string,
): Promise<number> {
  const [year, mon] = month.split('-').map(Number);
  const startOfMonth = new Date(year, mon - 1, 1).getTime();
  const endOfMonth = new Date(year, mon, 0, 23, 59, 59, 999).getTime();

  const transactions = await database
    .get<Transaction>('transactions')
    .query(
      Q.where('category_id', categoryId),
      Q.where('transaction_type', 'expense'),
      Q.where('date', Q.gte(startOfMonth)),
      Q.where('date', Q.lte(endOfMonth)),
    )
    .fetch();

  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

export async function createBudget(
  database: Database,
  categoryId: string,
  month: string,
  limitAmount: number,
): Promise<void> {
  const collection = database.get<Budget>('budgets');
  const spentAmount = await calculateCategorySpent(database, categoryId, month);

  await database.write(async () => {
    await collection.create((record) => {
      record.categoryId = categoryId;
      record.month = month;
      record.limitAmount = limitAmount;
      record.spentAmount = spentAmount;
    });
  });
}

export async function updateBudget(
  database: Database,
  budgetId: string,
  limitAmount: number,
): Promise<void> {
  const collection = database.get<Budget>('budgets');
  const record = await collection.find(budgetId);

  await database.write(async () => {
    await record.update((r) => {
      r.limitAmount = limitAmount;
    });
  });
}

export async function deleteBudget(database: Database, budgetId: string): Promise<void> {
  const collection = database.get<Budget>('budgets');
  const record = await collection.find(budgetId);

  await database.write(async () => {
    await record.markAsDeleted();
  });
}

export async function getMonthlyBudgets(
  database: Database,
  month: string,
): Promise<BudgetWithProgress[]> {
  const budgets = await database
    .get<Budget>('budgets')
    .query(Q.where('month', month))
    .fetch();

  const categoryMap = new Map<string, Category>();
  const allCategories = await database.get<Category>('categories').query().fetch();
  allCategories.forEach((c) => categoryMap.set(c.id, c));

  const results: BudgetWithProgress[] = [];

  for (const budget of budgets) {
    const category = categoryMap.get(budget.categoryId);
    if (!category) continue;

    const spentAmount = await calculateCategorySpent(database, budget.categoryId, month);
    const percentage = budget.limitAmount > 0 ? (spentAmount / budget.limitAmount) * 100 : 0;

    results.push({
      id: budget.id,
      categoryId: budget.categoryId,
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryColor: category.color,
      month: budget.month,
      limitAmount: budget.limitAmount,
      spentAmount,
      percentage,
      status: getStatus(percentage),
    });
  }

  return results;
}

export async function getCategoriesWithoutBudget(
  database: Database,
  month: string,
): Promise<Category[]> {
  const budgets = await database
    .get<Budget>('budgets')
    .query(Q.where('month', month))
    .fetch();

  const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));

  const allCategories = await database.get<Category>('categories').query().fetch();

  // Filter out categories that already have a budget and exclude income category
  return allCategories.filter(
    (c) => !budgetedCategoryIds.has(c.id) && c.name !== 'Income' && c.name !== 'Investments',
  );
}
