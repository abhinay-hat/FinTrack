import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CalendarBlank, NotePencil } from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import { database } from '@/db';
import Transaction, { TransactionType } from '@/models/Transaction';
import Category from '@/models/Category';
import Account from '@/models/Account';
import { createTransaction, updateTransaction } from '@/services/transactionService';
import AmountInput from '@/components/AmountInput';
import TypeToggle from '@/components/TypeToggle';
import CategoryPicker, { CategoryItem } from '@/components/CategoryPicker';
import AccountSelector, { AccountItem } from '@/components/AccountSelector';
import { colors } from '@/theme';
import { formatDate } from '@/utils';

type RouteParams = {
  AddTransaction: {
    transactionId?: string;
  };
};

export default function AddTransactionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'AddTransaction'>>();
  const transactionId = route.params?.transactionId;
  const isEditing = !!transactionId;
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [showNotes, setShowNotes] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load categories
  useEffect(() => {
    const sub = database
      .get<Category>('categories')
      .query()
      .observe()
      .subscribe((cats) => {
        setCategories(
          cats
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color })),
        );
      });
    return () => sub.unsubscribe();
  }, []);

  // Load accounts reactively
  useEffect(() => {
    const sub = database
      .get<Account>('accounts')
      .query()
      .observe()
      .subscribe((accs) => {
        setAccounts(
          accs.map((a) => ({ id: a.id, name: a.name, accountType: a.accountType, balance: a.balance })),
        );
        // Auto-select default account if none selected
        if (!selectedAccountId || !accs.find((a) => a.id === selectedAccountId)) {
          const def = accs.find((a) => a.isDefault) ?? accs[0];
          if (def) setSelectedAccountId(def.id);
        }
      });
    return () => sub.unsubscribe();
  }, [selectedAccountId]);

  // Load existing transaction for editing
  useEffect(() => {
    if (!transactionId) return;

    async function loadTransaction() {
      try {
        const txn = await database.get<Transaction>('transactions').find(transactionId!);
        setAmount(String(txn.amount));
        setTransactionType(txn.transactionType);
        setSelectedCategoryId(txn.categoryId);
        setDescription(txn.description);
        setNotes(txn.notes ?? '');
        setDate(txn.date);
        if (txn.notes) setShowNotes(true);
      } catch (e) {
        console.error('Failed to load transaction:', e);
      }
    }
    loadTransaction();
  }, [transactionId]);

  const handleSave = useCallback(async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    if (!selectedCategoryId) {
      Toast.show({ type: 'error', text1: 'Select a category' });
      return;
    }
    if (!selectedAccountId) {
      Toast.show({ type: 'error', text1: 'No account available' });
      return;
    }

    setSaving(true);
    try {
      const desc = description.trim() || categories.find((c) => c.id === selectedCategoryId)?.name || 'Transaction';

      if (isEditing) {
        await updateTransaction(database, transactionId!, {
          amount: parsedAmount,
          date,
          description: desc,
          transactionType,
          categoryId: selectedCategoryId,
          notes: notes.trim() || undefined,
        });
        Toast.show({ type: 'success', text1: 'Transaction updated' });
      } else {
        await createTransaction(database, {
          amount: parsedAmount,
          date,
          description: desc,
          transactionType,
          categoryId: selectedCategoryId,
          accountId: selectedAccountId,
          notes: notes.trim() || undefined,
        });
        Toast.show({ type: 'success', text1: 'Transaction added' });
      }
      navigation.goBack();
    } catch (e) {
      console.error('Save failed:', e);
      Toast.show({ type: 'error', text1: 'Failed to save transaction' });
    } finally {
      setSaving(false);
    }
  }, [amount, selectedCategoryId, selectedAccountId, description, notes, transactionType, date, isEditing, transactionId, categories, navigation]);

  const handleDateChip = useCallback((offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    setDate(d);
  }, []);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 pb-3 bg-white" style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => navigation.goBack()} className="p-2 -ml-2" hitSlop={8}>
          <ArrowLeft size={24} color={colors.textPrimary.DEFAULT} />
        </Pressable>
        <Text
          className="flex-1 text-center"
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: colors.textPrimary.DEFAULT }}
        >
          {isEditing ? 'Edit Transaction' : 'Add Transaction'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {/* Amount input */}
        <AmountInput value={amount} onChange={setAmount} transactionType={transactionType} />

        {/* Type toggle */}
        <View className="px-4 mb-4">
          <TypeToggle value={transactionType} onChange={setTransactionType} />
        </View>

        {/* Category picker */}
        <View className="mb-4">
          <Text
            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginBottom: 8, marginLeft: 16 }}
          >
            CATEGORY
          </Text>
          <CategoryPicker
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />
        </View>

        {/* Account selector */}
        {accounts.length > 1 && (
          <View className="mb-4">
            <Text
              style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginBottom: 8, marginLeft: 16 }}
            >
              ACCOUNT
            </Text>
            <AccountSelector
              accounts={accounts}
              selectedId={selectedAccountId}
              onSelect={setSelectedAccountId}
            />
          </View>
        )}

        {/* Description */}
        <View className="px-4 mb-4">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor="#94A3B8"
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: colors.textPrimary.DEFAULT,
              backgroundColor: '#F0F4F8',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          />
        </View>

        {/* Date */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center mb-2">
            <CalendarBlank size={16} color="#6B7280" />
            <Text
              style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280', marginLeft: 6 }}
            >
              DATE
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => handleDateChip(0)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor:
                  date.toDateString() === new Date().toDateString() ? colors.navy : '#F0F4F8',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 13,
                  color:
                    date.toDateString() === new Date().toDateString() ? '#FFFFFF' : '#475569',
                }}
              >
                Today
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleDateChip(-1)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor:
                  date.toDateString() === new Date(Date.now() - 86400000).toDateString()
                    ? colors.navy
                    : '#F0F4F8',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 13,
                  color:
                    date.toDateString() === new Date(Date.now() - 86400000).toDateString()
                      ? '#FFFFFF'
                      : '#475569',
                }}
              >
                Yesterday
              </Text>
            </Pressable>
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: '#F0F4F8',
              }}
            >
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#475569' }}>
                {formatDate(date)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes (collapsible) */}
        <View className="px-4 mb-6">
          {showNotes ? (
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: colors.textPrimary.DEFAULT,
                backgroundColor: '#F0F4F8',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
            />
          ) : (
            <Pressable onPress={() => setShowNotes(true)} className="flex-row items-center">
              <NotePencil size={16} color={colors.blueAccent.DEFAULT} />
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 14,
                  color: colors.blueAccent.DEFAULT,
                  marginLeft: 6,
                }}
              >
                Add notes
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Save button */}
      <View className="px-4 pb-6 pt-2 bg-white">
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saving ? '#94A3B8' : colors.navy,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
            {saving ? 'Saving...' : isEditing ? 'Update Transaction' : 'Save Transaction'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
