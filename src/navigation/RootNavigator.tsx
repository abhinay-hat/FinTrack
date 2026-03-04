import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import AddTransactionScreen, { TransactionSheetProvider } from '@/screens/AddTransactionScreen';
import AccountsScreen from '@/screens/AccountsScreen';
import AddAccountScreen from '@/screens/AddAccountScreen';
import StatementImportScreen from '@/screens/StatementImportScreen';
import ImportPreviewScreen from '@/screens/ImportPreviewScreen';
import PDFImportScreen from '@/screens/PDFImportScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  AddTransaction: { transactionId?: string } | undefined;
  Accounts: undefined;
  AddAccount: { accountId?: string } | undefined;
  StatementImport: undefined;
  ImportPreview: { transactions: string };
  PDFImport: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <TransactionSheetProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        <Stack.Screen
          name="AddTransaction"
          component={AddTransactionScreen}
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen name="Accounts" component={AccountsScreen} />
        <Stack.Screen name="AddAccount" component={AddAccountScreen} />
        <Stack.Screen name="StatementImport" component={StatementImportScreen} />
        <Stack.Screen name="ImportPreview" component={ImportPreviewScreen} />
        <Stack.Screen name="PDFImport" component={PDFImportScreen} />
      </Stack.Navigator>
    </TransactionSheetProvider>
  );
}
