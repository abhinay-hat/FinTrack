import { View, Text, Pressable } from 'react-native';
import { memo } from 'react';
import { formatCurrency, formatTime } from '@/utils';
import { colors } from '@/theme';

export interface TransactionListItemProps {
  id: string;
  description: string;
  amount: number;
  transactionType: 'income' | 'expense' | 'transfer';
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  date: Date;
  onPress: (id: string) => void;
  onLongPress?: (id: string) => void;
}

export const TRANSACTION_ROW_HEIGHT = 72;

function TransactionListItem({
  id,
  description,
  amount,
  transactionType,
  categoryName,
  categoryColor,
  date,
  onPress,
  onLongPress,
}: TransactionListItemProps) {
  const isIncome = transactionType === 'income';
  const amountColor = isIncome ? colors.teal.DEFAULT : colors.danger.DEFAULT;
  const prefix = isIncome ? '+' : '-';

  return (
    <Pressable
      onPress={() => onPress(id)}
      onLongPress={() => onLongPress?.(id)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View
        style={{ height: TRANSACTION_ROW_HEIGHT }}
        className="flex-row items-center px-4 py-3 bg-white"
      >
        {/* Category color dot */}
        <View
          style={{ backgroundColor: categoryColor, width: 40, height: 40, borderRadius: 12 }}
          className="items-center justify-center mr-3"
        >
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
            {categoryName.slice(0, 2).toUpperCase()}
          </Text>
        </View>

        {/* Description & category */}
        <View className="flex-1 mr-3">
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.textPrimary.DEFAULT }}
          >
            {description}
          </Text>
          <Text
            style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary.DEFAULT, marginTop: 2 }}
          >
            {categoryName} · {formatTime(date)}
          </Text>
        </View>

        {/* Amount */}
        <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 16, color: amountColor }}>
          {prefix}{formatCurrency(Math.abs(amount))}
        </Text>
      </View>
    </Pressable>
  );
}

export default memo(TransactionListItem);
