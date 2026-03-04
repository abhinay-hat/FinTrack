import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import AddTransactionScreen from '@/screens/AddTransactionScreen';
import AccountsScreen from '@/screens/AccountsScreen';
import AddAccountScreen from '@/screens/AddAccountScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  AddTransaction: { transactionId?: string } | undefined;
  Accounts: undefined;
  AddAccount: { accountId?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="Accounts" component={AccountsScreen} />
      <Stack.Screen name="AddAccount" component={AddAccountScreen} />
    </Stack.Navigator>
  );
}
