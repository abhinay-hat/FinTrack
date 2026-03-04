import { View, Text, Pressable, TextInput, Platform, ScrollView } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState, createContext, useContext } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { CalendarBlank, X } from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import { database } from '@/db';
import Transaction, { TransactionType } from '@/models/Transaction';
import Category from '@/models/Category';
import Account from '@/models/Account';
import { createTransaction, updateTransaction } from '@/services/transactionService';
import TypeToggle from '@/components/TypeToggle';
import CategoryGrid, { type CategoryGridItem } from '@/components/CategoryGrid';
import QuickAmountChips from '@/components/QuickAmountChips';
import AccountSelector, { type AccountItem } from '@/components/AccountSelector';
import { colors } from '@/theme';
import { formatDate } from '@/utils';

// --- Bottom Sheet Ref Context ---

export interface TransactionSheetRef {
  open: (transactionId?: string) => void;
  close: () => void;
}

const TransactionSheetContext = createContext<TransactionSheetRef | null>(null);

export function useTransactionSheet(): TransactionSheetRef {
  const ref = useContext(TransactionSheetContext);
  if (!ref) {
    throw new Error('useTransactionSheet must be used within TransactionSheetProvider');
  }
  return ref;
}

export { TransactionSheetContext };

// --- Main Bottom Sheet Component ---

type RouteParams = {
  AddTransaction: {
    transactionId?: string;
  };
};

interface TransactionBottomSheetProps {
  /** When used as a standalone screen, pass transactionId for edit mode */
  transactionId?: string;
  /** When used as bottom sheet, this controls visibility */
  sheetRef?: React.RefObject<BottomSheet | null>;
  onDismiss?: () => void;
}

function TransactionForm({
  transactionId,
  onClose,
}: {
  transactionId?: string;
  onClose: () => void;
}) {
  const isEditing = !!transactionId;
  const amountInputRef = useRef<TextInput>(null);

  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [categories, setCategories] = useState<CategoryGridItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-focus amount
  useEffect(() => {
    const timer = setTimeout(() => amountInputRef.current?.focus(), 400);
    return () => clearTimeout(timer);
  }, []);

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

  // Load accounts
  useEffect(() => {
    const sub = database
      .get<Account>('accounts')
      .query()
      .observe()
      .subscribe((accs) => {
        setAccounts(
          accs.map((a) => ({
            id: a.id,
            name: a.name,
            accountType: a.accountType,
            balance: a.balance,
          })),
        );
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
        setSelectedAccountId(txn.accountId);
      } catch (e) {
        console.error('Failed to load transaction:', e);
      }
    }
    loadTransaction();
  }, [transactionId]);

  const handleAmountChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
  }, []);

  const handleDateChip = useCallback((offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    setDate(d);
  }, []);

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
      const desc =
        description.trim() ||
        categories.find((c) => c.id === selectedCategoryId)?.name ||
        'Transaction';

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
      onClose();
    } catch (e) {
      console.error('Save failed:', e);
      Toast.show({ type: 'error', text1: 'Failed to save transaction' });
    } finally {
      setSaving(false);
    }
  }, [
    amount,
    selectedCategoryId,
    selectedAccountId,
    description,
    notes,
    transactionType,
    date,
    isEditing,
    transactionId,
    categories,
    onClose,
  ]);

  const amountColor =
    transactionType === 'income' ? colors.teal.DEFAULT : colors.danger.DEFAULT;
  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
  const dateStr = date.toDateString();

  return (
    <>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-2">
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 18,
            color: colors.textPrimary.DEFAULT,
          }}
        >
          {isEditing ? 'Edit Transaction' : 'Add Transaction'}
        </Text>
        <Pressable onPress={onClose} hitSlop={8} className="p-1">
          <X size={22} color={colors.textSecondary.DEFAULT} />
        </Pressable>
      </View>

      {/* Amount Input */}
      <View className="items-center py-4">
        <View className="flex-row items-baseline">
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 28,
              color: amountColor,
              marginRight: 4,
            }}
          >
            {'\u20B9'}
          </Text>
          <TextInput
            ref={amountInputRef}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0"
            placeholderTextColor="#CBD5E1"
            keyboardType="decimal-pad"
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 28,
              color: amountColor,
              minWidth: 80,
              textAlign: 'center',
              padding: 0,
            }}
          />
        </View>
        <QuickAmountChips onSelect={(val) => setAmount(String(val))} />
      </View>

      {/* Type Toggle */}
      <View className="px-4 mb-4">
        <TypeToggle value={transactionType} onChange={setTransactionType} />
      </View>

      {/* Category Grid */}
      <View className="mb-4">
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 13,
            color: '#6B7280',
            marginBottom: 8,
            marginLeft: 16,
          }}
        >
          CATEGORY
        </Text>
        <CategoryGrid
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />
      </View>

      {/* Date */}
      <View className="px-4 mb-4">
        <View className="flex-row items-center mb-2">
          <CalendarBlank size={16} color="#6B7280" />
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 13,
              color: '#6B7280',
              marginLeft: 6,
            }}
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
              backgroundColor: dateStr === todayStr ? colors.navy : '#F0F4F8',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: dateStr === todayStr ? '#FFFFFF' : '#475569',
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
              backgroundColor: dateStr === yesterdayStr ? colors.navy : '#F0F4F8',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: dateStr === yesterdayStr ? '#FFFFFF' : '#475569',
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

      {/* Account Selector */}
      {accounts.length > 1 && (
        <View className="mb-4">
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 13,
              color: '#6B7280',
              marginBottom: 8,
              marginLeft: 16,
            }}
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

      {/* Description / Notes */}
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

      <View className="px-4 mb-6">
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={2}
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 14,
            color: colors.textPrimary.DEFAULT,
            backgroundColor: '#F0F4F8',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            minHeight: 56,
            textAlignVertical: 'top',
          }}
        />
      </View>

      {/* Save button */}
      <View className="px-4 pb-6">
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
    </>
  );
}

// --- Bottom Sheet wrapper (used from HomeScreen via provider) ---

export function TransactionBottomSheet({
  sheetRef,
}: {
  sheetRef: React.RefObject<BottomSheet | null>;
}) {
  const snapPoints = useMemo(() => ['50%', '90%'], []);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
    ),
    [],
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.close();
    setEditingId(undefined);
  }, [sheetRef]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: '#CBD5E1', width: 40 }}
      backgroundStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      keyboardBehavior={Platform.OS === 'android' ? 'interactive' : 'extend'}
      keyboardBlurBehavior="restore"
      onChange={(index) => {
        if (index === -1) {
          setEditingId(undefined);
        }
      }}
    >
      <BottomSheetScrollView keyboardShouldPersistTaps="handled">
        <TransactionForm transactionId={editingId} onClose={handleClose} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

// --- Provider that wraps the bottom sheet and exposes open/close ---

export function TransactionSheetProvider({ children }: { children: React.ReactNode }) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  const api = useMemo<TransactionSheetRef>(
    () => ({
      open: (transactionId?: string) => {
        setEditingId(transactionId);
        bottomSheetRef.current?.snapToIndex(0);
      },
      close: () => {
        bottomSheetRef.current?.close();
        setEditingId(undefined);
      },
    }),
    [],
  );

  const snapPoints = useMemo(() => ['50%', '90%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
    ),
    [],
  );

  return (
    <TransactionSheetContext.Provider value={api}>
      {children}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#CBD5E1', width: 40 }}
        backgroundStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
        keyboardBehavior={Platform.OS === 'android' ? 'interactive' : 'extend'}
        keyboardBlurBehavior="restore"
        onChange={(index) => {
          if (index === -1) {
            setEditingId(undefined);
          }
        }}
      >
        <BottomSheetScrollView keyboardShouldPersistTaps="handled">
          <TransactionForm transactionId={editingId} onClose={api.close} />
        </BottomSheetScrollView>
      </BottomSheet>
    </TransactionSheetContext.Provider>
  );
}

// --- Screen wrapper (for stack navigation with edit mode) ---

export default function AddTransactionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'AddTransaction'>>();
  const transactionId = route.params?.transactionId;
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['90%'], []);

  useEffect(() => {
    // Open the sheet immediately when the screen mounts
    setTimeout(() => bottomSheetRef.current?.snapToIndex(0), 100);
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#CBD5E1', width: 40 }}
        backgroundStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
        keyboardBehavior={Platform.OS === 'android' ? 'interactive' : 'extend'}
        keyboardBlurBehavior="restore"
        onClose={handleClose}
      >
        <BottomSheetScrollView keyboardShouldPersistTaps="handled">
          <TransactionForm transactionId={transactionId} onClose={handleClose} />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
