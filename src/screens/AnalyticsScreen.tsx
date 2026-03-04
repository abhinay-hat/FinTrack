import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, ArrowDown, Brain } from 'phosphor-react-native';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db';
import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import { formatCurrency } from '@/utils';
import { colors } from '@/theme';
import CategoryDonutChart, { type CategorySlice } from '@/components/CategoryDonutChart';
import SpendingTrendChart, { type DailySpending } from '@/components/SpendingTrendChart';
import IncomeExpenseChart, { type MonthlyComparison } from '@/components/IncomeExpenseChart';

interface PeriodOption {
  label: string;
  startDate: Date;
  endDate: Date;
}

function getMonthPeriods(count: number): PeriodOption[] {
  const periods: PeriodOption[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    periods.push({ label, startDate: start, endDate: end });
  }
  return periods;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', { month: 'short' });
}

interface MerchantAgg {
  name: string;
  count: number;
  total: number;
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const periods = useMemo(() => getMonthPeriods(6), []);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedPeriod = periods[selectedIdx]!;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, { name: string; color: string }>>({});
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Load categories
  useEffect(() => {
    const sub = database
      .get<Category>('categories')
      .query()
      .observe()
      .subscribe((cats) => {
        const map: Record<string, { name: string; color: string }> = {};
        cats.forEach((c) => { map[c.id] = { name: c.name, color: c.color }; });
        setCategoryMap(map);
      });
    return () => sub.unsubscribe();
  }, []);

  // Load transactions for selected period
  useEffect(() => {
    const sub = database
      .get<Transaction>('transactions')
      .query(
        Q.where('date', Q.gte(selectedPeriod.startDate.getTime())),
        Q.where('date', Q.lte(selectedPeriod.endDate.getTime())),
      )
      .observe()
      .subscribe(setTransactions);
    return () => sub.unsubscribe();
  }, [selectedPeriod]);

  // Load last 6 months of transactions for comparison chart
  useEffect(() => {
    const oldest = periods[periods.length - 1]!;
    const sub = database
      .get<Transaction>('transactions')
      .query(
        Q.where('date', Q.gte(oldest.startDate.getTime())),
        Q.sortBy('date', Q.asc),
      )
      .observe()
      .subscribe(setAllTransactions);
    return () => sub.unsubscribe();
  }, [periods]);

  // Computed values
  const totalIncome = transactions
    .filter((t) => t.transactionType === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.transactionType === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  // Category breakdown (expenses only)
  const categoryData: CategorySlice[] = useMemo(() => {
    const expenseTxns = transactions.filter((t) => t.transactionType === 'expense');
    const grouped: Record<string, number> = {};
    expenseTxns.forEach((t) => {
      grouped[t.categoryId] = (grouped[t.categoryId] || 0) + t.amount;
    });
    const total = Object.values(grouped).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(grouped)
      .map(([catId, amount]) => ({
        name: categoryMap[catId]?.name ?? 'Uncategorized',
        color: categoryMap[catId]?.color ?? '#78909C',
        amount,
        percentage: (amount / total) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, categoryMap]);

  // Daily spending trend
  const dailySpending: DailySpending[] = useMemo(() => {
    const expenseTxns = transactions.filter((t) => t.transactionType === 'expense');
    const byDay: Record<number, number> = {};
    expenseTxns.forEach((t) => {
      const day = new Date(t.date).getDate();
      byDay[day] = (byDay[day] || 0) + t.amount;
    });
    return Object.entries(byDay)
      .map(([day, amount]) => ({ day: Number(day), amount }))
      .sort((a, b) => a.day - b.day);
  }, [transactions]);

  // Monthly income vs expense comparison
  const monthlyComparison: MonthlyComparison[] = useMemo(() => {
    return periods
      .map((period) => {
        const monthTxns = allTransactions.filter((t) => {
          const d = new Date(t.date).getTime();
          return d >= period.startDate.getTime() && d <= period.endDate.getTime();
        });
        return {
          label: getMonthLabel(period.startDate),
          income: monthTxns.filter((t) => t.transactionType === 'income').reduce((s, t) => s + t.amount, 0),
          expense: monthTxns.filter((t) => t.transactionType === 'expense').reduce((s, t) => s + t.amount, 0),
        };
      })
      .reverse();
  }, [allTransactions, periods]);

  // Top merchants
  const topMerchants: MerchantAgg[] = useMemo(() => {
    const expenseTxns = transactions.filter((t) => t.transactionType === 'expense' && t.description);
    const byMerchant: Record<string, { count: number; total: number }> = {};
    expenseTxns.forEach((t) => {
      const name = t.description.trim();
      if (!name) return;
      if (!byMerchant[name]) byMerchant[name] = { count: 0, total: 0 };
      byMerchant[name]!.count++;
      byMerchant[name]!.total += t.amount;
    });
    return Object.entries(byMerchant)
      .map(([name, agg]) => ({ name, ...agg }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [transactions]);

  const handlePeriodSelect = useCallback((idx: number) => {
    setSelectedIdx(idx);
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 8 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-4 pb-3">
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 18,
            color: colors.textPrimary.DEFAULT,
          }}
        >
          Analytics
        </Text>
      </View>

      {/* Period Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        className="mb-4"
      >
        {periods.map((period, idx) => {
          const isSelected = idx === selectedIdx;
          return (
            <Pressable
              key={idx}
              onPress={() => handlePeriodSelect(idx)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: isSelected ? colors.navy : '#FFFFFF',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 13,
                  color: isSelected ? '#FFFFFF' : colors.textSecondary.DEFAULT,
                }}
              >
                {period.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Summary Cards */}
      <View className="flex-row px-4 gap-3 mb-4">
        {/* Income card */}
        <View
          className="flex-1 p-4"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            borderLeftWidth: 3,
            borderLeftColor: colors.teal.DEFAULT,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <ArrowUp size={16} color={colors.teal.DEFAULT} weight="bold" />
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 12,
                color: colors.textSecondary.DEFAULT,
              }}
            >
              Income
            </Text>
          </View>
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 18,
              color: colors.teal.DEFAULT,
            }}
          >
            {formatCurrency(totalIncome)}
          </Text>
        </View>

        {/* Expense card */}
        <View
          className="flex-1 p-4"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            borderLeftWidth: 3,
            borderLeftColor: colors.danger.DEFAULT,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <ArrowDown size={16} color={colors.danger.DEFAULT} weight="bold" />
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 12,
                color: colors.textSecondary.DEFAULT,
              }}
            >
              Expense
            </Text>
          </View>
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 18,
              color: colors.danger.DEFAULT,
            }}
          >
            {formatCurrency(totalExpense)}
          </Text>
        </View>
      </View>

      {/* Category Breakdown Donut */}
      <View className="mx-4 mb-4 p-4" style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 15,
            color: colors.textPrimary.DEFAULT,
            marginBottom: 16,
          }}
        >
          Category Breakdown
        </Text>
        {categoryData.length > 0 ? (
          <CategoryDonutChart data={categoryData} totalAmount={totalExpense} />
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary.DEFAULT }}>
              No expense data for this period
            </Text>
          </View>
        )}
      </View>

      {/* Spending Trend */}
      <View className="mx-4 mb-4 p-4" style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 15,
            color: colors.textPrimary.DEFAULT,
            marginBottom: 12,
          }}
        >
          Spending Trend
        </Text>
        <SpendingTrendChart data={dailySpending} />
      </View>

      {/* Income vs Expense Comparison */}
      <View className="mx-4 mb-4 p-4" style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 15,
            color: colors.textPrimary.DEFAULT,
            marginBottom: 12,
          }}
        >
          Income vs Expense
        </Text>
        <IncomeExpenseChart data={monthlyComparison} />
      </View>

      {/* Top Merchants */}
      {topMerchants.length > 0 && (
        <View className="mx-4 mb-4 p-4" style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 15,
              color: colors.textPrimary.DEFAULT,
              marginBottom: 12,
            }}
          >
            Top Merchants
          </Text>
          {topMerchants.map((merchant, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: idx < topMerchants.length - 1 ? 1 : 0,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: '#F0F4F8',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 12,
                    color: colors.textSecondary.DEFAULT,
                  }}
                >
                  {idx + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 14,
                    color: colors.textPrimary.DEFAULT,
                  }}
                  numberOfLines={1}
                >
                  {merchant.name}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 12,
                    color: colors.textSecondary.DEFAULT,
                    marginTop: 1,
                  }}
                >
                  {merchant.count} transaction{merchant.count !== 1 ? 's' : ''}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: 'DMMono_500Medium',
                  fontSize: 14,
                  color: colors.danger.DEFAULT,
                }}
              >
                {formatCurrency(merchant.total)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* AI Insights Placeholder */}
      <View
        className="mx-4 mb-6 p-4"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: `${colors.purple}20`,
          borderStyle: 'dashed',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: `${colors.purple}12`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Brain size={22} color={colors.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 14,
                color: colors.purple,
              }}
            >
              AI Insights
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 12,
                color: colors.textSecondary.DEFAULT,
                marginTop: 2,
              }}
            >
              AI-powered spending insights coming soon
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
