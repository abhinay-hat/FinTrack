import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  CheckSquare,
  Square,
  Warning,
  PencilSimple,
  CalendarBlank,
  X,
} from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import { database } from '@/db';
import { Q } from '@nozbe/watermelondb';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import AccountSelector, { AccountItem } from '@/components/AccountSelector';
import { importTransactions, getImportFallbackCategoryId } from '@/services/import';
import type { ParsedTransaction } from '@/services/import';
import { formatCurrency } from '@/utils';
import { colors } from '@/theme';
import { useOnboardingStore } from '@/stores';

type RouteParams = {
  ImportPreview: { transactions: string };
};

interface SelectableTransaction extends ParsedTransaction {
  selected: boolean;
  isDuplicate: boolean;
  editedDescription?: string;
  editedAmount?: number;
  confidence: 'high' | 'medium' | 'low';
}

const CONFIDENCE_COLORS = {
  high: '#00897B',
  medium: '#F57C00',
  low: '#D32F2F',
};

function getTransactionConfidence(t: ParsedTransaction): 'high' | 'medium' | 'low' {
  let score = 0;
  if (t.description && t.description !== 'Imported transaction') score++;
  if (t.amount > 0) score++;
  if (t.date && !isNaN(t.date.getTime())) score++;
  if (t.balance != null) score++;
  if (score >= 3) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

export default function ImportPreviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ImportPreview'>>();
  const insets = useSafeAreaInsets();
  const markFirstStatementImported = useOnboardingStore((s) => s.markFirstStatementImported);

  const [transactions, setTransactions] = useState<SelectableTransaction[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [done, setDone] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Edit modal state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');

  useEffect(() => {
    try {
      const parsed = JSON.parse(route.params.transactions) as ParsedTransaction[];
      const restored: SelectableTransaction[] = parsed.map((t) => ({
        ...t,
        date: new Date(t.date),
        selected: true,
        isDuplicate: false,
        confidence: getTransactionConfidence({ ...t, date: new Date(t.date) }),
      }));
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

  // Check for duplicates when account is selected
  useEffect(() => {
    if (!selectedAccountId || transactions.length === 0) return;

    let cancelled = false;
    const checkDuplicates = async () => {
      setCheckingDuplicates(true);
      try {
        const existingTxns = await database
          .get<Transaction>('transactions')
          .query(Q.where('account_id', selectedAccountId))
          .fetch();

        if (cancelled) return;

        const existingSet = new Set(
          existingTxns.map((t) => {
            const d = t.date instanceof Date ? t.date : new Date(t.date);
            return `${d.toISOString().slice(0, 10)}|${t.amount}|${t.description.toLowerCase().trim()}`;
          }),
        );

        setTransactions((prev) =>
          prev.map((t) => {
            const d = t.date instanceof Date ? t.date : new Date(t.date);
            const key = `${d.toISOString().slice(0, 10)}|${t.editedAmount ?? t.amount}|${(t.editedDescription ?? t.description).toLowerCase().trim()}`;
            const isDuplicate = existingSet.has(key);
            return {
              ...t,
              isDuplicate,
              selected: isDuplicate ? false : t.selected,
            };
          }),
        );
      } catch {
        // Silently fail — duplicates just won't be detected
      } finally {
        if (!cancelled) setCheckingDuplicates(false);
      }
    };

    checkDuplicates();
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, transactions.length]);

  const selectedTransactions = useMemo(
    () => transactions.filter((t) => t.selected),
    [transactions],
  );

  const stats = useMemo(() => {
    const selected = selectedTransactions;
    const income = selected.filter((t) => t.type === 'income');
    const expense = selected.filter((t) => t.type === 'expense');
    const totalIncome = income.reduce((s, t) => s + (t.editedAmount ?? t.amount), 0);
    const totalExpense = expense.reduce((s, t) => s + (t.editedAmount ?? t.amount), 0);
    const duplicateCount = transactions.filter((t) => t.isDuplicate).length;

    // Date range
    const dates = selected.map((t) => t.date.getTime()).filter((d) => !isNaN(d));
    const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

    return {
      totalCount: transactions.length,
      selectedCount: selected.length,
      incomeCount: income.length,
      expenseCount: expense.length,
      totalIncome,
      totalExpense,
      duplicateCount,
      minDate,
      maxDate,
    };
  }, [transactions, selectedTransactions]);

  const allSelected = transactions.length > 0 && transactions.every((t) => t.selected);

  const toggleSelectAll = useCallback(() => {
    const newVal = !allSelected;
    setTransactions((prev) => prev.map((t) => ({ ...t, selected: newVal })));
  }, [allSelected]);

  const toggleTransaction = useCallback((index: number) => {
    setTransactions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return updated;
    });
  }, []);

  const openEdit = useCallback((index: number) => {
    const t = transactions[index];
    setEditingIndex(index);
    setEditDescription(t.editedDescription ?? t.description);
    setEditAmount(String(t.editedAmount ?? t.amount));
  }, [transactions]);

  const saveEdit = useCallback(() => {
    if (editingIndex === null) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    setTransactions((prev) => {
      const updated = [...prev];
      updated[editingIndex] = {
        ...updated[editingIndex],
        editedDescription: editDescription.trim() || updated[editingIndex].description,
        editedAmount: amt,
      };
      return updated;
    });
    setEditingIndex(null);
  }, [editingIndex, editDescription, editAmount]);

  const handleImport = useCallback(async () => {
    if (!selectedAccountId) {
      Toast.show({ type: 'error', text1: 'Select an account' });
      return;
    }

    const toImport = selectedTransactions.map((t) => ({
      ...t,
      description: t.editedDescription ?? t.description,
      amount: t.editedAmount ?? t.amount,
    }));

    if (toImport.length === 0) {
      Toast.show({ type: 'error', text1: 'No transactions selected' });
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: toImport.length });

    try {
      const fallbackCategoryId = await getImportFallbackCategoryId(database);

      // Import in chunks and track progress
      const CHUNK_SIZE = 50;
      let imported = 0;
      let skipped = 0;

      for (let i = 0; i < toImport.length; i += CHUNK_SIZE) {
        const chunk = toImport.slice(i, i + CHUNK_SIZE);
        try {
          await database.write(async () => {
            const collection = database.get<Transaction>('transactions');
            for (const txn of chunk) {
              try {
                await collection.create((r) => {
                  r.amount = txn.amount;
                  r.date = txn.date;
                  r.description = txn.description;
                  r.transactionType = txn.type;
                  r.categoryId = fallbackCategoryId;
                  r.accountId = selectedAccountId;
                  r.importSource = 'csv';
                  r.isRecurring = false;
                  r.notes = null;
                });
                imported++;
              } catch {
                skipped++;
              }
            }
          });
        } catch {
          skipped += chunk.length;
        }
        setImportProgress({ current: Math.min(i + CHUNK_SIZE, toImport.length), total: toImport.length });
      }

      const totalSkipped = skipped + (transactions.length - toImport.length);
      setImportResult({ imported, skipped: totalSkipped });
      setDone(true);
      markFirstStatementImported();
      Toast.show({ type: 'success', text1: `${imported} transactions imported` });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Import failed', text2: e.message });
    } finally {
      setImporting(false);
    }
  }, [selectedAccountId, selectedTransactions, transactions.length, markFirstStatementImported]);

  const formatDateRange = () => {
    if (!stats.minDate || !stats.maxDate) return '';
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    if (stats.minDate.getTime() === stats.maxDate.getTime()) return fmt(stats.minDate);
    return `${fmt(stats.minDate)} - ${fmt(stats.maxDate)}`;
  };

  const renderTransaction = useCallback(({ item, index }: { item: SelectableTransaction; index: number }) => {
    const isExpense = item.type === 'expense';
    const displayAmount = item.editedAmount ?? item.amount;
    const displayDesc = item.editedDescription ?? item.description;
    const confColor = CONFIDENCE_COLORS[item.confidence];

    return (
      <Pressable
        onPress={() => toggleTransaction(index)}
        className="flex-row items-center px-4 py-3 mb-px"
        style={{
          backgroundColor: item.isDuplicate ? '#FFF8E1' : '#FFFFFF',
        }}
      >
        {/* Checkbox */}
        <Pressable onPress={() => toggleTransaction(index)} hitSlop={8} style={{ marginRight: 10 }}>
          {item.selected ? (
            <CheckSquare size={22} color={colors.navy} weight="fill" />
          ) : (
            <Square size={22} color="#CBD5E1" />
          )}
        </Pressable>

        {/* Confidence dot */}
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: confColor,
            marginRight: 10,
          }}
        />

        {/* Icon */}
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: isExpense ? '#D32F2F15' : '#00897B15',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          {isExpense
            ? <ArrowUp size={18} color={colors.danger.DEFAULT} weight="bold" />
            : <ArrowDown size={18} color={colors.teal.DEFAULT} weight="bold" />
          }
        </View>

        {/* Description + date */}
        <View className="flex-1 mr-2">
          <View className="flex-row items-center">
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: item.isDuplicate ? '#9E9E9E' : colors.textPrimary.DEFAULT,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {displayDesc}
            </Text>
            {item.isDuplicate && (
              <Warning size={14} color={colors.amber} weight="fill" style={{ marginLeft: 4 }} />
            )}
          </View>
          <View className="flex-row items-center mt-1">
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8' }}>
              {item.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            {item.isDuplicate && (
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.amber, marginLeft: 6 }}>
                Possible duplicate
              </Text>
            )}
          </View>
        </View>

        {/* Amount */}
        <Text
          style={{
            fontFamily: 'DMMono_500Medium',
            fontSize: 14,
            color: item.isDuplicate
              ? '#9E9E9E'
              : isExpense
              ? colors.danger.DEFAULT
              : colors.teal.DEFAULT,
          }}
        >
          {isExpense ? '-' : '+'}{formatCurrency(displayAmount)}
        </Text>

        {/* Edit button */}
        <Pressable onPress={() => openEdit(index)} hitSlop={8} style={{ marginLeft: 8, padding: 4 }}>
          <PencilSimple size={16} color="#94A3B8" />
        </Pressable>
      </Pressable>
    );
  }, [toggleTransaction, openEdit]);

  // Import progress screen
  if (importing) {
    const progress = importProgress.total > 0 ? importProgress.current / importProgress.total : 0;
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <ActivityIndicator size="large" color={colors.navy} />
        <Text
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: colors.textPrimary.DEFAULT, marginTop: 24 }}
        >
          Importing...
        </Text>
        <Text
          style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary.DEFAULT, marginTop: 8 }}
        >
          {importProgress.current} of {importProgress.total} transactions
        </Text>
        {/* Progress bar */}
        <View
          style={{
            width: '100%',
            height: 6,
            backgroundColor: '#E2E8F0',
            borderRadius: 3,
            marginTop: 20,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: '100%',
              backgroundColor: colors.navy,
              borderRadius: 3,
            }}
          />
        </View>
      </View>
    );
  }

  // Success screen
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

        <View className="flex-row gap-3 mt-8">
          <Pressable
            onPress={() => navigation.popToTop()}
            style={{
              backgroundColor: '#F0F4F8',
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 14,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.textSecondary.DEFAULT }}>
              Home
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              navigation.popToTop();
              // Navigate to transactions tab
            }}
            style={{
              backgroundColor: colors.navy,
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 14,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
              View Transactions
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 pb-3 bg-white" style={{ paddingTop: insets.top + 8 }}>
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

      {/* Summary header card */}
      <View className="mx-4 mt-3 p-4" style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}>
        <View className="flex-row items-center justify-between mb-3">
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary.DEFAULT }}>
            {stats.totalCount} Transactions
          </Text>
          {stats.minDate && (
            <View className="flex-row items-center">
              <CalendarBlank size={14} color="#94A3B8" style={{ marginRight: 4 }} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#94A3B8' }}>
                {formatDateRange()}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1 p-3" style={{ backgroundColor: '#00897B08', borderRadius: 10 }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8' }}>Income</Text>
            <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 15, color: colors.teal.DEFAULT, marginTop: 2 }}>
              {formatCurrency(stats.totalIncome)}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
              {stats.incomeCount} transactions
            </Text>
          </View>
          <View className="flex-1 p-3" style={{ backgroundColor: '#D32F2F08', borderRadius: 10 }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8' }}>Expense</Text>
            <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 15, color: colors.danger.DEFAULT, marginTop: 2 }}>
              {formatCurrency(stats.totalExpense)}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
              {stats.expenseCount} transactions
            </Text>
          </View>
        </View>
        {stats.duplicateCount > 0 && (
          <View
            className="flex-row items-center mt-3 p-2"
            style={{ backgroundColor: '#FFF8E1', borderRadius: 8 }}
          >
            <Warning size={16} color={colors.amber} weight="fill" />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#F57C00', marginLeft: 6 }}>
              {stats.duplicateCount} possible duplicate{stats.duplicateCount > 1 ? 's' : ''} detected (deselected)
            </Text>
          </View>
        )}
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

      {/* Transaction list header with select all */}
      <View className="flex-row items-center justify-between px-4 mt-2 mb-2">
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280' }}>
          {stats.selectedCount} OF {stats.totalCount} SELECTED
        </Text>
        <Pressable onPress={toggleSelectAll} className="flex-row items-center" hitSlop={8}>
          {allSelected ? (
            <CheckSquare size={18} color={colors.navy} weight="fill" />
          ) : (
            <Square size={18} color="#94A3B8" />
          )}
          <Text
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: 12,
              color: allSelected ? colors.navy : '#94A3B8',
              marginLeft: 4,
            }}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </Text>
        </Pressable>
      </View>

      {/* Duplicate check indicator */}
      {checkingDuplicates && (
        <View className="flex-row items-center px-4 mb-2">
          <ActivityIndicator size="small" color={colors.amber} />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginLeft: 6 }}>
            Checking for duplicates...
          </Text>
        </View>
      )}

      {/* Transaction list */}
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(_, idx) => String(idx)}
        className="flex-1"
        initialNumToRender={20}
      />

      {/* Bottom action bar */}
      <View className="px-4 pb-6 pt-3 bg-white" style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
        <Pressable
          onPress={handleImport}
          disabled={stats.selectedCount === 0}
          style={{
            backgroundColor: stats.selectedCount === 0 ? '#94A3B8' : colors.navy,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
            {stats.selectedCount === 0
              ? 'No Transactions Selected'
              : `Import ${stats.selectedCount} Transaction${stats.selectedCount > 1 ? 's' : ''}`}
          </Text>
        </Pressable>
      </View>

      {/* Edit transaction modal */}
      <Modal visible={editingIndex !== null} transparent animationType="slide">
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setEditingIndex(null)}
        >
          <Pressable
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: insets.bottom + 24,
            }}
            onPress={() => {}}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 17, color: colors.textPrimary.DEFAULT }}
              >
                Edit Transaction
              </Text>
              <Pressable onPress={() => setEditingIndex(null)} hitSlop={8}>
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#6B7280', marginBottom: 6 }}>
              Description
            </Text>
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Transaction description"
              placeholderTextColor="#94A3B8"
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 15,
                color: colors.textPrimary.DEFAULT,
                backgroundColor: '#F0F4F8',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginBottom: 16,
              }}
            />

            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#6B7280', marginBottom: 6 }}>
              Amount
            </Text>
            <TextInput
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 18,
                color: colors.textPrimary.DEFAULT,
                backgroundColor: '#F0F4F8',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginBottom: 24,
              }}
            />

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setEditingIndex(null)}
                className="flex-1 items-center py-4"
                style={{ borderRadius: 14, backgroundColor: '#F0F4F8' }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.textSecondary.DEFAULT }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={saveEdit}
                className="flex-1 items-center py-4"
                style={{ borderRadius: 14, backgroundColor: colors.navy }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
                  Save
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
