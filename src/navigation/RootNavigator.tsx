import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useOnboardingStore } from '@/stores';
import { useSecurityStore } from '@/stores/useSecurityStore';
import BottomTabNavigator from './BottomTabNavigator';
import AddTransactionScreen, { TransactionSheetProvider } from '@/screens/AddTransactionScreen';
import AccountsScreen from '@/screens/AccountsScreen';
import AddAccountScreen from '@/screens/AddAccountScreen';
import StatementImportScreen from '@/screens/StatementImportScreen';
import ImportPreviewScreen from '@/screens/ImportPreviewScreen';
import PDFImportScreen from '@/screens/PDFImportScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import LockScreen from '@/screens/LockScreen';
import PINSetupScreen from '@/screens/PINSetupScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  AddTransaction: { transactionId?: string } | undefined;
  Accounts: undefined;
  AddAccount: { accountId?: string } | undefined;
  StatementImport: undefined;
  ImportPreview: { transactions: string };
  PDFImport: undefined;
  LockScreen: undefined;
  PINSetup: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const isLocked = useSecurityStore((s) => s.isLocked);
  const isAppLockEnabled = useSecurityStore((s) => s.isAppLockEnabled);

  if (isLocked && isAppLockEnabled) {
    return <LockScreen />;
  }

  return (
    <TransactionSheetProvider>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={hasCompletedOnboarding ? 'MainTabs' : 'Onboarding'}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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
        <Stack.Screen name="PINSetup" component={PINSetupScreen} />
      </Stack.Navigator>
    </TransactionSheetProvider>
  );
}
