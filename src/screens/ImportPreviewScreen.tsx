import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft, ArrowDown, ArrowUp, CheckCircle } from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import { database } from '@/db';
import Account from '@/models/Account';
import AccountSelector, { AccountItem } from '@/components/AccountSelector';
import { importTransactions, getImportFallbackCategoryId } from '@/services/import';
import type { ParsedTransaction } from '@/services/import';
import { formatCurrency } from '@/utils';
import { colors } from '@/theme';
import { useOnboardingStore } from '@/stores';

type RouteParams = {
  ImportPreview: { transactions: string };
};

export default function ImportPreviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ImportPreview'>>();
  const markFirstStatementImported = useOnboardingStore((s) => s.markFirstStatementImported);

  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(route.params.transactions) as ParsedTransaction[];
      // Restore Date objects from JSON
      const restored = parsed.map((t) => ({ ...t, date: new Date(t.date) }));
      setTransactions(restored);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load transactions' });
    }
  }, [route.params.transactions]);

  useEffect(() => {
    const sub = database
      .get<Account>('accounts')
      .query()
      .observe()
      .subscribe((accs) => {
        setAccounts(accs.map((a) => ({ id: a.id, name: a.name, accountType: a.accountType, balance: a.balance })));
        if (!selectedAccountId) {
          const def = accs.find((a) => a.isDefault) ?? accs[0];
          if (def) setSelectedAccountId(def.id);
        }
      });
    return () => sub.unsubscribe();
  }, [selectedAccountId]);

  const incomeCount = transactions.filter((t) => t.type === 'income').length;
  const expenseCount = transactions.filter((t) => t.type === 'expense').length;
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleImport = useCallback(async () => {
    if (!selectedAccountId) {
      Toast.show({ type: 'error', text1: 'Select an account' });
      return;
    }

    setImporting(true);
    try {
      const fallbackCategoryId = await getImportFallbackCategoryId(database);
      const result = await importTransactions(database, transactions, selectedAccountId, fallbackCategoryId);
      setImportResult({ imported: result.imported, skipped: result.skipped });
      setDone(true);
      markFirstStatementImported();
      Toast.show({ type: 'success', text1: `${result.imported} transactions imported` });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Import failed', text2: e.message });
    } finally {
      setImporting(false);
    }
  }, [selectedAccountId, transactions, markFirstStatementImported]);

  const renderTransaction = useCallback(({ item }: { item: ParsedTransaction }) => {
    const isExpense = item.type === 'expense';
    return (
      <View className="flex-row items-center px-4 py-3 bg-white mb-px">
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: isExpense ? '#D32F2F15' : '#00897B15',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          {isExpense
            ? <ArrowUp size={18} color={colors.danger.DEFAULT} weight="bold" />
            : <ArrowDown size={18} color={colors.teal.DEFAULT} weight="bold" />
          }
        </View>
        <View className="flex-1 mr-3">
          <Text
            style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textPrimary.DEFAULT }}
            numberOfLines={1}
          >
            {item.description}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
            {item.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: 'DMMono_500Medium',
            fontSize: 14,
            color: isExpense ? colors.danger.DEFAULT : colors.teal.DEFAULT,
          }}
        >
          {isExpense ? '-' : '+'}{formatCurrency(item.amount)}
        </Text>
      </View>
    );
  }, []);

  if (done && importResult) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <CheckCircle size={64} color={colors.teal.DEFAULT} weight="duotone" />
        <Text
          style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: colors.textPrimary.DEFAULT, marginTop: 20 }}
        >
          Import Complete
        </Text>
        <Text
          style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.textSecondary.DEFAULT, marginTop: 8, textAlign: 'center' }}
        >
          {importResult.imported} transactions imported
          {importResult.skipped > 0 ? `, ${importResult.skipped} skipped` : ''}
        </Text>
        <Pressable
          onPress={() => navigation.popToTop()}
          style={{
            backgroundColor: colors.navy,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 14,
            marginTop: 32,
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
            Done
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-3 bg-white">
        <Pressable onPress={() => navigation.goBack()} className="p-2 -ml-2" hitSlop={8}>
          <ArrowLeft size={24} color={colors.textPrimary.DEFAULT} />
        </Pressable>
        <Text
          className="flex-1 text-center"
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: colors.textPrimary.DEFAULT }}
        >
          Preview Import
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary cards */}
      <View className="flex-row mx-4 mt-3 gap-3">
        <View className="flex-1 p-3" style={{ backgroundColor: '#FFFFFF', borderRadius: 12 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8' }}>Income</Text>
          <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 16, color: colors.teal.DEFAULT, marginTop: 2 }}>
            {formatCurrency(totalIncome)}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
            {incomeCount} transactions
          </Text>
        </View>
        <View className="flex-1 p-3" style={{ backgroundColor: '#FFFFFF', borderRadius: 12 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8' }}>Expense</Text>
          <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 16, color: colors.danger.DEFAULT, marginTop: 2 }}>
            {formatCurrency(totalExpense)}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
            {expenseCount} transactions
          </Text>
        </View>
      </View>

      {/* Account selector */}
      <View className="mt-4 mb-2">
        <Text
          style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginBottom: 8, marginLeft: 16 }}
        >
          IMPORT TO ACCOUNT
        </Text>
        <AccountSelector accounts={accounts} selectedId={selectedAccountId} onSelect={setSelectedAccountId} />
      </View>

      {/* Transaction list */}
      <Text
        style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginLeft: 16, marginTop: 8, marginBottom: 8 }}
      >
        {transactions.length} TRANSACTIONS
      </Text>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(_, idx) => String(idx)}
        className="flex-1"
      />

      {/* Import button */}
      <View className="px-4 pb-6 pt-2 bg-white">
        <Pressable
          onPress={handleImport}
          disabled={importing}
          style={{
            backgroundColor: importing ? '#94A3B8' : colors.navy,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          {importing && <ActivityIndicator color="#FFFFFF" style={{ marginRight: 8 }} />}
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
            {importing ? 'Importing...' : `Import ${transactions.length} Transactions`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
