import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { colors } from '@/theme/colors';
import { useWatermelonDB } from '@/db/DatabaseContext';
import { saveCashTransaction } from '@/services/cashService';

// --- Quick Amount Pills ---
const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500] as const;

// --- Cash Categories ---
interface CashCategory {
  name: string;
  icon: string; // Phosphor icon name
  label: string;
}

const CASH_CATEGORIES: CashCategory[] = [
  { name: 'Transport', icon: 'Car', label: 'Auto/Rickshaw' },
  { name: 'Food & Dining', icon: 'Coffee', label: 'Tea/Coffee' },
  { name: 'Food & Dining', icon: 'CookingPot', label: 'Street Food' },
  { name: 'Groceries', icon: 'Basket', label: 'Groceries' },
  { name: 'Transport', icon: 'Bus', label: 'Transport' },
  { name: 'Others', icon: 'DotsThree', label: 'Others' },
];

// --- Currency Formatter ---
const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

// --- Props ---
interface CashQuickAddProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (amount: number, category: string) => void;
}

export function CashQuickAdd({ visible, onClose, onSuccess }: CashQuickAddProps) {
  const database = useWatermelonDB();
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleDigit = useCallback((digit: number) => {
    setAmount((prev) => {
      const next = prev * 10 + digit;
      // Cap at 10 lakhs (1,000,000)
      return next > 1_000_000 ? prev : next;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setAmount((prev) => Math.floor(prev / 10));
  }, []);

  const handleClear = useCallback(() => {
    setAmount(0);
  }, []);

  const handleQuickAmount = useCallback((quickAmount: number) => {
    setAmount(quickAmount);
  }, []);

  const handleCategorySave = useCallback(
    async (category: CashCategory) => {
      if (amount <= 0) {
        Alert.alert('Enter Amount', 'Please enter an amount first.');
        return;
      }

      setSaving(true);
      try {
        await saveCashTransaction(database, {
          amount,
          categoryName: category.name,
          description: category.label,
        });
        onSuccess?.(amount, category.label);
        setAmount(0);
        onClose();
      } catch {
        Alert.alert('Error', 'Failed to save transaction. Please try again.');
      } finally {
        setSaving(false);
      }
    },
    [amount, database, onClose, onSuccess],
  );

  const handleClose = useCallback(() => {
    setAmount(0);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quick Cash Entry</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Amount Display */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountText}>
            {amount > 0 ? formatCurrency(amount) : '\u20B90'}
          </Text>
        </View>

        {/* Quick Amount Pills */}
        <View style={styles.pillsRow}>
          {QUICK_AMOUNTS.map((qa) => (
            <TouchableOpacity
              key={qa}
              style={[styles.pill, amount === qa && styles.pillActive]}
              onPress={() => handleQuickAmount(qa)}
            >
              <Text style={[styles.pillText, amount === qa && styles.pillTextActive]}>
                {'\u20B9'}{qa}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Numpad */}
        <View style={styles.numpad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <TouchableOpacity
              key={digit}
              style={styles.numKey}
              onPress={() => handleDigit(digit)}
            >
              <Text style={styles.numKeyText}>{digit}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.numKey} onPress={handleClear}>
            <Text style={styles.numKeyTextAction}>C</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numKey} onPress={() => handleDigit(0)}>
            <Text style={styles.numKeyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numKey} onPress={handleBackspace}>
            <Text style={styles.numKeyTextAction}>{'\u232B'}</Text>
          </TouchableOpacity>
        </View>

        {/* Category Selection - tap to save */}
        <Text style={styles.categoryLabel}>Tap category to save</Text>
        <View style={styles.categoryGrid}>
          {CASH_CATEGORIES.map((cat, index) => (
            <TouchableOpacity
              key={`${cat.name}-${index}`}
              style={[styles.categoryCard, saving && styles.categoryCardDisabled]}
              onPress={() => handleCategorySave(cat)}
              disabled={saving}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={styles.categoryCardLabel} numberOfLines={1}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    color: colors.navy,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.teal.DEFAULT,
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  amountText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 48,
    color: colors.navy,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  pillActive: {
    backgroundColor: colors.teal.DEFAULT,
    borderColor: colors.teal.DEFAULT,
  },
  pillText: {
    fontFamily: 'DMMono-Regular',
    fontSize: 14,
    color: colors.textPrimary.DEFAULT,
  },
  pillTextActive: {
    color: colors.white,
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  numKey: {
    width: '30%',
    aspectRatio: 2.2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 12,
  },
  numKeyText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 24,
    color: colors.textPrimary.DEFAULT,
  },
  numKeyTextAction: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: colors.amber,
  },
  categoryLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.textSecondary.DEFAULT,
    textAlign: 'center',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  categoryCard: {
    width: '30%',
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  categoryCardDisabled: {
    opacity: 0.5,
  },
  categoryIcon: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.teal.DEFAULT,
    marginBottom: 4,
  },
  categoryCardLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textPrimary.DEFAULT,
  },
});
