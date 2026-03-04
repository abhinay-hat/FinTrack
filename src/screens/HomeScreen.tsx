import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: '#1A1A2E' }}>
        Home
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginTop: 8 }}>
        Your financial overview
      </Text>
    </View>
  );
}
