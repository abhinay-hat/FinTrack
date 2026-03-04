import { View, Text, Pressable } from 'react-native';
import { colors } from '@/theme';
import type { TransactionType } from '@/models/Transaction';

interface TypeToggleProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}

export default function TypeToggle({ value, onChange }: TypeToggleProps) {
  return (
    <View
      className="flex-row rounded-xl overflow-hidden"
      style={{ backgroundColor: '#F0F4F8', height: 44 }}
    >
      <Pressable
        onPress={() => onChange('expense')}
        className="flex-1 items-center justify-center"
        style={{
          backgroundColor: value === 'expense' ? colors.danger.DEFAULT : 'transparent',
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 14,
            color: value === 'expense' ? '#FFFFFF' : colors.textSecondary.DEFAULT,
          }}
        >
          Expense
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('income')}
        className="flex-1 items-center justify-center"
        style={{
          backgroundColor: value === 'income' ? colors.teal.DEFAULT : 'transparent',
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 14,
            color: value === 'income' ? '#FFFFFF' : colors.textSecondary.DEFAULT,
          }}
        >
          Income
        </Text>
      </Pressable>
    </View>
  );
}
