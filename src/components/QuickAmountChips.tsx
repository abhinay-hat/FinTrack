import { View, Text, Pressable } from 'react-native';

interface QuickAmountChipsProps {
  onSelect: (amount: number) => void;
}

const CHIPS = [
  { label: '\u20B9100', value: 100 },
  { label: '\u20B9500', value: 500 },
  { label: '\u20B91K', value: 1000 },
  { label: '\u20B95K', value: 5000 },
];

export default function QuickAmountChips({ onSelect }: QuickAmountChipsProps) {
  return (
    <View className="flex-row mt-3 gap-2">
      {CHIPS.map((chip) => (
        <Pressable
          key={chip.value}
          onPress={() => onSelect(chip.value)}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: '#F0F4F8',
          }}
        >
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#475569' }}>
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
