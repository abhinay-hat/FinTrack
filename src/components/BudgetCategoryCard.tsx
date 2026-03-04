import { View, Text, Pressable } from 'react-native';
import {
  ForkKnife,
  Car,
  ShoppingCart,
  Lightning,
  FilmStrip,
  Heartbeat,
  GraduationCap,
  CurrencyInr,
  TrendUp,
  House,
  Basket,
  DotsThree,
  type IconProps,
} from 'phosphor-react-native';
import { colors } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import type { BudgetWithProgress } from '@/services/budgetService';
import type { ComponentType } from 'react';

const ICON_MAP: Record<string, ComponentType<IconProps>> = {
  ForkKnife,
  Car,
  ShoppingCart,
  Lightning,
  FilmStrip,
  Heartbeat,
  GraduationCap,
  CurrencyInr,
  TrendUp,
  House,
  Basket,
  DotsThree,
};

function getBarColor(percentage: number): string {
  if (percentage >= 80) return colors.danger.DEFAULT;
  if (percentage >= 60) return colors.amber;
  return colors.teal.DEFAULT;
}

interface BudgetCategoryCardProps {
  budget: BudgetWithProgress;
  onPress: (budget: BudgetWithProgress) => void;
}

export default function BudgetCategoryCard({ budget, onPress }: BudgetCategoryCardProps) {
  const IconComponent = ICON_MAP[budget.categoryIcon];
  const barColor = getBarColor(budget.percentage);
  const isOver = budget.status === 'over';
  const barWidth = Math.min(budget.percentage, 100);

  return (
    <Pressable
      onPress={() => onPress(budget)}
      style={{
        backgroundColor: colors.surface.DEFAULT,
        borderRadius: 12,
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 10,
        borderWidth: isOver ? 1 : 0,
        borderColor: isOver ? colors.danger.DEFAULT : 'transparent',
        shadowColor: isOver ? colors.danger.DEFAULT : '#000',
        shadowOffset: { width: 0, height: isOver ? 0 : 2 },
        shadowOpacity: isOver ? 0.15 : 0.06,
        shadowRadius: isOver ? 8 : 4,
        elevation: isOver ? 4 : 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Category icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${budget.categoryColor}18`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {IconComponent ? (
            <IconComponent size={20} weight="duotone" color={budget.categoryColor} />
          ) : (
            <Text style={{ fontSize: 14, color: budget.categoryColor }}>
              {budget.categoryName.slice(0, 2).toUpperCase()}
            </Text>
          )}
        </View>

        {/* Name and progress */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 14,
                color: colors.textPrimary.DEFAULT,
                flex: 1,
              }}
            >
              {budget.categoryName}
            </Text>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 12,
                color: isOver ? colors.danger.DEFAULT : colors.textSecondary.DEFAULT,
                marginLeft: 8,
              }}
            >
              {formatCurrency(budget.spentAmount, true)} / {formatCurrency(budget.limitAmount, true)}
            </Text>
          </View>

          {/* Progress bar */}
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: '#E2E8F0',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${barWidth}%`,
                borderRadius: 3,
                backgroundColor: barColor,
              }}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
