import './global.css';

import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '@/db/DatabaseContext';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { ActivityIndicator, View } from 'react-native';

import RootNavigator from '@/navigation/RootNavigator';
import { useDatabase } from '@/hooks/useDatabase';
import Toast from 'react-native-toast-message';

function AppContent() {
  const { database, isReady } = useDatabase();

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0A2463" />
      </View>
    );
  }

  return (
    <DatabaseProvider database={database}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
        <Toast />
      </SafeAreaProvider>
    </DatabaseProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0A2463" />
      </View>
    );
  }

  return <AppContent />;
}
