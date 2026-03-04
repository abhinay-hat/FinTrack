import { View, Text, Pressable, ScrollView } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  ArrowDown,
  ArrowUp,
  FileArrowUp,
  User,
} from 'phosphor-react-native';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import { formatCurrency, formatDateShort } from '@/utils';
import { colors } from '@/theme';
import { useTransactionSheet } from '@/screens/AddTransactionScreen';
import BalanceCard from '@/components/BalanceCard';
import SpendingMiniChart, { type DailySpending } from '@/components/SpendingMiniChart';
import TopCategories, { type CategorySpending } from '@/components/TopCategories';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getPeriodRange(period: Period): { start: Date; end: Date; label: string } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (period) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Today' };
    case 'weekly': {
      const day = now.getDay();
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'This Week' };
    }
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'This Month' };
    case 'yearly':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'This Year' };
  }
}

function getLast7Days(): { date: Date; label: string }[] {
  const days: { date: Date; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({ date: d, label: DAY_LABELS[d.getDay()] });
  }
  return days;
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const transactionSheet = useTransactionSheet();

  const [period, setPeriod] = useState<Period>('monthly');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryMap, setCategoryMap] = useState<
    Record<string, { name: string; icon: string; color: string }>
  >({});

  useEffect(() => {
    const accSub = database
      .get<Account>('accounts')
      .query()
      .observe()
      .subscribe(setAccounts);

    const txnSub = database
      .get<Transaction>('transactions')
      .query(Q.sortBy('date', Q.desc))
      .observe()
      .subscribe(setTransactions);

    const catSub = database
      .get<Category>('categories')
      .query()
      .observe()
      .subscribe((cats) => {
        const map: Record<string, { name: string; icon: string; color: string }> = {};
        cats.forEach((c) => {
          map[c.id] = { name: c.name, icon: c.icon, color: c.color };
        });
        setCategoryMap(map);
      });

    return () => {
      accSub.unsubscribe();
      txnSub.unsubscribe();
      catSub.unsubscribe();
    };
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const { start, end, label: periodLabel } = useMemo(() => getPeriodRange(period), [period]);

  const periodTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      }),
    [transactions, start, end],
  );

  const totalIncome = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.transactionType === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions],
  );

  const totalExpense = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.transactionType === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions],
  );

  // Last 7 days spending for chart
  const last7DaysData: DailySpending[] = useMemo(() => {
    const days = getLast7Days();
    return days.map(({ date, label }) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const total = transactions
        .filter((t) => {
          if (t.transactionType !== 'expense') return false;
          const d = new Date(t.date);
          return d >= date && d < nextDay;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      return { day: date.toISOString(), label, total };
    });
  }, [transactions]);

  // Top 5 spending categories for current period
  const topCategories: CategorySpending[] = useMemo(() => {
    const catTotals: Record<string, number> = {};
    periodTransactions
      .filter((t) => t.transactionType === 'expense')
      .forEach((t) => {
        catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
      });
    return Object.entries(catTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, total]) => {
        const cat = categoryMap[id];
        return {
          id,
          name: cat?.name ?? 'Other',
          icon: cat?.icon ?? '💰',
          color: cat?.color ?? '#78909C',
          total,
        };
      });
  }, [periodTransactions, categoryMap]);

  const recentTransactions = transactions.slice(0, 5);

  return (
    <ScrollView
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 8 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header */}
      <View
        className="flex-row items-center justify-between px-4"
        style={{ height: 56 }}
      >
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 18,
            color: colors.textPrimary.DEFAULT,
          }}
        >
          {getGreeting()}
        </Text>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <Pressable>
            <Bell size={24} color={colors.textPrimary.DEFAULT} />
          </Pressable>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: colors.navy,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={18} color="#FFFFFF" weight="fill" />
          </View>
        </View>
      </View>

      {/* 2. Balance Hero Card */}
      <BalanceCard
        totalBalance={totalBalance}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        periodLabel={periodLabel}
        onPeriodPress={() => {
          const idx = PERIOD_OPTIONS.findIndex((p) => p.key === period);
          const next = PERIOD_OPTIONS[(idx + 1) % PERIOD_OPTIONS.length];
          setPeriod(next.key);
        }}
      />

      {/* 3. Period Selector */}
      <View
        className="flex-row mx-4 mt-3"
        style={{ gap: 8 }}
      >
        {PERIOD_OPTIONS.map((opt) => {
          const selected = opt.key === period;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setPeriod(opt.key)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: selected ? colors.navy : '#FFFFFF',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 12,
                  color: selected ? '#FFFFFF' : colors.textSecondary.DEFAULT,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 4. Quick Actions Row */}
      <View className="flex-row mx-4 mt-4" style={{ gap: 10 }}>
        <Pressable
          onPress={() => transactionSheet.open()}
          className="flex-1 items-center py-4"
          style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}
        >
          <ArrowUp size={22} color={colors.teal.DEFAULT} weight="bold" />
          <Text
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: 12,
              color: colors.textSecondary.DEFAULT,
              marginTop: 6,
            }}
          >
            Add Income
          </Text>
        </Pressable>
        <Pressable
          onPress={() => transactionSheet.open()}
          className="flex-1 items-center py-4"
          style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}
        >
          <ArrowDown size={22} color={colors.danger.DEFAULT} weight="bold" />
          <Text
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: 12,
              color: colors.textSecondary.DEFAULT,
              marginTop: 6,
            }}
          >
            Add Expense
          </Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('StatementImport')}
          className="flex-1 items-center py-4"
          style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}
        >
          <FileArrowUp size={22} color={colors.blueAccent.DEFAULT} weight="bold" />
          <Text
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: 12,
              color: colors.textSecondary.DEFAULT,
              marginTop: 6,
            }}
          >
            Import
          </Text>
        </Pressable>
      </View>

      {/* 5. Spending Mini Chart */}
      <SpendingMiniChart data={last7DaysData} />

      {/* 6. Top Categories */}
      <TopCategories categories={topCategories} />

      {/* 7. Recent Transactions */}
      <View className="mt-4 mx-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 17,
              color: colors.textPrimary.DEFAULT,
            }}
          >
            Recent Transactions
          </Text>
          <Pressable
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Transactions' })
            }
          >
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: colors.blueAccent.DEFAULT,
              }}
            >
              See all
            </Text>
          </Pressable>
        </View>

        {recentTransactions.length === 0 ? (
          <View
            className="items-center py-8"
            style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}
          >
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: colors.textSecondary.DEFAULT,
              }}
            >
              No transactions yet
            </Text>
            <Pressable onPress={() => transactionSheet.open()} className="mt-3">
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 14,
                  color: colors.blueAccent.DEFAULT,
                }}
              >
                Add your first transaction
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            {recentTransactions.map((txn, idx) => {
              const cat = categoryMap[txn.categoryId];
              const isExpense = txn.transactionType === 'expense';
              return (
                <View
                  key={txn.id}
                  className="flex-row items-center px-4 py-3"
                  style={
                    idx < recentTransactions.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }
                      : undefined
                  }
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: cat ? `${cat.color}15` : '#F0F4F8',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{cat?.icon ?? '💰'}</Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{
                        fontFamily: 'Inter_500Medium',
                        fontSize: 14,
                        color: colors.textPrimary.DEFAULT,
                      }}
                      numberOfLines={1}
                    >
                      {txn.description}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 12,
                        color: colors.textSecondary.DEFAULT,
                        marginTop: 1,
                      }}
                    >
                      {cat?.name ?? 'Uncategorized'} · {formatDateShort(new Date(txn.date))}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: 'DMMono_500Medium',
                      fontSize: 15,
                      color: isExpense
                        ? colors.danger.DEFAULT
                        : colors.teal.DEFAULT,
                    }}
                  >
                    {isExpense ? '-' : '+'}
                    {formatCurrency(txn.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
