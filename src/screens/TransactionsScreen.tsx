import { View, Text } from 'react-native';

export default function TransactionsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: '#1A1A2E' }}>
        Transactions
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginTop: 8 }}>
        Income & expenses
      </Text>
    </View>
  );
}
