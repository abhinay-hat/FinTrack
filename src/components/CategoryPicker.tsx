import { View, Text, Pressable, ScrollView } from 'react-native';
import { colors } from '@/theme';

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CategoryPickerProps {
  categories: CategoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
  return (
    <View className="flex-row flex-wrap px-2">
      {categories.map((cat) => {
        const isSelected = cat.id === selectedId;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            className="items-center p-2 m-1"
            style={{
              width: '30%',
              borderRadius: 12,
              backgroundColor: isSelected ? `${cat.color}15` : 'transparent',
              borderWidth: isSelected ? 2 : 0,
              borderColor: isSelected ? cat.color : 'transparent',
            }}
          >
            <View
              style={{
                backgroundColor: cat.color,
                width: 44,
                height: 44,
                borderRadius: 14,
              }}
              className="items-center justify-center mb-1"
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                {cat.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                fontSize: 11,
                color: isSelected ? cat.color : colors.textSecondary.DEFAULT,
                textAlign: 'center',
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
