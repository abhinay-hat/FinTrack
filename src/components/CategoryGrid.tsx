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
import type { ComponentType } from 'react';

export interface CategoryGridItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CategoryGridProps {
  categories: CategoryGridItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

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

export default function CategoryGrid({ categories, selectedId, onSelect }: CategoryGridProps) {
  return (
    <View className="flex-row flex-wrap px-3">
      {categories.map((cat) => {
        const isSelected = cat.id === selectedId;
        const IconComponent = ICON_MAP[cat.icon];

        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            style={{ width: '25%', alignItems: 'center', paddingVertical: 8 }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: isSelected ? cat.color : `${cat.color}18`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {IconComponent ? (
                <IconComponent
                  size={24}
                  weight="duotone"
                  color={isSelected ? '#FFFFFF' : cat.color}
                />
              ) : (
                <Text style={{ fontSize: 18, color: isSelected ? '#FFFFFF' : cat.color }}>
                  {cat.name.slice(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                fontSize: 11,
                color: isSelected ? cat.color : colors.textSecondary.DEFAULT,
                textAlign: 'center',
                marginTop: 4,
                maxWidth: 72,
              }}
            >
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
