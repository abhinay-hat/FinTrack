import * as Notifications from 'expo-notifications';
import { database } from '@/db';
import { Q } from '@nozbe/watermelondb';
import type Transaction from '@/models/Transaction';
import type Category from '@/models/Category';
import type Budget from '@/models/Budget';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const WEEKLY_SUMMARY_ID = 'weekly-summary';

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function isNotificationPermissionGranted(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function scheduleWeeklySummary(): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Cancel existing schedule first
  await cancelWeeklySummary();

  // Set up Android notification channel
  await Notifications.setNotificationChannelAsync(WEEKLY_SUMMARY_ID, {
    name: 'Weekly Summary',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: undefined,
  });

  const content = await getWeeklySummaryContent();

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_SUMMARY_ID,
    content: {
      title: content.title,
      body: content.body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 19,
      minute: 0,
    },
  });
}

export async function cancelWeeklySummary(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_SUMMARY_ID);
}

export async function getWeeklySummaryContent(): Promise<{
  title: string;
  body: string;
}> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const transactions = await database
    .get<Transaction>('transactions')
    .query(
      Q.where('transaction_type', 'expense'),
      Q.where('date', Q.gte(weekAgo.getTime())),
      Q.where('date', Q.lte(now.getTime())),
    )
    .fetch();

  if (transactions.length === 0) {
    return {
      title: 'Weekly Spending Summary',
      body: 'No expenses recorded this week. Keep tracking!',
    };
  }

  // Calculate total spent
  const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Calculate top categories by spending
  const categoryTotals = new Map<string, number>();
  for (const t of transactions) {
    const current = categoryTotals.get(t.categoryId) ?? 0;
    categoryTotals.set(t.categoryId, current + Math.abs(t.amount));
  }

  // Sort and take top 3
  const sortedCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Resolve category names
  const topParts: string[] = [];
  for (const [catId, amount] of sortedCategories) {
    try {
      const category = await database.get<Category>('categories').find(catId);
      topParts.push(`${category.name} (\u20B9${formatIndian(amount)})`);
    } catch {
      topParts.push(`Unknown (\u20B9${formatIndian(amount)})`);
    }
  }

  // Check budget status
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const budgets = await database
    .get<Budget>('budgets')
    .query(Q.where('month', month))
    .fetch();

  let budgetNote = '';
  if (budgets.length > 0) {
    const overBudget = budgets.filter(
      (b) => b.spentAmount > b.limitAmount,
    );
    if (overBudget.length > 0) {
      budgetNote = `\n${overBudget.length} budget(s) exceeded.`;
    }
  }

  const topLabel = topParts.length > 0 ? `Top: ${topParts[0]}` : '';

  return {
    title: 'Weekly Spending Summary',
    body: `You spent \u20B9${formatIndian(totalSpent)} this week. ${topLabel}${budgetNote}`,
  };
}

function formatIndian(n: number): string {
  const [intPart] = Math.abs(n).toFixed(0).split('.');
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return rest.length > 0
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
}
