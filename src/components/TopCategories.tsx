import { View, Text, ScrollView } from 'react-native';
import { colors } from '@/theme';
import { formatCurrency } from '@/utils';

export interface CategorySpending {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
}

interface TopCategoriesProps {
  categories: CategorySpending[];
}

export default function TopCategories({ categories }: TopCategoriesProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <View className="mt-4">
      <Text
        style={{
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 17,
          color: colors.textPrimary.DEFAULT,
          paddingHorizontal: 16,
          marginBottom: 10,
        }}
      >
        Top Categories
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {categories.map((cat) => (
          <View
            key={cat.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 16,
              alignItems: 'center',
              minWidth: 100,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: `${cat.color}20`,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
            </View>
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 12,
                color: colors.textSecondary.DEFAULT,
                marginBottom: 4,
              }}
              numberOfLines={1}
            >
              {cat.name}
            </Text>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 13,
                color: colors.textPrimary.DEFAULT,
              }}
            >
              {formatCurrency(cat.total, true)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
