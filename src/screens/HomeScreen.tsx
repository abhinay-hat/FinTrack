import { View, Text, Pressable, ScrollView, FlatList } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Bank, ArrowUp, ArrowDown, ArrowsLeftRight, CaretRight, FileArrowUp } from 'phosphor-react-native';
import { database } from '@/db';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import { Q } from '@nozbe/watermelondb';
import { formatCurrency } from '@/utils';
import { colors } from '@/theme';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, { name: string; icon: string; color: string }>>({});

  useEffect(() => {
    const accSub = database
      .get<Account>('accounts')
      .query()
      .observe()
      .subscribe(setAccounts);

    const txnSub = database
      .get<Transaction>('transactions')
      .query(Q.sortBy('date', Q.desc), Q.take(5))
      .observe()
      .subscribe(setRecentTransactions);

    const catSub = database
      .get<Category>('categories')
      .query()
      .observe()
      .subscribe((cats) => {
        const map: Record<string, { name: string; icon: string; color: string }> = {};
        cats.forEach((c) => { map[c.id] = { name: c.name, icon: c.icon, color: c.color }; });
        setCategoryMap(map);
      });

    return () => {
      accSub.unsubscribe();
      txnSub.unsubscribe();
      catSub.unsubscribe();
    };
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Balance card */}
      <View
        className="mx-4 mt-4 p-5"
        style={{ backgroundColor: colors.navy, borderRadius: 20 }}
      >
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#94A3B8' }}>
          Total Balance
        </Text>
        <Text
          style={{
            fontFamily: 'DMMono_500Medium',
            fontSize: 32,
            color: '#FFFFFF',
            marginTop: 4,
          }}
        >
          {formatCurrency(totalBalance)}
        </Text>
        <Text
          style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8', marginTop: 4 }}
        >
          {accounts.length} account{accounts.length !== 1 ? 's' : ''}
        </Text>

        <Pressable
          onPress={() => navigation.navigate('Accounts')}
          className="flex-row items-center mt-4"
        >
          <Bank size={16} color="#94A3B8" />
          <Text
            style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#94A3B8', marginLeft: 6, flex: 1 }}
          >
            Manage Accounts
          </Text>
          <CaretRight size={14} color="#94A3B8" />
        </Pressable>
      </View>

      {/* Quick actions */}
      <View className="flex-row mx-4 mt-4 gap-3">
        <Pressable
          onPress={() => navigation.navigate('AddTransaction')}
          className="flex-1 items-center py-4"
          style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}
        >
          <ArrowDown size={22} color={colors.teal.DEFAULT} weight="bold" />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textSecondary.DEFAULT, marginTop: 6 }}>
            Income
          </Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('AddTransaction')}
          className="flex-1 items-center py-4"
          style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}
        >
          <ArrowUp size={22} color={colors.danger.DEFAULT} weight="bold" />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textSecondary.DEFAULT, marginTop: 6 }}>
            Expense
          </Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('StatementImport')}
          className="flex-1 items-center py-4"
          style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}
        >
          <FileArrowUp size={22} color={colors.blueAccent.DEFAULT} weight="bold" />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textSecondary.DEFAULT, marginTop: 6 }}>
            Import
          </Text>
        </Pressable>
      </View>

      {/* Recent transactions */}
      <View className="mt-6 mx-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 17, color: colors.textPrimary.DEFAULT }}>
            Recent Transactions
          </Text>
          <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Transactions' })}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.blueAccent.DEFAULT }}>
              See all
            </Text>
          </Pressable>
        </View>

        {recentTransactions.length === 0 ? (
          <View className="items-center py-8" style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary.DEFAULT }}>
              No transactions yet
            </Text>
            <Pressable onPress={() => navigation.navigate('AddTransaction')} className="mt-3">
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.blueAccent.DEFAULT }}>
                Add your first transaction
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden' }}>
            {recentTransactions.map((txn, idx) => {
              const cat = categoryMap[txn.categoryId];
              const isExpense = txn.transactionType === 'expense';
              return (
                <View
                  key={txn.id}
                  className="flex-row items-center px-4 py-3"
                  style={idx < recentTransactions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' } : undefined}
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
                      style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textPrimary.DEFAULT }}
                      numberOfLines={1}
                    >
                      {txn.description}
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary.DEFAULT, marginTop: 1 }}>
                      {cat?.name ?? 'Uncategorized'}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: 'DMMono_500Medium',
                      fontSize: 15,
                      color: isExpense ? colors.danger.DEFAULT : colors.teal.DEFAULT,
                    }}
                  >
                    {isExpense ? '-' : '+'}{formatCurrency(txn.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
