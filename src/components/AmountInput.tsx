import { View, Text, TextInput, Pressable } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { colors } from '@/theme';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  transactionType: 'income' | 'expense' | 'transfer';
  autoFocus?: boolean;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

export default function AmountInput({
  value,
  onChange,
  transactionType,
  autoFocus = true,
}: AmountInputProps) {
  const inputRef = useRef<TextInput>(null);
  const amountColor = transactionType === 'income' ? colors.teal.DEFAULT : colors.danger.DEFAULT;

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [autoFocus]);

  return (
    <View className="items-center py-4">
      <View className="flex-row items-baseline">
        <Text
          style={{
            fontFamily: 'DMMono_500Medium',
            fontSize: 24,
            color: amountColor,
            marginRight: 4,
          }}
        >
          ₹
        </Text>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^0-9.]/g, '');
            // Allow only one decimal point
            const parts = cleaned.split('.');
            if (parts.length > 2) return;
            if (parts[1] && parts[1].length > 2) return;
            onChange(cleaned);
          }}
          placeholder="0"
          placeholderTextColor="#CBD5E1"
          keyboardType="decimal-pad"
          style={{
            fontFamily: 'DMMono_500Medium',
            fontSize: 36,
            color: amountColor,
            minWidth: 80,
            textAlign: 'center',
            padding: 0,
          }}
        />
      </View>

      {/* Quick amount chips */}
      <View className="flex-row mt-3 gap-2">
        {QUICK_AMOUNTS.map((amt) => (
          <Pressable
            key={amt}
            onPress={() => onChange(String(amt))}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: '#F0F4F8',
            }}
          >
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#475569' }}>
              ₹{amt >= 1000 ? `${amt / 1000}K` : amt}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
