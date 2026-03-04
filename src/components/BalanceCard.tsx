import { View, Text, Pressable } from 'react-native';
import { ArrowUp, ArrowDown } from 'phosphor-react-native';
import { colors } from '@/theme';
import { formatCurrency } from '@/utils';

interface BalanceCardProps {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  periodLabel: string;
  onPeriodPress?: () => void;
}

export default function BalanceCard({
  totalBalance,
  totalIncome,
  totalExpense,
  periodLabel,
  onPeriodPress,
}: BalanceCardProps) {
  return (
    <View
      className="mx-4 mt-3 p-5"
      style={{
        backgroundColor: colors.navy,
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {/* Gradient overlay simulation with layered views */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60%',
          height: '100%',
          backgroundColor: colors.blueAccent.DEFAULT,
          opacity: 0.25,
          borderTopLeftRadius: 80,
          borderBottomLeftRadius: 40,
        }}
      />

      <Pressable onPress={onPeriodPress}>
        <Text
          style={{
            fontFamily: 'Inter_500Medium',
            fontSize: 13,
            color: '#94A3B8',
          }}
        >
          {periodLabel}
        </Text>
      </Pressable>

      <Text
        style={{
          fontFamily: 'DMMono_500Medium',
          fontSize: 36,
          lineHeight: 44,
          color: '#FFFFFF',
          marginTop: 6,
        }}
      >
        {formatCurrency(totalBalance)}
      </Text>

      <View className="flex-row mt-4" style={{ gap: 16 }}>
        {/* Income */}
        <View className="flex-1 flex-row items-center" style={{ gap: 8 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: 'rgba(0,137,123,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowUp size={16} color={colors.teal.DEFAULT} weight="bold" />
          </View>
          <View>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 11,
                color: '#94A3B8',
              }}
            >
              Income
            </Text>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 14,
                color: colors.teal.DEFAULT,
              }}
            >
              {formatCurrency(totalIncome)}
            </Text>
          </View>
        </View>

        {/* Expense */}
        <View className="flex-1 flex-row items-center" style={{ gap: 8 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: 'rgba(211,47,47,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowDown size={16} color={colors.danger.DEFAULT} weight="bold" />
          </View>
          <View>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 11,
                color: '#94A3B8',
              }}
            >
              Expense
            </Text>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 14,
                color: colors.danger.DEFAULT,
              }}
            >
              {formatCurrency(totalExpense)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
