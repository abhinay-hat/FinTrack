import { View, Text, FlatList, Pressable, TextInput, Alert } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { MagnifyingGlass, FunnelSimple, Plus } from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import { database } from '@/db';
import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import {
  buildTransactionQuery,
  deleteTransaction,
  TransactionFilters,
} from '@/services/transactionService';
import TransactionListItem, { TRANSACTION_ROW_HEIGHT } from '@/components/TransactionListItem';
import DateGroupHeader from '@/components/DateGroupHeader';
import EmptyState from '@/components/EmptyState';
import { getDateGroupLabel, startOfDay } from '@/utils';
import { colors } from '@/theme';

interface TransactionWithCategory {
  transaction: Transaction;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
}

interface ListSection {
  type: 'header' | 'item';
  date?: Date;
  dayTotal?: number;
  data?: TransactionWithCategory;
}

export default function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({});

  // Load categories into a map for quick lookup
  useEffect(() => {
    const sub = database
      .get<Category>('categories')
      .query()
      .observe()
      .subscribe((cats) => {
        const map = new Map<string, Category>();
        cats.forEach((c) => map.set(c.id, c));
        setCategories(map);
      });
    return () => sub.unsubscribe();
  }, []);

  // Reactive transaction query
  useEffect(() => {
    const currentFilters: TransactionFilters = { ...filters };
    if (search.length >= 2) {
      currentFilters.search = search;
    }

    const sub = buildTransactionQuery(database, currentFilters)
      .observe()
      .subscribe((txns) => {
        setTransactions(txns);
      });
    return () => sub.unsubscribe();
  }, [filters, search]);

  // Build date-grouped sections
  const sections = useMemo<ListSection[]>(() => {
    const result: ListSection[] = [];
    let currentDateKey = '';
    let dayTotal = 0;
    let headerIndex = -1;

    for (const txn of transactions) {
      const dateKey = startOfDay(txn.date).toISOString();
      const cat = categories.get(txn.categoryId);

      if (dateKey !== currentDateKey) {
        // Update previous header total
        if (headerIndex >= 0) {
          result[headerIndex].dayTotal = dayTotal;
        }
        currentDateKey = dateKey;
        dayTotal = 0;
        headerIndex = result.length;
        result.push({ type: 'header', date: txn.date, dayTotal: 0 });
      }

      dayTotal += txn.transactionType === 'income' ? txn.amount : -txn.amount;

      result.push({
        type: 'item',
        data: {
          transaction: txn,
          categoryName: cat?.name ?? 'Others',
          categoryColor: cat?.color ?? '#78909C',
          categoryIcon: cat?.icon ?? 'DotsThree',
        },
      });
    }

    // Final header total
    if (headerIndex >= 0) {
      result[headerIndex].dayTotal = dayTotal;
    }

    return result;
  }, [transactions, categories]);

  const handleDelete = useCallback(
    async (id: string) => {
      Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(database, id);
            Toast.show({
              type: 'success',
              text1: 'Transaction deleted',
              visibilityTime: 2000,
            });
          },
        },
      ]);
    },
    [],
  );

  const handlePress = useCallback(
    (id: string) => {
      navigation.navigate('AddTransaction', { transactionId: id });
    },
    [navigation],
  );

  const getItemLayout = useCallback(
    (_data: any, index: number) => {
      const item = sections[index];
      const height = item?.type === 'header' ? 36 : TRANSACTION_ROW_HEIGHT;
      return { length: height, offset: 0, index };
    },
    [sections],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListSection }) => {
      if (item.type === 'header') {
        return <DateGroupHeader date={item.date!} total={item.dayTotal ?? 0} />;
      }

      const { transaction: txn, categoryName, categoryColor, categoryIcon } = item.data!;
      return (
        <TransactionListItem
          id={txn.id}
          description={txn.description}
          amount={txn.amount}
          transactionType={txn.transactionType}
          categoryName={categoryName}
          categoryColor={categoryColor}
          categoryIcon={categoryIcon}
          date={txn.date}
          onPress={handlePress}
          onLongPress={handleDelete}
        />
      );
    },
    [handlePress, handleDelete],
  );

  return (
    <View className="flex-1 bg-background">
      {/* Search & Filter bar */}
      <View className="flex-row items-center px-4 py-2 bg-white">
        {showSearch ? (
          <View className="flex-1 flex-row items-center bg-background rounded-lg px-3 py-2">
            <MagnifyingGlass size={18} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search transactions..."
              placeholderTextColor="#94A3B8"
              autoFocus
              style={{
                flex: 1,
                marginLeft: 8,
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: colors.textPrimary.DEFAULT,
                padding: 0,
              }}
            />
            <Pressable onPress={() => { setShowSearch(false); setSearch(''); }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.blueAccent.DEFAULT }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => setShowSearch(true)}
              className="flex-row items-center flex-1 bg-background rounded-lg px-3 py-2"
            >
              <MagnifyingGlass size={18} color="#94A3B8" />
              <Text
                style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#94A3B8', marginLeft: 8 }}
              >
                Search transactions...
              </Text>
            </Pressable>
            <Pressable className="ml-2 p-2">
              <FunnelSimple size={22} color="#475569" />
            </Pressable>
          </>
        )}
      </View>

      {/* Transaction list */}
      {sections.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          subtitle="Tap + to add your first transaction"
          ctaLabel="Add Transaction"
          onCtaPress={() => navigation.navigate('AddTransaction')}
        />
      ) : (
        <FlatList
          data={sections}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item.type === 'header' ? `header-${index}` : `txn-${item.data!.transaction.id}`
          }
          getItemLayout={getItemLayout}
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={20}
          removeClippedSubviews
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => navigation.navigate('AddTransaction')}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: colors.navy,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Plus size={24} color="#FFFFFF" weight="bold" />
      </Pressable>
    </View>
  );
}
