import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash } from 'phosphor-react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useRef } from 'react';
import Toast from 'react-native-toast-message';
import { database } from '@/db';
import Category from '@/models/Category';
import { colors } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import {
  getMonthlyBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getCategoriesWithoutBudget,
  type BudgetWithProgress,
} from '@/services/budgetService';
import BudgetProgressRing from '@/components/BudgetProgressRing';
import BudgetCategoryCard from '@/components/BudgetCategoryCard';
import CategoryGrid, { type CategoryGridItem } from '@/components/CategoryGrid';
import EmptyState from '@/components/EmptyState';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthOptions(): { label: string; value: string }[] {
  const now = new Date();
  const options: { label: string; value: string }[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    options.push({ label, value });
  }
  return options;
}

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [budgets, setBudgets] = useState<BudgetWithProgress[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const monthOptions = useMemo(getMonthOptions, []);

  // Bottom sheet form state
  const [editingBudget, setEditingBudget] = useState<BudgetWithProgress | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const loadBudgets = useCallback(async () => {
    const data = await getMonthlyBudgets(database, selectedMonth);
    setBudgets(data);
  }, [selectedMonth]);

  const loadAvailableCategories = useCallback(async () => {
    const cats = await getCategoriesWithoutBudget(database, selectedMonth);
    setAvailableCategories(cats);
  }, [selectedMonth]);

  useEffect(() => {
    loadBudgets();
    loadAvailableCategories();
  }, [loadBudgets, loadAvailableCategories]);

  // Totals for the ring
  const totalSpent = useMemo(() => budgets.reduce((s, b) => s + b.spentAmount, 0), [budgets]);
  const totalLimit = useMemo(() => budgets.reduce((s, b) => s + b.limitAmount, 0), [budgets]);

  const categoryGridItems: CategoryGridItem[] = useMemo(
    () =>
      availableCategories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
      })),
    [availableCategories],
  );

  // Open bottom sheet for adding
  const handleAdd = useCallback(() => {
    setEditingBudget(null);
    setSelectedCategoryId(null);
    setAmountText('');
    setIsSheetOpen(true);
    bottomSheetRef.current?.expand();
  }, []);

  // Open bottom sheet for editing
  const handleEdit = useCallback((budget: BudgetWithProgress) => {
    setEditingBudget(budget);
    setSelectedCategoryId(budget.categoryId);
    setAmountText(String(budget.limitAmount));
    setIsSheetOpen(true);
    bottomSheetRef.current?.expand();
  }, []);

  const handleSave = useCallback(async () => {
    const amount = parseFloat(amountText);
    if (!amount || amount <= 0) {
      Toast.show({ type: 'error', text1: 'Please enter a valid amount' });
      return;
    }

    if (editingBudget) {
      await updateBudget(database, editingBudget.id, amount);
      Toast.show({ type: 'success', text1: 'Budget updated' });
    } else {
      if (!selectedCategoryId) {
        Toast.show({ type: 'error', text1: 'Please select a category' });
        return;
      }
      await createBudget(database, selectedCategoryId, selectedMonth, amount);
      Toast.show({ type: 'success', text1: 'Budget created' });
    }

    bottomSheetRef.current?.close();
    setIsSheetOpen(false);
    loadBudgets();
    loadAvailableCategories();
  }, [amountText, editingBudget, selectedCategoryId, selectedMonth, loadBudgets, loadAvailableCategories]);

  const handleDelete = useCallback(() => {
    if (!editingBudget) return;
    Alert.alert('Delete Budget', `Remove budget for ${editingBudget.categoryName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteBudget(database, editingBudget.id);
          bottomSheetRef.current?.close();
          setIsSheetOpen(false);
          Toast.show({ type: 'success', text1: 'Budget deleted' });
          loadBudgets();
          loadAvailableCategories();
        },
      },
    ]);
  }, [editingBudget, loadBudgets, loadAvailableCategories]);

  const handleAmountChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmountText(cleaned);
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
    ),
    [],
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 18,
            color: colors.textPrimary.DEFAULT,
          }}
        >
          Budget
        </Text>
        <Pressable
          onPress={handleAdd}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.navy,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={18} color="#FFFFFF" weight="bold" />
        </Pressable>
      </View>

      {/* Month Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}
      >
        {monthOptions.map((opt) => {
          const isSelected = opt.value === selectedMonth;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setSelectedMonth(opt.value)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: isSelected ? colors.navy : colors.surface.DEFAULT,
              }}
            >
              <Text
                style={{
                  fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  fontSize: 13,
                  color: isSelected ? '#FFFFFF' : colors.textSecondary.DEFAULT,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {budgets.length === 0 ? (
        <EmptyState
          title="No budgets set"
          subtitle="Tap + to create your first budget"
          ctaLabel="Add Budget"
          onCtaPress={handleAdd}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Overall Progress Ring */}
          <BudgetProgressRing spent={totalSpent} limit={totalLimit} />

          {/* Category Budget Cards */}
          <View style={{ marginTop: 8 }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 15,
                color: colors.textPrimary.DEFAULT,
                paddingHorizontal: 16,
                marginBottom: 10,
              }}
            >
              Category Budgets
            </Text>
            {budgets.map((b) => (
              <BudgetCategoryCard key={b.id} budget={b} onPress={handleEdit} />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Add/Edit Budget Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={editingBudget ? ['45%'] : ['65%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onClose={() => setIsSheetOpen(false)}
        backgroundStyle={{ borderRadius: 20, backgroundColor: colors.surface.DEFAULT }}
        handleIndicatorStyle={{ backgroundColor: '#CBD5E1', width: 40 }}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 20 }}>
          {/* Sheet Title */}
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 17,
              color: colors.textPrimary.DEFAULT,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            {editingBudget ? 'Edit Budget' : 'Add Budget'}
          </Text>

          {/* Category selector (only for add) */}
          {!editingBudget && (
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 13,
                  color: colors.textSecondary.DEFAULT,
                  marginBottom: 8,
                }}
              >
                Select Category
              </Text>
              {categoryGridItems.length > 0 ? (
                <CategoryGrid
                  categories={categoryGridItems}
                  selectedId={selectedCategoryId}
                  onSelect={setSelectedCategoryId}
                />
              ) : (
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 13,
                    color: colors.textSecondary.DEFAULT,
                    textAlign: 'center',
                    paddingVertical: 12,
                  }}
                >
                  All categories have budgets
                </Text>
              )}
            </View>
          )}

          {/* Editing category name */}
          {editingBudget && (
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 14,
                color: colors.textSecondary.DEFAULT,
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              {editingBudget.categoryName}
            </Text>
          )}

          {/* Amount input */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: colors.textSecondary.DEFAULT,
                marginBottom: 8,
              }}
            >
              Budget Limit
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.background.DEFAULT,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMMono_500Medium',
                  fontSize: 20,
                  color: colors.navy,
                  marginRight: 4,
                }}
              >
                ₹
              </Text>
              <TextInput
                value={amountText}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                keyboardType="decimal-pad"
                autoFocus={isSheetOpen}
                style={{
                  flex: 1,
                  fontFamily: 'DMMono_500Medium',
                  fontSize: 24,
                  color: colors.navy,
                  padding: 0,
                }}
              />
            </View>
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {editingBudget && (
              <Pressable
                onPress={handleDelete}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: `${colors.danger.DEFAULT}14`,
                }}
              >
                <Trash size={18} color={colors.danger.DEFAULT} weight="duotone" />
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 15,
                    color: colors.danger.DEFAULT,
                    marginLeft: 6,
                  }}
                >
                  Delete
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleSave}
              style={{
                flex: editingBudget ? 1.5 : 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: colors.navy,
              }}
            >
              <Text
                style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' }}
              >
                {editingBudget ? 'Update' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
